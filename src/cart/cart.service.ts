import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { SearchService } from '../search/search.service.js';
import { HareruyaService } from '../hareruya/hareruya.service.js';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly hareruyaService: HareruyaService,
  ) {}

  /**
   * Get or create cart for user
   * Uses upsert to handle race conditions atomically
   */
  async getOrCreateCart(userId: string) {
    const cart = await this.prisma.carts.upsert({
      where: { user_id: userId },
      update: {}, // No update needed if cart exists
      create: {
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
      },
    });

    // Sort items by id after fetching (since orderBy can't be used inside include)
    if (cart.items) {
      cart.items.sort((a, b) => a.id.localeCompare(b.id));
    }

    return cart;
  }

  /**
   * Get cart for user with full product details
   * Searches for product details like in search and returns standard format
   */
  async getCart(userId: string) {
    try {
      const cart = await this.getOrCreateCart(userId);
      this.logger.log(`Getting cart for user ${userId}, items count: ${cart.items.length}`);
      const transformedItems = await this.transformCartItemsWithDetails(
        cart.items,
      );
      this.logger.log(`Successfully transformed ${transformedItems.length} cart items`);
      return transformedItems;
    } catch (error) {
      this.logger.error(`Error getting cart for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addItem(userId: string, addItemDto: AddCartItemDto) {
    const { singleId, quantity, isHareruya, hareruyaId, productData } =
      addItemDto;

    // Validate that we have the required IDs
    if (!isHareruya && !singleId) {
      throw new BadRequestException(
        'singleId is required for local products',
      );
    }

    if (isHareruya) {
      if (!hareruyaId) {
        throw new BadRequestException(
          'hareruyaId is required for Hareruya products',
        );
      }
      if (!productData) {
        throw new BadRequestException(
          'productData is required for Hareruya products',
        );
      }
      // Validate that productData contains required fields
      // name can be in 'name', 'cardName', or 'title'
      const hasName =
        productData.name ||
        productData.cardName ||
        productData.title;
      const hasHareruyaId = productData.hareruyaId || hareruyaId;
      const hasLanguage = productData.language;
      // foil can be boolean, so check explicitly
      const hasFoil =
        productData.foil !== undefined && productData.foil !== null;

      if (!hasName) {
        throw new BadRequestException(
          'productData must contain name (or cardName or title)',
        );
      }
      if (!hasHareruyaId) {
        throw new BadRequestException(
          'productData must contain hareruyaId',
        );
      }
      if (!hasLanguage) {
        throw new BadRequestException('productData must contain language');
      }
      if (!hasFoil) {
        throw new BadRequestException('productData must contain foil');
      }
    }

    // Get or create cart
    const cart = await this.getOrCreateCart(userId);

    // Check if item already exists in cart
    // For local products, check by single_id
    // For Hareruya products, check by hareruya_id
    let existingItem;
    if (!isHareruya && singleId) {
      existingItem = await this.prisma.cart_items.findFirst({
        where: {
          cart_id: cart.id,
          single_id: singleId,
          is_hareruya: false,
        },
      });
    } else if (isHareruya && hareruyaId) {
      existingItem = await this.prisma.cart_items.findFirst({
        where: {
          cart_id: cart.id,
          hareruya_id: hareruyaId,
          is_hareruya: true,
        },
      });
    }

    if (existingItem) {
      // Update quantity
      // For local products, don't update product_data (we get it from singles table)
      // For Hareruya products, update product_data with minimal required fields
      const updateData: any = {
        quantity: existingItem.quantity + quantity,
      };

      if (isHareruya && productData) {
        // For Hareruya products, store only minimal required data
        updateData.product_data = this.extractMinimalHareruyaData(productData);
      } else {
        // For local products, set product_data to null (we get data from singles table)
        updateData.product_data = null;
      }

      const updatedItem = await this.prisma.cart_items.update({
        where: { id: existingItem.id },
        data: updateData,
        include: {
          singles: {
            include: {
              categories: true,
              conditions: true,
              languages: true,
            },
          },
        },
      });

      return await this.transformCartItemWithDetails(updatedItem);
    }

    // Create new cart item
    // For local products: only store single_id, no product_data
    // For Hareruya products: store minimal required data in product_data
    const itemData: any = {
      cart_id: cart.id,
      single_id: isHareruya ? null : singleId,
      quantity,
      is_hareruya: isHareruya,
      hareruya_id: isHareruya ? hareruyaId : null,
    };

    if (isHareruya && productData) {
      // Store only minimal required data for Hareruya products
      itemData.product_data = this.extractMinimalHareruyaData(productData);
    } else {
      // For local products, product_data is null (we get data from singles table)
      itemData.product_data = null;
    }

    const newItem = await this.prisma.cart_items.create({
      data: itemData,
      include: {
        singles: {
          include: {
            categories: true,
            conditions: true,
            languages: true,
          },
        },
      },
    });

    return await this.transformCartItemWithDetails(newItem);
  }

  /**
   * Update cart item quantity
   */
  async updateItem(userId: string, itemId: string, updateDto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cart_items.findFirst({
      where: {
        id: itemId,
        cart_id: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const updatedItem = await this.prisma.cart_items.update({
      where: { id: itemId },
      data: {
        quantity: updateDto.quantity,
      },
      include: {
        singles: {
          include: {
            categories: true,
            conditions: true,
            languages: true,
          },
        },
      },
    });

    return await this.transformCartItemWithDetails(updatedItem);
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cart_items.findFirst({
      where: {
        id: itemId,
        cart_id: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cart_items.delete({
      where: { id: itemId },
    });

    return { success: true, message: 'Item removed from cart' };
  }

  /**
   * Clear cart
   */
  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    await this.prisma.cart_items.deleteMany({
      where: { cart_id: cart.id },
    });

    return { success: true, message: 'Cart cleared' };
  }

  /**
   * Transform cart items to include full product data with details from search
   * This method searches for product details like in search and returns standard format
   */
  private async transformCartItemsWithDetails(items: any[]) {
    const transformedItems = await Promise.all(
      items.map(async (item, index) => {
        try {
          return await this.transformCartItemWithDetails(item);
        } catch (error) {
          this.logger.error(`Error transforming cart item ${index} (id: ${item.id}):`, error);
          // Return a minimal item to prevent complete failure
          return {
            id: item.id,
            quantity: item.quantity,
            isHareruya: item.is_hareruya,
            hareruyaId: item.hareruya_id,
            singleId: item.single_id,
            productData: null,
            error: 'Failed to load product details',
          };
        }
      }),
    );
    return transformedItems;
  }

  /**
   * Transform single cart item with full product details
   * Searches for product details and returns in standard format (like search)
   */
  private async transformCartItemWithDetails(item: any) {
    let productData: any;

    try {
      if (item.is_hareruya) {
        // For Hareruya products, search for details using hareruyaId
        if (!item.hareruya_id) {
          this.logger.warn(`Cart item ${item.id} is marked as Hareruya but has no hareruya_id`);
          throw new Error('Hareruya item missing hareruya_id');
        }
        productData = await this.getHareruyaProductDetails(
          item.hareruya_id,
          (item.product_data as Record<string, unknown>) || {},
        );
      } else {
        // For local products, transform using search service format
        // and get Hareruya price if available
        if (!item.singles) {
          this.logger.warn(`Cart item ${item.id} is marked as local but has no singles record`);
          throw new Error('Local item missing singles record');
        }
        productData = await this.getLocalProductDetails(item.singles);
      }

      if (!productData) {
        this.logger.warn(`Failed to get product data for cart item ${item.id}`);
        throw new Error('Failed to get product data');
      }

      return {
        id: item.id,
        quantity: item.quantity,
        isHareruya: item.is_hareruya,
        hareruyaId: item.hareruya_id,
        singleId: item.single_id,
        productData,
      };
    } catch (error) {
      this.logger.error(`Error transforming cart item ${item.id}:`, error);
      throw error;
    }
  }

  /**
   * Get Hareruya product details from stored data
   * Uses stored data to avoid excessive API calls to Hareruya
   */
  private async getHareruyaProductDetails(
    hareruyaId: string,
    storedData: Record<string, unknown>,
  ): Promise<any> {
    try {
      // Use stored data directly to avoid excessive Hareruya API calls
      // The stored data should already contain all necessary information
      const cardName =
        (storedData.cardName as string) ||
        (storedData.name as string) ||
        (storedData.title as string) ||
        '';

      // Extract price and convert to finalPrice if needed
      const price = storedData.price as string || '';
      let finalPrice = 0;
      if (price) {
        // Extract numeric value from price string (e.g., "$12.00 MXN" -> 12.00)
        const priceMatch = price.replace(/[^0-9.-]+/g, '');
        finalPrice = parseFloat(priceMatch) || 0;
      }

      // Return stored data in standard format
      return {
        ...storedData,
        hareruyaId,
        cardName: cardName || storedData.cardName || storedData.name || '',
        name: cardName || storedData.name || '',
        title: cardName || storedData.title || storedData.name || '',
        price: price || storedData.price || '',
        finalPrice: finalPrice || (storedData.finalPrice as number) || 0,
        isLocalInventory: false,
        source: 'hareruya',
        // Ensure imageUrl is set
        imageUrl: storedData.imageUrl || storedData.img || '',
        img: storedData.imageUrl || storedData.img || '',
        // Ensure language and foil are set
        language: storedData.language || 'Inglés',
        foil: storedData.foil === true || storedData.foil === 'true' || storedData.foil === 1,
      };
    } catch (error) {
      this.logger.error(
        `Error processing Hareruya product details for ${hareruyaId}:`,
        error,
      );
      // Return stored data on error
      return {
        ...storedData,
        hareruyaId,
        isLocalInventory: false,
        source: 'hareruya',
        price: storedData.price || '',
        finalPrice: 0,
      };
    }
  }

  /**
   * Get local product details
   * Uses local price - Hareruya price lookup is expensive and not needed for cart display
   */
  private async getLocalProductDetails(single: any): Promise<any> {
    if (!single) {
      this.logger.warn('getLocalProductDetails called with null/undefined single');
      return null;
    }

    try {
      // Transform to standard format using search service method
      const transformed = this.searchService.transformLocalProductToHareruyaFormat(
        single,
      );

      if (!transformed) {
        this.logger.warn(`Failed to transform local product ${single.id}`);
        return null;
      }

      // Ensure imageUrl is set (transformLocalProductToHareruyaFormat returns 'img')
      return {
        ...transformed,
        imageUrl: transformed.img || transformed.imageUrl || '',
        img: transformed.img || transformed.imageUrl || '',
      };
    } catch (error) {
      this.logger.error(`Error in getLocalProductDetails for single ${single.id}:`, error);
      throw error;
    }
  }

  /**
   * Normalize language for comparison (same as in SearchService)
   */
  private normalizeLanguageForComparison(lang: string | undefined | null): string {
    if (!lang) return 'ENGLISH';
    const upperLang = lang.toUpperCase().trim();

    // Map language codes and names to normalized English names
    const languageMap: Record<string, string> = {
      'EN': 'ENGLISH',
      'ENGLISH': 'ENGLISH',
      'INGLÉS': 'ENGLISH',
      'INGLES': 'ENGLISH',
      'ES': 'SPANISH',
      'SPANISH': 'SPANISH',
      'ESPAÑOL': 'SPANISH',
      'ESPANOL': 'SPANISH',
      'JP': 'JAPANESE',
      'JA': 'JAPANESE',
      'JAPANESE': 'JAPANESE',
      'JAPONÉS': 'JAPANESE',
      'JAPONES': 'JAPANESE',
      'FR': 'FRENCH',
      'FRENCH': 'FRENCH',
      'FRANCÉS': 'FRENCH',
      'FRANCES': 'FRENCH',
      'DE': 'GERMAN',
      'GERMAN': 'GERMAN',
      'ALEMÁN': 'GERMAN',
      'ALEMAN': 'GERMAN',
      'IT': 'ITALIAN',
      'ITALIAN': 'ITALIAN',
      'ITALIANO': 'ITALIAN',
      'PT': 'PORTUGUESE',
      'PORTUGUESE': 'PORTUGUESE',
      'PORTUGUÉS': 'PORTUGUESE',
      'PORTUGUES': 'PORTUGUESE',
      'ZH': 'CHINESE',
      'CHINESE': 'CHINESE',
      'CHINO': 'CHINESE',
      'KO': 'KOREAN',
      'KOREAN': 'KOREAN',
      'COREANO': 'KOREAN',
      'RU': 'RUSSIAN',
      'RUSSIAN': 'RUSSIAN',
      'RUSO': 'RUSSIAN',
    };

    return languageMap[upperLang] || 'ENGLISH';
  }

  /**
   * Extract minimal required data for Hareruya products
   * Only stores: name (cardName), hareruyaId, language, foil
   * Additional useful fields: price, imageUrl, cardName
   */
  private extractMinimalHareruyaData(
    productData: Record<string, unknown>,
  ): Record<string, unknown> {
    const name =
      productData.cardName ||
      productData.name ||
      productData.title ||
      '';
    const hareruyaIdValue =
      productData.hareruyaId || productData.id || '';
    const language = productData.language || 'Inglés';
    const foil =
      productData.foil === true ||
      productData.foil === 'true' ||
      productData.foil === 1;

    return {
      name,
      hareruyaId: hareruyaIdValue,
      language,
      foil,
      // Store additional useful data but not required
      price: productData.price || '',
      imageUrl: productData.imageUrl || productData.img || '',
      cardName: name, // Store cardName as alias for name
    };
  }

  /**
   * Transform local product to match frontend format
   */
  private transformLocalProduct(single: any) {
    if (!single) return null;

    return {
      id: single.id,
      title: single.name,
      cardName: single.cardName || single.name,
      price: `$${Number(single.finalPrice || single.price).toFixed(2)} MXN`,
      imageUrl: single.img,
      stock: single.stock,
      expansion: single.expansion,
      variant: single.variant,
      condition: single.conditions?.display_name || single.conditions?.name || 'Near Mint',
      language: single.languages?.display_name || single.languages?.name || 'Inglés',
      immediateDelivery: single.isLocalInventory,
      isLocalInventory: single.isLocalInventory,
      foil: single.foil,
      metadata: single.metadata || [],
      showImportacionBadge: single.showImportacionBadge,
      hareruyaId: single.hareruyaId,
      category: single.categories?.name || 'SINGLES',
    };
  }
}

