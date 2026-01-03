import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import {
  CreateOrderDto,
  ShippingMethod,
  PaymentMethod,
} from './dto/create-order.dto.js';
import { CartService } from '../cart/cart.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { Prisma, $Enums } from '../generated/prisma/client.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate cart stock before creating order
   */
  async validateCartStock(userId: string) {
    const cart = await this.cartService.getOrCreateCart(userId);
    const errors: string[] = [];

    for (const item of cart.items) {
      if (!item.is_hareruya && item.single_id) {
        // Check local product stock
        const single = await this.prisma.singles.findUnique({
          where: { id: item.single_id },
        });

        if (!single) {
          errors.push(`Product ${item.single_id} not found`);
          continue;
        }

        if (single.stock < item.quantity) {
          errors.push(
            `Insufficient stock for ${single.cardName || single.name}. Available: ${single.stock}, Requested: ${item.quantity}`,
          );
        }
      }
      // For Hareruya products, we assume they're available (stock managed externally)
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Stock validation failed',
        errors,
      });
    }
  }

  /**
   * Get or create shipping method
   */
  async getOrCreateShippingMethod(name: string) {
    let method = await this.prisma.shipping_methods.findUnique({
      where: { name },
    });

    if (!method) {
      method = await this.prisma.shipping_methods.create({
        data: { name },
      });
    }

    return method;
  }

  /**
   * Create order from cart
   */
  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    // Validate stock
    await this.validateCartStock(userId);

    // Get cart
    const cart = await this.cartService.getOrCreateCart(userId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Validate shipping method requirements
    if (
      createOrderDto.shippingMethod === ShippingMethod.SHIPPING &&
      !createOrderDto.addressId
    ) {
      throw new BadRequestException(
        'Address ID is required for shipping method',
      );
    }

    // Get or create shipping method
    const shippingMethod = await this.getOrCreateShippingMethod(
      createOrderDto.shippingMethod.toUpperCase(),
    );

    // Validate address if shipping
    const addressId = createOrderDto.addressId;
    if (createOrderDto.shippingMethod === ShippingMethod.SHIPPING) {
      if (!addressId) {
        throw new BadRequestException('Address ID is required');
      }

      const address = await this.prisma.user_addresses.findFirst({
        where: {
          id: addressId,
          user_id: userId,
        },
      });

      if (!address) {
        throw new NotFoundException('Address not found');
      }
    }

    // Create order in transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.orders.create({
        data: {
          user_id: userId,
          status: 'PENDING',
        },
      });

      // Create order items (local singles)
      const localItems = cart.items.filter(
        (item) => !item.is_hareruya && item.single_id,
      );
      if (localItems.length > 0) {
        for (const cartItem of localItems) {
          const single = await tx.singles.findUnique({
            where: { id: cartItem.single_id! },
          });

          if (!single) {
            throw new NotFoundException(
              `Product ${cartItem.single_id} not found`,
            );
          }

          // Decrease stock
          await tx.singles.update({
            where: { id: single.id },
            data: {
              stock: {
                decrement: cartItem.quantity,
              },
            },
          });

          // Create order item
          await tx.order_items.create({
            data: {
              order_id: newOrder.id,
              single_id: single.id,
              quantity: cartItem.quantity,
              unit_price: single.price,
            },
          });
        }
      }

      // Create order items for Hareruya products
      const hareruyaItems = cart.items.filter((item) => item.is_hareruya);
      if (hareruyaItems.length > 0) {
        for (const cartItem of hareruyaItems) {
          const productData = cartItem.product_data as
            | {
                price?: string | number;
                finalPrice?: number;
                [key: string]: unknown;
              }
            | null
            | undefined;
          const priceValue =
            typeof productData?.price === 'number'
              ? productData.price
              : typeof productData?.price === 'string'
                ? parseFloat(productData.price) || 0
                : productData?.finalPrice || 0;
          const price = priceValue;

          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          await tx.order_items_hareruya.create({
            data: {
              order_id: newOrder.id,
              hareruya_id: cartItem.hareruya_id || '',
              quantity: cartItem.quantity,
              unit_price: new Prisma.Decimal(price),
              product_data:
                (productData as Prisma.InputJsonValue) ||
                ({} as Prisma.InputJsonValue),
            },
          });
        }
      }

      // Create shipping info
      if (
        createOrderDto.shippingMethod === ShippingMethod.SHIPPING &&
        addressId
      ) {
        await tx.order_shipping.create({
          data: {
            order_id: newOrder.id,
            shipping_method_id: shippingMethod.id,
            address_id: addressId,
          },
        });
      } else if (createOrderDto.shippingMethod === ShippingMethod.ARRANGE) {
        // For arrange method, we still create shipping record but without address
        // We'll need to handle this - for now, create a dummy address or make address optional
        // Actually, let's make address optional in the schema or create a placeholder
        // For now, we'll skip shipping record for arrange method
      }

      // Clear cart after successful order creation
      await tx.cart_items.deleteMany({
        where: { cart_id: cart.id },
      });

      return newOrder;
    });

    this.logger.log(`Order ${order.id} created for user ${userId}`);

    // Create payment record
    let paymentResult: {
      paymentId: string;
      preferenceId?: string;
      initPoint?: string;
      paymentMethod?: string;
    } | null = null;
    if (createOrderDto.paymentMethod === PaymentMethod.MERCADOPAGO) {
      // Get order items for Mercado Pago preference
      const orderWithItems = await this.prisma.orders.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              singles: true,
            },
          },
          hareruya_items: true,
        },
      });

      if (!orderWithItems) {
        throw new NotFoundException(`Order ${order.id} not found`);
      }

      const mpItems: Array<{
        title: string;
        quantity: number;
        unit_price: number;
      }> = [];

      // Add local items

      for (const item of orderWithItems.items) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const single = item.singles;

        const title =
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (single?.cardName as string | null | undefined) ||
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (single?.name as string | null | undefined) ||
          'Producto';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const quantity = item.quantity as number;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
        const unitPrice = parseFloat(item.unit_price.toString());
        mpItems.push({
          title,
          quantity,
          unit_price: unitPrice,
        });
      }

      // Add Hareruya items

      for (const item of orderWithItems.hareruya_items) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const productData = item.product_data as
          | {
              cardName?: string;
              name?: string;
              [key: string]: unknown;
            }
          | null
          | undefined;
        const title = productData?.cardName || productData?.name || 'Producto';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const quantity = item.quantity as number;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
        const unitPrice = parseFloat(item.unit_price.toString());
        mpItems.push({
          title,
          quantity,
          unit_price: unitPrice,
        });
      }

      // Add shipping cost if applicable
      const shippingCost =
        createOrderDto.shippingMethod === ShippingMethod.SHIPPING ? 280.0 : 0;
      if (shippingCost > 0) {
        mpItems.push({
          title: 'Envío Express',
          quantity: 1,
          unit_price: shippingCost,
        });
      }

      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:3000',
      );
      const baseUrl = frontendUrl.split(',')[0].trim();

      const preference = await this.paymentsService.createMercadoPagoPreference(
        order.id,
        mpItems,
        {
          success: `${baseUrl}/orders/${order.id}?status=success`,
          failure: `${baseUrl}/orders/${order.id}?status=failure`,
          pending: `${baseUrl}/orders/${order.id}?status=pending`,
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payment = await this.paymentsService.createPayment(
        order.id,
        'mercadopago',
        preference.preference_id,
        { preference },
      );

      paymentResult = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        paymentId: payment.id,
        preferenceId: preference.preference_id,
        initPoint: preference.init_point,
      };
    } else {
      // For transfer, just create payment record
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payment = await this.paymentsService.createPayment(
        order.id,
        'transfer',
      );
      paymentResult = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        paymentId: payment.id,
        paymentMethod: 'transfer',
      };
    }

    return {
      order,
      payment: paymentResult,
    };
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string, userId: string) {
    const order = await this.prisma.orders.findFirst({
      where: {
        id: orderId,
        user_id: userId,
      },
      include: {
        items: {
          include: {
            singles: {
              include: {
                categories: true,
                conditions: true,
                languages: true,
                tcgs: true,
              },
            },
          },
        },
        hareruya_items: true,
        shipping: {
          include: {
            shipping_methods: true,
            user_addresses: true,
          },
        },
        payments: {
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Get all orders for user
   */
  async getUserOrders(userId: string) {
    return this.prisma.orders.findMany({
      where: {
        user_id: userId,
      },
      include: {
        items: {
          include: {
            singles: {
              include: {
                categories: true,
                conditions: true,
                languages: true,
              },
            },
          },
        },
        hareruya_items: true,
        shipping: {
          include: {
            shipping_methods: true,
            user_addresses: true,
          },
        },
        payments: {
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string, userId?: string) {
    const where: Prisma.ordersWhereUniqueInput = userId
      ? { id: orderId, user_id: userId }
      : { id: orderId };

    const order = await this.prisma.orders.findUnique({
      where,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.orders.update({
      where: { id: orderId },

      data: { status: status as $Enums.order_status_enum },
    });
  }
}
