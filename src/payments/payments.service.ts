import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import type { paymentsModel } from '../generated/prisma/models/payments.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create Mercado Pago preference
   */
  async createMercadoPagoPreference(
    orderId: string,
    items: Array<{
      title: string;
      quantity: number;
      unit_price: number;
    }>,
    backUrls: {
      success: string;
      failure: string;
      pending: string;
    },
  ) {
    this.logger.log(`Creating Mercado Pago preference for order ${orderId}`);

    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );
    if (!accessToken) {
      throw new BadRequestException('Mercado Pago access token not configured');
    }

    try {
      // Initialize Mercado Pago client
      const client = new MercadoPagoConfig({
        accessToken,
        options: {
          timeout: 5000,
          idempotencyKey: orderId, // Use order ID as idempotency key
        },
      });

      const preference = new Preference(client);

      // Transform items to Mercado Pago format
      const mpItems = items.map((item, index) => ({
        id: `item-${orderId}-${index}`,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: 'MXN',
      }));

      // Create preference
      const response = await preference.create({
        body: {
          items: mpItems,
          back_urls: {
            success: backUrls.success,
            failure: backUrls.failure,
            pending: backUrls.pending,
          },
          auto_return: 'approved', // Automatically redirect on approved payment
          external_reference: orderId, // Reference to link payment with order
          notification_url: this.configService.get<string>(
            'MERCADOPAGO_WEBHOOK_URL',
            `${this.configService.get<string>('API_URL', 'http://localhost:3002')}/api/payments/webhook/mercadopago`,
          ),
          statement_descriptor: 'HYDRA COLLECTABLES',
        },
      });

      this.logger.log(
        `Mercado Pago preference created: ${response.id} for order ${orderId}`,
      );

      return {
        preference_id: response.id,
        init_point: response.init_point || response.sandbox_init_point,
      };
    } catch (error: any) {
      this.logger.error(
        `Error creating Mercado Pago preference for order ${orderId}:`,
        error,
      );
      throw new BadRequestException(
        `Failed to create Mercado Pago preference: ${(error as { message?: string }).message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Create payment record
   */
  async createPayment(
    orderId: string,
    paymentMethod: string,
    mercadopagoPreferenceId?: string,
    paymentData?: any,
  ): Promise<paymentsModel> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await this.prisma.payments.create({
      data: {
        order_id: orderId,
        payment_method: paymentMethod,
        mercadopago_preference_id: mercadopagoPreferenceId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payment_data: paymentData,
        status: 'pending',
      },
    });
  }

  /**
   * Update payment with Mercado Pago response
   */
  async updatePayment(
    paymentId: string,
    mercadopagoPaymentId: string,
    paymentData: any,
    status: string,
  ): Promise<paymentsModel> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await this.prisma.payments.update({
      where: { id: paymentId },
      data: {
        mercadopago_payment_id: mercadopagoPaymentId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payment_data: paymentData,
        status,
      },
    });
  }

  /**
   * Process Mercado Pago webhook
   * Mercado Pago sends different types of notifications:
   * - payment: when a payment is created/updated
   * - merchant_order: when an order is created/updated
   */
  async processWebhook(data: any) {
    this.logger.log('Processing Mercado Pago webhook', JSON.stringify(data));

    // Handle different webhook types
    const type: string | undefined = ((data as { type?: unknown })?.type ||
      (data as { action?: unknown })?.action) as string | undefined;

    if (type === 'payment' || (data as { data?: { id?: unknown } })?.data?.id) {
      // Payment notification
      return this.processPaymentWebhook(data);
    } else if (
      type === 'merchant_order' ||
      (data as { merchant_order_id?: unknown })?.merchant_order_id
    ) {
      // Merchant order notification - we can process this if needed
      this.logger.log(
        'Received merchant_order notification, processing payment from order',
      );
      // Mercado Pago merchant orders contain payment information
      // We'll process the payment from the order
      return this.processMerchantOrderWebhook(data);
    } else {
      // Try to extract payment ID from various possible structures
      const paymentId: string | number | undefined =
        ((data as { data?: { id?: unknown } })?.data?.id as
          | string
          | number
          | undefined) ||
        ((data as { id?: unknown })?.id as string | number | undefined) ||
        ((data as { payment_id?: unknown })?.payment_id as
          | string
          | number
          | undefined);
      if (paymentId) {
        return this.processPaymentWebhook({ data: { id: paymentId }, ...data });
      }

      throw new BadRequestException(
        'Unknown webhook type or missing payment ID',
      );
    }
  }

  /**
   * Process payment webhook
   */
  private async processPaymentWebhook(data: any) {
    // Extract payment information from webhook
    const paymentId: string | number | undefined =
      ((data as { data?: { id?: unknown } })?.data?.id as
        | string
        | number
        | undefined) ||
      ((data as { id?: unknown })?.id as string | number | undefined);
    const preferenceId: string | undefined =
      ((data as { data?: { preference_id?: unknown } })?.data?.preference_id as
        | string
        | undefined) ||
      ((data as { preference_id?: unknown })?.preference_id as
        | string
        | undefined);

    if (!paymentId && !preferenceId) {
      throw new BadRequestException(
        'Payment ID or Preference ID not found in webhook data',
      );
    }

    // Find payment by preference_id or payment_id
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const payment = await this.prisma.payments.findFirst({
      where: {
        OR: [
          { mercadopago_payment_id: paymentId?.toString() },
          { mercadopago_preference_id: preferenceId?.toString() },
        ],
      },
      include: {
        orders: true,
      },
    });

    if (!payment) {
      this.logger.warn(
        `Payment not found for webhook data. Payment ID: ${paymentId}, Preference ID: ${preferenceId}`,
      );
      // Don't throw error - webhook might be for a payment we haven't created yet
      // or it might be a test notification
      return { success: true, message: 'Payment not found in database' };
    }

    // Get full payment data from Mercado Pago if we only have preference_id
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let paymentData = data;
    if (
      paymentId &&
      !(payment as { mercadopago_payment_id?: string | null })
        .mercadopago_payment_id
    ) {
      // We have a payment ID but haven't stored it yet - this is the first notification
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      paymentData = data;
    }

    // Update payment status based on webhook data
    const status: string =
      ((data as { status?: unknown })?.status as string | undefined) ||
      ((data as { data?: { status?: unknown } })?.data?.status as
        | string
        | undefined) ||
      ((paymentData as { status?: unknown })?.status as string | undefined) ||
      'pending';
    const paymentStatus = this.mapMercadoPagoStatus(status);

    await this.updatePayment(
      (payment as { id: string }).id,
      paymentId?.toString() ||
        (payment as { mercadopago_payment_id?: string | null })
          .mercadopago_payment_id ||
        '',
      paymentData,
      paymentStatus,
    );

    // Update order status if payment is approved
    if (
      paymentStatus === 'approved' &&
      (payment as { orders?: { status?: string } }).orders?.status === 'PENDING'
    ) {
      await this.prisma.orders.update({
        where: { id: (payment as { order_id: string }).order_id },
        data: { status: 'PAID' },
      });
      this.logger.log(
        `Order ${(payment as { order_id: string }).order_id} marked as PAID`,
      );
    }

    return { success: true };
  }

  /**
   * Process merchant order webhook
   */
  private async processMerchantOrderWebhook(data: any) {
    const merchantOrderId: string | number | undefined =
      ((data as { merchant_order_id?: unknown })?.merchant_order_id as
        | string
        | number
        | undefined) ||
      ((data as { data?: { id?: unknown } })?.data?.id as
        | string
        | number
        | undefined);
    if (!merchantOrderId) {
      throw new BadRequestException('Merchant order ID not found');
    }

    // Merchant orders contain payment information
    // Extract the first approved payment if available
    const payments: any[] =
      ((data as { payments?: unknown })?.payments as any[]) ||
      ((data as { data?: { payments?: unknown } })?.data?.payments as any[]) ||
      [];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const approvedPayment: any = payments.find(
      (p: any) => (p as { status?: unknown }).status === 'approved',
    );

    if (approvedPayment) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return this.processPaymentWebhook({ data: approvedPayment });
    }

    this.logger.log(
      `Merchant order ${merchantOrderId} received but no approved payment found`,
    );
    return { success: true, message: 'No approved payment in merchant order' };
  }

  /**
   * Map Mercado Pago status to our payment status
   */
  private mapMercadoPagoStatus(mpStatus: string): string {
    const statusMap: Record<string, string> = {
      approved: 'approved',
      pending: 'pending',
      rejected: 'rejected',
      cancelled: 'cancelled',
      refunded: 'refunded',
      charged_back: 'charged_back',
    };

    return statusMap[mpStatus.toLowerCase()] || 'pending';
  }

  /**
   * Verify payment with Mercado Pago
   */
  async verifyPayment(paymentId: string) {
    this.logger.log(`Verifying payment ${paymentId}`);

    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );
    if (!accessToken) {
      throw new BadRequestException('Mercado Pago access token not configured');
    }

    try {
      const client = new MercadoPagoConfig({ accessToken });
      const payment = new Payment(client);

      const paymentData = await payment.get({ id: paymentId });

      return {
        verified: true,
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        payment: paymentData,
      };
    } catch (error: any) {
      this.logger.error(`Error verifying payment ${paymentId}:`, error);
      throw new BadRequestException(
        `Failed to verify payment: ${(error as { message?: string }).message || 'Unknown error'}`,
      );
    }
  }
}
