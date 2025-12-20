import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateSingleDto } from './dto/create-single.dto.js';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

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
      metadata,
      prerelease,
      premierPlay,
      price,
      showImportacionBadge,
      source,
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
        throw new ConflictException('Product with this Hareruya ID already exists');
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
      throw new NotFoundException(`Condition with ID ${condition_id} not found`);
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
          isLocalInventory,
          link,
          metadata: metadata || [],
          prerelease,
          premierPlay,
          showImportacionBadge,
          source: source || 'hareruya',
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

      return product;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new ConflictException('Product with this Hareruya ID already exists');
      }
      throw new BadRequestException(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
      metadata,
      prerelease,
      premierPlay,
      showImportacionBadge,
      source,
      stock,
      surgeFoil,
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
      throw new NotFoundException(`Condition with ID ${condition_id} not found`);
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
        metadata: metadata || [],
        prerelease,
        premierPlay,
        showImportacionBadge,
        source: source || 'hareruya',
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
      throw new NotFoundException(`Product with Hareruya ID ${hareruyaProductId} not found`);
    }

    return product;
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.singles.findMany({
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
      this.prisma.singles.count(),
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
        created_at: 'desc',
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

    await this.prisma.singles.delete({
      where: { id },
    });

    return { message: `Product with ID ${id} has been deleted successfully` };
  }
}

