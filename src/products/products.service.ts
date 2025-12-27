import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateSingleDto } from './dto/create-single.dto.js';
import { HareruyaService } from '../hareruya/hareruya.service.js';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    private hareruyaService: HareruyaService,
  ) {}

  async create(createDto: CreateSingleDto) {
    const {
      owner_id,
      category_id,
      condition_id,
      language_id,
      hareruyaId,
      finalPrice,
      cardName,
      cardNumber,
      expansion,
      borderless,
      extendedArt,
      foil,
      img,
      isLocalInventory,
      link,
      prerelease,
      premierPlay,
      showImportacionBadge,
      stock,
      surgeFoil,
      tags,
      variant,
    } = createDto;

    // Verify owner exists
    const owner = await this.prisma.users.findUnique({
      where: { id: owner_id },
    });

    if (!owner) {
      throw new NotFoundException(`User with ID ${owner_id} not found`);
    }

    // Check if product already exists by Hareruya product ID
    if (hareruyaId) {
      const existing = await this.prisma.singles.findUnique({
        where: { hareruyaId },
      });

      if (existing) {
        throw new ConflictException(
          'Product with this Hareruya ID already exists',
        );
      }
    }

    // Verify category exists
    const category = await this.prisma.categories.findUnique({
      where: { id: category_id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${category_id} not found`);
    }

    // Verify condition exists
    const condition = await this.prisma.conditions.findUnique({
      where: { id: condition_id },
    });
    if (!condition) {
      throw new NotFoundException(
        `Condition with ID ${condition_id} not found`,
      );
    }

    // Verify language exists
    const language = await this.prisma.languages.findUnique({
      where: { id: language_id },
    });
    if (!language) {
      throw new NotFoundException(`Language with ID ${language_id} not found`);
    }

    // Use finalPrice for the price (already in MXN)
    const priceValue = finalPrice || 0;

    // Get or set default TCG (Magic)
    let tcgId = createDto.tcg_id;
    if (!tcgId) {
      const magicTcg = await this.prisma.tcgs.findUnique({
        where: { name: 'Magic' },
      });
      if (magicTcg) {
        tcgId = magicTcg.id;
      }
    } else {
      // Verify TCG exists if provided
      const tcg = await this.prisma.tcgs.findUnique({
        where: { id: tcgId },
      });
      if (!tcg) {
        throw new NotFoundException(`TCG with ID ${tcgId} not found`);
      }
    }

    // Create product with new schema structure
    try {
      const product = await this.prisma.singles.create({
        data: {
          name: cardName,
          price: priceValue,
          category_id,
          condition_id,
          language_id,
          tcg_id: tcgId,
          owner_id,
          borderless,
          cardName,
          cardNumber,
          expansion,
          extendedArt,
          finalPrice: priceValue,
          foil,
          hareruyaId,
          img,
          isLocalInventory: isLocalInventory ?? true, // Default to true for products registered in local DB
          link,
          metadata: [],
          prerelease,
          premierPlay,
          showImportacionBadge,
          stock: stock || 0,
          surgeFoil,
          variant: variant || null,
        },
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              display_name: true,
              description: true,
              is_active: true,
              order: true,
            },
          },
          conditions: true,
          languages: true,
          tcgs: true,
          owner: {
            include: {
              roles: true,
            },
          },
        },
      });

      // Handle tags if provided
      if (tags && tags.length > 0) {
        // Get or create tags
        const tagPromises = tags.map(async (tagName) => {
          // Try to find existing tag
          let tag = await this.prisma.tags.findUnique({
            where: { name: tagName },
          });

          // If tag doesn't exist, create it
          if (!tag) {
            tag = await this.prisma.tags.create({
              data: {
                name: tagName,
                display_name: tagName,
                is_active: true,
                is_default: false,
              },
            });
          }

          return tag;
        });

        const tagRecords = await Promise.all(tagPromises);

        // Get tag IDs
        const tagIds = tagRecords.map((tag) => tag.id);

        // Create relationships in single_tags
        if (tagIds.length > 0) {
          await this.prisma.single_tags.createMany({
            data: tagIds.map((tagId) => ({
              single_id: product.id,
              tag_id: tagId,
            })),
          });
        }
      }

      // Return product with tags
      const productWithTags = await this.prisma.singles.findUnique({
        where: { id: product.id },
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              display_name: true,
              description: true,
              is_active: true,
              order: true,
            },
          },
          conditions: true,
          languages: true,
          tcgs: true,
          owner: {
            include: {
              roles: true,
            },
          },
          tags: {
            include: {
              tags: true,
            },
          },
        },
      });

      // Transform tags from single_tags[] to tags[]
      if (productWithTags) {
        return {
          ...productWithTags,
          tags: productWithTags.tags.map((st) => st.tags),
        };
      }

      return product;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        throw new ConflictException(
          'Product with this Hareruya ID already exists',
        );
      }
      throw new BadRequestException(
        `Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async createBulk(createDtos: CreateSingleDto[]) {
    const results = {
      created: [] as any[],
      failed: [] as Array<{ product: CreateSingleDto; error: string }>,
    };

    for (const createDto of createDtos) {
      try {
        const product = await this.create(createDto);
        results.created.push(product);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({
          product: createDto,
          error: errorMessage,
        });
      }
    }

    return {
      success: results.failed.length === 0,
      created: results.created,
      failed: results.failed,
      total: createDtos.length,
      createdCount: results.created.length,
      failedCount: results.failed.length,
    };
  }

  async updateFromHareruya(productId: string, updateDto: CreateSingleDto) {
    const {
      category_id,
      condition_id,
      language_id,
      finalPrice,
      cardName,
      cardNumber,
      expansion,
      borderless,
      extendedArt,
      foil,
      img,
      isLocalInventory,
      link,
      prerelease,
      premierPlay,
      showImportacionBadge,
      stock,
      surgeFoil,
      tags,
      variant,
    } = updateDto;

    // Verify product exists
    const existing = await this.prisma.singles.findUnique({
      where: { id: productId },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Verify category exists
    const category = await this.prisma.categories.findUnique({
      where: { id: category_id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${category_id} not found`);
    }

    // Verify condition exists
    const condition = await this.prisma.conditions.findUnique({
      where: { id: condition_id },
    });
    if (!condition) {
      throw new NotFoundException(
        `Condition with ID ${condition_id} not found`,
      );
    }

    // Verify language exists
    const language = await this.prisma.languages.findUnique({
      where: { id: language_id },
    });
    if (!language) {
      throw new NotFoundException(`Language with ID ${language_id} not found`);
    }

    // Use finalPrice for the price
    const price = finalPrice || 0;

    // Get or set default TCG (Magic) if not provided
    let tcgId = updateDto.tcg_id;
    if (tcgId === undefined) {
      // If tcg_id is not in the update, keep existing or set to Magic
      const currentProduct = await this.prisma.singles.findUnique({
        where: { id: productId },
        select: { tcg_id: true },
      });
      if (!currentProduct?.tcg_id) {
        const magicTcg = await this.prisma.tcgs.findUnique({
          where: { name: 'Magic' },
        });
        if (magicTcg) {
          tcgId = magicTcg.id;
        }
      } else {
        tcgId = currentProduct.tcg_id;
      }
    } else if (tcgId !== null) {
      // Verify TCG exists if provided
      const tcg = await this.prisma.tcgs.findUnique({
        where: { id: tcgId },
      });
      if (!tcg) {
        throw new NotFoundException(`TCG with ID ${tcgId} not found`);
      }
    }

    // Update product with new schema structure
    const product = await this.prisma.singles.update({
      where: { id: productId },
      data: {
        name: cardName,
        price: price,
        category_id,
        condition_id,
        language_id,
        tcg_id: tcgId,
        borderless,
        cardName,
        cardNumber,
        expansion,
        extendedArt,
        finalPrice: price,
        foil,
        img,
        isLocalInventory,
        link,
        metadata: [],
        prerelease,
        premierPlay,
        showImportacionBadge,
        stock: stock || 0,
        surgeFoil,
        variant: variant || null,
      },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            display_name: true,
            description: true,
            is_active: true,
            order: true,
          },
        },
        conditions: true,
        languages: true,
        tcgs: true,
        owner: {
          include: {
            roles: true,
          },
        },
      },
    });

    // Handle tags if provided
    if (tags && tags.length > 0) {
      // Get or create tags
      const tagPromises = tags.map(async (tagName) => {
        // Try to find existing tag
        let tag = await this.prisma.tags.findUnique({
          where: { name: tagName },
        });

        // If tag doesn't exist, create it
        if (!tag) {
          tag = await this.prisma.tags.create({
            data: {
              name: tagName,
              display_name: tagName,
              is_active: true,
              is_default: false,
            },
          });
        }

        return tag;
      });

      const tagRecords = await Promise.all(tagPromises);

      // Get tag IDs
      const tagIds = tagRecords.map((tag) => tag.id);

      // Remove all existing tags for this product
      await this.prisma.single_tags.deleteMany({
        where: { single_id: productId },
      });

      // Create new relationships in single_tags
      if (tagIds.length > 0) {
        await this.prisma.single_tags.createMany({
          data: tagIds.map((tagId) => ({
            single_id: productId,
            tag_id: tagId,
          })),
        });
      }
    }

    // Return product with tags
    const productWithTags = await this.prisma.singles.findUnique({
      where: { id: productId },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            display_name: true,
            description: true,
            is_active: true,
            order: true,
          },
        },
        conditions: true,
        languages: true,
        tcgs: true,
        owner: {
          include: {
            roles: true,
          },
        },
        tags: {
          include: {
            tags: true,
          },
        },
      },
    });

    // Transform tags from single_tags[] to tags[]
    if (productWithTags) {
      return {
        ...productWithTags,
        tags: productWithTags.tags.map((st) => st.tags),
      };
    }

    return product;
  }

  async findByHareruyaId(hareruyaProductId: string) {
    const product = await this.prisma.singles.findUnique({
      where: { hareruyaId: hareruyaProductId },
      include: {
        categories: true,
        conditions: true,
        languages: true,
        rarities: true,
        tcgs: true,
        owner: {
          include: {
            roles: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with Hareruya ID ${hareruyaProductId} not found`,
      );
    }

    return product;
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const products = await this.prisma.singles.findMany({
      skip,
      take: limit,
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            display_name: true,
            description: true,
            is_active: true,
            order: true,
          },
        },
        conditions: true,
        languages: true,
        rarities: true,
        tcgs: true,
        owner: {
          include: {
            roles: true,
          },
        },
        tags: {
          include: {
            tags: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Transform tags from single_tags[] to tags[]
    const transformedProducts = products.map((product) => ({
      ...product,
      tags: product.tags.map((st) => st.tags),
    }));

    // For admin dashboard, show all products regardless of Hareruya stock
    // The filtering is only applied in search endpoints for public-facing views
    // Get total count before filtering for accurate pagination
    const totalCount = await this.prisma.singles.count();

    return {
      data: transformedProducts,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async findLocal(page: number = 1, limit: number = 12) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.singles.findMany({
        where: {
          isLocalInventory: true,
        },
        skip,
        take: limit,
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              display_name: true,
              description: true,
              is_active: true,
              order: true,
            },
          },
          conditions: true,
          languages: true,
          rarities: true,
          tcgs: true,
          owner: {
            include: {
              roles: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.singles.count({
        where: {
          isLocalInventory: true,
        },
      }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByOwner(ownerId: string, page: number = 1, limit: number = 20) {
    // Verify owner exists
    const owner = await this.prisma.users.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      throw new NotFoundException(`User with ID ${ownerId} not found`);
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.singles.findMany({
        where: { owner_id: ownerId },
        skip,
        take: limit,
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              display_name: true,
              description: true,
              is_active: true,
              order: true,
            },
          },
          conditions: true,
          languages: true,
          rarities: true,
          tcgs: true,
          owner: {
            include: {
              roles: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.singles.count({
        where: { owner_id: ownerId },
      }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByName(name: string) {
    if (!name || name.trim() === '') {
      return [];
    }

    const products = await this.prisma.singles.findMany({
      where: {
        name: {
          contains: name.trim(),
          mode: 'insensitive',
        },
        // Filter: Exclude local inventory items without hareruyaId
        // If isLocalInventory is true, must have hareruyaId (exists in Hareruya)
        // Local stock is not checked - we know it exists if it's in my collection
        OR: [
          // Show items that are NOT local inventory
          { isLocalInventory: { not: true } },
          // OR show local inventory items that have hareruyaId (exist in Hareruya)
          {
            AND: [{ isLocalInventory: true }, { hareruyaId: { not: null } }],
          },
        ],
      },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            display_name: true,
            description: true,
            is_active: true,
            order: true,
          },
        },
        conditions: true,
        languages: true,
        rarities: true,
        tcgs: true,
        owner: {
          include: {
            roles: true,
          },
        },
        tags: {
          include: {
            tags: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Transform tags from single_tags[] to tags[]
    const transformedProducts = products.map((product) => ({
      ...product,
      tags: product.tags.map((st) => st.tags),
    }));

    // Filter out products with "Personal" tag or isLocalInventory that don't have stock in Hareruya
    const filteredProducts =
      await this.filterProductsWithoutHareruyaStock(transformedProducts);

    return filteredProducts;
  }

  /**
   * Filter products that have "Personal" tag and don't have stock in Hareruya
   * Returns filtered array of products
   */
  private async filterProductsWithoutHareruyaStock(
    products: Array<Record<string, any> & { id: string }>,
  ): Promise<Array<Record<string, any> & { id: string }>> {
    console.log('filterProductsWithoutHareruyaStock', products);
    const productsWithoutHareruyaStock = new Set<string>();
    const productsToCheckStock: Array<{
      product: any;
      hareruyaId: string;
      cardName: string;
      language: string;
      foil: boolean;
    }> = [];

    // Identify products that need Hareruya stock verification
    // IMPORTANT: Only process LOCAL products with "Personal" tag
    // Products from products.service are always local (from database), but we verify anyway
    for (const localProduct of products) {
      // Use Record type for safe property access instead of 'any'
      const product = localProduct as Record<string, unknown> & {
        id: string;
        isLocalInventory?: boolean;
        metadata?: string[] | null;
        tags?: unknown;
        hareruyaId?: string | null;
        languages?: { code?: string } | null;
        cardName?: string | null;
        name?: string | null;
        foil?: boolean;
      };

      const productName = product.cardName || product.name || 'unknown';
      const productId = String(product.id || 'unknown');

      // Skip products that are not local (isLocalInventory=false doesn't need verification)
      const productIsLocalInventoryValue = product.isLocalInventory;
      const productIsLocalInventory: boolean | undefined =
        typeof productIsLocalInventoryValue === 'boolean'
          ? productIsLocalInventoryValue
          : undefined;

      if (productIsLocalInventory === false) {
        // These products don't need Hareruya stock verification
        this.logger.log(
          `[FILTER] Skipping product ${productId} (${productName}) - isLocalInventory=${productIsLocalInventory ?? 'null'}`,
        );
        continue;
      }

      // Extract metadata and tags for LOCAL products only
      const metadata: string[] = [];
      const productMetadataValue = product.metadata;
      const productMetadata: string[] | null | undefined =
        productMetadataValue && Array.isArray(productMetadataValue)
          ? productMetadataValue
          : null;
      if (productMetadata) {
        // Type-safe spread: ensure all elements are strings
        const stringMetadata = productMetadata.filter(
          (item): item is string => typeof item === 'string',
        );
        metadata.push(...stringMetadata);
      }

      // Get tags from single_tags relation or direct tags array
      // After transformation, tags is an array of tag objects with { id, name, display_name, ... }
      const productTagsValue = product.tags;
      const productTags: unknown[] = Array.isArray(productTagsValue)
        ? productTagsValue
        : [];
      const tags: unknown[] = productTags;
      const tagNames: string[] = tags
        .map((st: unknown) => {
          if (typeof st === 'string') {
            return st;
          }
          if (st && typeof st === 'object') {
            // After transformation, tags are directly tag objects: { id, name, display_name, ... }
            // Not nested like { tags: { name: ... } }
            const tagObj = st as { tags?: { name?: unknown }; name?: unknown };
            // Try both structures: transformed (direct name) and raw (nested tags.name)
            // After transformation: tags are { id, name, display_name, ... }
            // Before transformation: tags are { tags: { id, name, display_name, ... } }
            const tagName =
              typeof tagObj.name === 'string' && tagObj.name.trim().length > 0
                ? tagObj.name.trim()
                : typeof tagObj.tags?.name === 'string' &&
                    tagObj.tags.name.trim().length > 0
                  ? tagObj.tags.name.trim()
                  : '';
            return tagName;
          }
          return '';
        })
        .filter((item): item is string => typeof item === 'string');
      const hasPersonalTag =
        tagNames.some((tag: string) => tag.toLowerCase() === 'personal') ||
        metadata.includes('Personal');

      // Check if product needs stock verification
      // Only local products with Personal tag need verification
      const needsStockCheck = hasPersonalTag && product.hareruyaId;

      // Log all products for debugging - ALWAYS log to see what's happening
      const tagNamesStr = tagNames.length > 0 ? tagNames.join(', ') : 'none';
      const metadataStr = metadata.length > 0 ? metadata.join(', ') : 'none';
      const tagsRawStr = Array.isArray(productTagsValue)
        ? `[${productTagsValue.length} tags]`
        : String(productTagsValue);

      // Log all LOCAL products for debugging
      this.logger.log(
        `[FILTER DEBUG] Product ${productId} (${productName}): hasPersonalTag=${hasPersonalTag}, hareruyaId=${product.hareruyaId || 'null'}, needsStockCheck=${needsStockCheck}, tagNames=[${tagNamesStr}], metadata=[${metadataStr}], tagsRaw=${tagsRawStr}`,
      );

      if (hasPersonalTag) {
        this.logger.log(
          `Product ${productId} (${productName}) has Personal tag, hareruyaId: ${product.hareruyaId || 'null'}, needsStockCheck: ${needsStockCheck}`,
        );
        // Special logging for "Flubs" to debug
        if (productName.toLowerCase().includes('flubs')) {
          this.logger.log(
            `[DEBUG FLUBS] Product ID: ${productId}, hareruyaId: ${product.hareruyaId}, language: ${(product as { languages?: { code?: string } }).languages?.code || 'unknown'}, foil: ${product.foil}, tagNames: ${tagNames.join(', ')}, metadata: ${metadata.join(', ')}`,
          );
        }
      }

      if (needsStockCheck) {
        // Safely extract language code with type checking
        let languageCode = 'EN';
        try {
          const productLanguages: unknown = (product as { languages?: unknown })
            .languages;
          if (
            productLanguages &&
            typeof productLanguages === 'object' &&
            productLanguages !== null &&
            'code' in productLanguages
          ) {
            const codeValue = (productLanguages as { code?: unknown }).code;
            if (typeof codeValue === 'string' && codeValue.length > 0) {
              languageCode = codeValue;
            }
          }
        } catch {
          // Fallback to 'EN' if extraction fails
          languageCode = 'EN';
        }
        // Safely extract product properties with type checking
        const productHareruyaIdValue = (product as { hareruyaId?: unknown })
          .hareruyaId;
        const productHareruyaId: string =
          typeof productHareruyaIdValue === 'string'
            ? productHareruyaIdValue
            : '';
        const productCardNameValue = (product as { cardName?: unknown })
          .cardName;
        const productNameValue = (product as { name?: unknown }).name;
        const productCardName: string =
          typeof productCardNameValue === 'string'
            ? productCardNameValue
            : typeof productNameValue === 'string'
              ? productNameValue
              : '';
        const productFoilValue = (product as { foil?: unknown }).foil;
        const productFoil: boolean = productFoilValue === true;

        productsToCheckStock.push({
          product: localProduct,
          hareruyaId: productHareruyaId,
          cardName: productCardName,
          language: languageCode,
          foil: productFoil,
        });
      }
    }

    // Check Hareruya stock for products that need verification
    if (productsToCheckStock.length > 0) {
      this.logger.log(
        `Checking Hareruya stock for ${productsToCheckStock.length} products with Personal tag`,
      );
      try {
        const hareruyaIds = productsToCheckStock.map((p) => p.hareruyaId);
        const cardNames = productsToCheckStock.map((p) => p.cardName);

        this.logger.log(
          `Fetching Hareruya pricing for IDs: ${hareruyaIds.join(', ')}`,
        );
        const pricingResult = await this.hareruyaService.getHareruyaPricing({
          productIds: hareruyaIds,
          cardNames: cardNames,
        });

        if (pricingResult.success && pricingResult.pricing) {
          // For each product, find matching variant by hareruyaId, language, and foil
          // IMPORTANT: Must match EXACT variant - same hareruyaId, language, and foil
          for (const productToCheck of productsToCheckStock) {
            // First, filter variants by exact hareruyaId match
            const variantsWithSameId = pricingResult.pricing.filter(
              (variant) => variant.productId === productToCheck.hareruyaId,
            );

            // If no variants with matching hareruyaId, exclude the product
            if (variantsWithSameId.length === 0) {
              const productIdValue = (
                productToCheck.product as { id?: unknown }
              ).id;
              let productId = '';
              if (typeof productIdValue === 'string') {
                productId = productIdValue;
              } else if (
                productIdValue != null &&
                (typeof productIdValue === 'number' ||
                  typeof productIdValue === 'boolean' ||
                  typeof productIdValue === 'bigint')
              ) {
                productId = String(productIdValue);
              }
              if (productId) {
                productsWithoutHareruyaStock.add(productId);
              }
              this.logger.log(
                `Excluding product ${productId} (${productToCheck.cardName}) - no variant found with hareruyaId: ${productToCheck.hareruyaId}`,
              );
              continue;
            }

            // Now find the exact variant matching language and foil
            const matchingVariant = variantsWithSameId.find((variant) => {
              // Match by language - normalize both
              const variantLanguage = (variant.language || 'ENGLISH')
                .toUpperCase()
                .trim();
              const productLanguage = this.normalizeLanguageForComparison(
                productToCheck.language,
              )
                .toUpperCase()
                .trim();
              const languageMatches = variantLanguage === productLanguage;

              // Match by foil
              const foilMatches =
                productToCheck.foil === (variant.isFoil === true);

              return languageMatches && foilMatches;
            });

            // If no matching variant found or stock is 0, exclude from results
            // IMPORTANT: We must match the EXACT variant (same hareruyaId, language, and foil)
            // If the exact variant has stock 0, it should be excluded
            if (!matchingVariant) {
              // No matching variant found - exclude
              const productIdValue = (
                productToCheck.product as { id?: unknown }
              ).id;
              let productId = '';
              if (typeof productIdValue === 'string') {
                productId = productIdValue;
              } else if (
                productIdValue != null &&
                (typeof productIdValue === 'number' ||
                  typeof productIdValue === 'boolean' ||
                  typeof productIdValue === 'bigint')
              ) {
                productId = String(productIdValue);
              }
              if (productId) {
                productsWithoutHareruyaStock.add(productId);
              }
              this.logger.log(
                `Excluding product ${productId} (${productToCheck.cardName}) - no matching variant found in Hareruya (hareruyaId: ${productToCheck.hareruyaId}, language: ${productToCheck.language}, foil: ${productToCheck.foil})`,
              );
            } else if (matchingVariant.stock <= 0) {
              // Exact variant found but stock is 0 - exclude
              const productIdValue = (
                productToCheck.product as { id?: unknown }
              ).id;
              let productId = '';
              if (typeof productIdValue === 'string') {
                productId = productIdValue;
              } else if (
                productIdValue != null &&
                (typeof productIdValue === 'number' ||
                  typeof productIdValue === 'boolean' ||
                  typeof productIdValue === 'bigint')
              ) {
                productId = String(productIdValue);
              }
              if (productId) {
                productsWithoutHareruyaStock.add(productId);
              }
              const cardName = productToCheck.cardName || 'unknown';
              this.logger.log(
                `Excluding product ${productId} (${cardName}) - stock is 0 in Hareruya for exact variant (hareruyaId: ${productToCheck.hareruyaId}, language: ${productToCheck.language}, foil: ${productToCheck.foil}, stock: ${matchingVariant.stock})`,
              );
              // Special logging for "Flubs"
              if (cardName.toLowerCase().includes('flubs')) {
                this.logger.log(
                  `[DEBUG FLUBS EXCLUSION] Product ID: ${productId}, hareruyaId: ${productToCheck.hareruyaId}, language: ${productToCheck.language}, foil: ${productToCheck.foil}, variant stock: ${matchingVariant.stock}`,
                );
              }
            } else {
              // Variant found with stock > 0 - keep the product
              const cardName = productToCheck.cardName || 'unknown';
              if (cardName.toLowerCase().includes('flubs')) {
                this.logger.log(
                  `[DEBUG FLUBS KEEP] Product kept - variant found with stock > 0 (hareruyaId: ${productToCheck.hareruyaId}, language: ${productToCheck.language}, foil: ${productToCheck.foil}, stock: ${matchingVariant.stock})`,
                );
              }
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Error checking Hareruya stock for Personal/local inventory products: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // On error, be conservative and exclude products that need stock check
        productsToCheckStock.forEach((p) => {
          const productIdValue = (p.product as { id?: unknown }).id;
          let productId = '';
          if (typeof productIdValue === 'string') {
            productId = productIdValue;
          } else if (
            productIdValue != null &&
            (typeof productIdValue === 'number' ||
              typeof productIdValue === 'boolean' ||
              typeof productIdValue === 'bigint')
          ) {
            productId = String(productIdValue);
          }
          if (productId) {
            productsWithoutHareruyaStock.add(productId);
          }
        });
      }
    }

    // Return filtered products
    const filtered = products.filter((product) => {
      const productId = String(product.id);
      const isExcluded = productsWithoutHareruyaStock.has(productId);
      if (isExcluded) {
        this.logger.log(
          `Filtering out product ${productId} (${(product as { cardName?: string; name?: string }).cardName || (product as { cardName?: string; name?: string }).name || 'unknown'})`,
        );
      }
      return !isExcluded;
    });

    this.logger.log(
      `filterProductsWithoutHareruyaStock: Excluded ${productsWithoutHareruyaStock.size} products, ${filtered.length} remain out of ${products.length} total`,
    );
    if (productsWithoutHareruyaStock.size > 0) {
      this.logger.log(
        `Excluded product IDs: ${Array.from(productsWithoutHareruyaStock).join(', ')}`,
      );
    }

    return filtered;
  }

  /**
   * Update all products in database to have isLocalInventory=true
   * This fixes products that were incorrectly set with isLocalInventory=false
   */
  async updateAllProductsToLocalInventory(): Promise<{
    success: boolean;
    updated: number;
    message: string;
  }> {
    try {
      // Update products that have isLocalInventory=false
      const result = await this.prisma.singles.updateMany({
        where: {
          isLocalInventory: false,
        },
        data: {
          isLocalInventory: true,
        },
      });

      this.logger.log(
        `Updated ${result.count} products to have isLocalInventory=true`,
      );

      return {
        success: true,
        updated: result.count,
        message: `Successfully updated ${result.count} products to have isLocalInventory=true`,
      };
    } catch (error) {
      this.logger.error(
        `Error updating products isLocalInventory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        `Failed to update products: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Normalize language for comparison (similar to SearchService)
   */
  private normalizeLanguageForComparison(
    lang: string | undefined | null,
  ): string {
    if (!lang) return 'ENGLISH';
    const upperLang = lang.toUpperCase().trim();

    // Map language codes to normalized names
    const codeMap: Record<string, string> = {
      JP: 'JAPANESE',
      EN: 'ENGLISH',
      ES: 'SPANISH',
      FR: 'FRENCH',
      DE: 'GERMAN',
      IT: 'ITALIAN',
      PT: 'PORTUGUESE',
      RU: 'RUSSIAN',
      KO: 'KOREAN',
      CS: 'CHINESE',
      CT: 'CHINESE',
      AG: 'ENGLISH',
    };

    // Map Spanish names to normalized names
    const nameMap: Record<string, string> = {
      JAPONÉS: 'JAPANESE',
      JAPANESE: 'JAPANESE',
      INGLÉS: 'ENGLISH',
      ENGLISH: 'ENGLISH',
      ESPAÑOL: 'SPANISH',
      SPANISH: 'SPANISH',
    };

    return codeMap[upperLang] || nameMap[upperLang] || upperLang;
  }

  async findLatest(limit: number = 12, page: number = 1, category?: string) {
    const skip = (page - 1) * limit;

    // Build where clause with optional category filter
    // Filter: If isLocalInventory is true, must have stock > 0
    // The exact version is identified by hareruyaId, language_id, and foil
    const where: { category_id?: string; OR?: any[] } = {};

    if (category) {
      // Find category by name (case insensitive)
      const categoryRecord = await this.prisma.categories.findFirst({
        where: {
          OR: [
            { name: { equals: category, mode: 'insensitive' } },
            { display_name: { equals: category, mode: 'insensitive' } },
          ],
        },
      });

      if (categoryRecord) {
        where.category_id = categoryRecord.id;
      }
    }

    // Filter: Exclude local inventory items without hareruyaId
    // If isLocalInventory is true, must have hareruyaId (exists in Hareruya)
    // Local stock is not checked here - we know it exists if it's in my collection
    // If isLocalInventory is false (or null), show regardless
    where.OR = [
      // Show items that are NOT local inventory (isLocalInventory is false or null)
      { isLocalInventory: { not: true } },
      // OR show local inventory items that have hareruyaId (exist in Hareruya)
      {
        AND: [{ isLocalInventory: true }, { hareruyaId: { not: null } }],
      },
    ];

    const products = await this.prisma.singles.findMany({
      where,
      skip,
      take: limit,
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            display_name: true,
            description: true,
            is_active: true,
            order: true,
          },
        },
        conditions: true,
        languages: true,
        rarities: true,
        tcgs: true,
        owner: {
          include: {
            roles: true,
          },
        },
        tags: {
          include: {
            tags: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Transform tags from single_tags[] to tags[]
    const transformedProducts = products.map((product) => ({
      ...product,
      tags: product.tags.map((st) => st.tags),
    }));

    // Filter out products with "Personal" tag or isLocalInventory that don't have stock in Hareruya
    const filteredProducts =
      await this.filterProductsWithoutHareruyaStock(transformedProducts);

    return filteredProducts;
  }

  async countByCategory(category: string): Promise<number> {
    const categoryRecord = await this.prisma.categories.findFirst({
      where: {
        OR: [
          { name: { equals: category, mode: 'insensitive' } },
          { display_name: { equals: category, mode: 'insensitive' } },
        ],
      },
    });

    if (!categoryRecord) {
      return 0;
    }

    // Apply same filter: exclude local inventory items without hareruyaId
    return this.prisma.singles.count({
      where: {
        category_id: categoryRecord.id,
        OR: [
          // Show items that are NOT local inventory
          { isLocalInventory: { not: true } },
          // OR show local inventory items that have hareruyaId (exist in Hareruya)
          {
            AND: [{ isLocalInventory: true }, { hareruyaId: { not: null } }],
          },
        ],
      },
    });
  }

  async findByMetadata(metadata: string, limit: number = 12, page: number = 1) {
    const skip = (page - 1) * limit;

    const products = await this.prisma.singles.findMany({
      skip,
      take: limit,
      where: {
        metadata: {
          has: metadata,
        },
        // Filter: Exclude local inventory items without hareruyaId
        // If isLocalInventory is true, must have hareruyaId (exists in Hareruya)
        // Local stock is not checked - we know it exists if it's in my collection
        OR: [
          // Show items that are NOT local inventory
          { isLocalInventory: { not: true } },
          // OR show local inventory items that have hareruyaId (exist in Hareruya)
          {
            AND: [{ isLocalInventory: true }, { hareruyaId: { not: null } }],
          },
        ],
      },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            display_name: true,
            description: true,
            is_active: true,
            order: true,
          },
        },
        conditions: true,
        languages: true,
        rarities: true,
        tcgs: true,
        owner: {
          include: {
            roles: true,
          },
        },
      },
      orderBy: {
        price: 'desc', // Ordenar por precio descendente (más caros primero)
      },
    });

    return products;
  }

  async findOne(id: string) {
    const product = await this.prisma.singles.findUnique({
      where: { id },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            display_name: true,
            description: true,
            is_active: true,
            order: true,
          },
        },
        conditions: true,
        languages: true,
        rarities: true,
        tcgs: true,
        owner: {
          include: {
            roles: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async remove(id: string) {
    const product = await this.prisma.singles.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Delete related records first to avoid foreign key constraint violations
    await this.prisma.single_tags.deleteMany({
      where: { single_id: id },
    });

    await this.prisma.singles.delete({
      where: { id },
    });

    return { message: `Product with ID ${id} has been deleted successfully` };
  }

  async updateTags(productId: string, tagNames: string[]) {
    // Verify product exists
    const existingProduct = await this.prisma.singles.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Get or create tags
    const tagPromises = tagNames.map(async (tagName) => {
      // Try to find existing tag
      let tag = await this.prisma.tags.findUnique({
        where: { name: tagName },
      });

      // If tag doesn't exist, create it
      if (!tag) {
        tag = await this.prisma.tags.create({
          data: {
            name: tagName,
            display_name: tagName,
            is_active: true,
            is_default: false,
          },
        });
      }

      return tag;
    });

    const tags = await Promise.all(tagPromises);

    // Get tag IDs
    const tagIds = tags.map((tag) => tag.id);

    // Remove all existing tags for this product
    await this.prisma.single_tags.deleteMany({
      where: { single_id: productId },
    });

    // Add new tags
    if (tagIds.length > 0) {
      await this.prisma.single_tags.createMany({
        data: tagIds.map((tagId) => ({
          single_id: productId,
          tag_id: tagId,
        })),
      });
    }

    // Return updated product with tags
    const updatedProduct = await this.prisma.singles.findUnique({
      where: { id: productId },
      include: {
        tags: {
          include: {
            tags: true,
          },
        },
      },
    });

    // Transform tags from single_tags[] to tags[]
    if (updatedProduct) {
      return {
        ...updatedProduct,
        tags: updatedProduct.tags.map((st) => st.tags),
      };
    }

    return updatedProduct;
  }

  async updateFoil(productId: string, foil: boolean) {
    // Verify product exists
    const existingProduct = await this.prisma.singles.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Update foil status
    const updatedProduct = await this.prisma.singles.update({
      where: { id: productId },
      data: { foil },
      include: {
        tags: {
          include: {
            tags: true,
          },
        },
      },
    });

    // Transform tags from single_tags[] to tags[]
    return {
      ...updatedProduct,
      tags: updatedProduct.tags.map((st) => st.tags),
    };
  }
}
