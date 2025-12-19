import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateProductFromHareruyaDto } from './dto/create-product-from-hareruya.dto.js';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async createFromHareruya(createDto: CreateProductFromHareruyaDto) {
    const { hareruyaProduct, category_id, owner_id } = createDto;

    // Verify owner exists
    const owner = await this.prisma.users.findUnique({
      where: { id: owner_id },
    });

    if (!owner) {
      throw new NotFoundException(`User with ID ${owner_id} not found`);
    }

    // Check if product already exists by Hareruya product ID
    if (hareruyaProduct.product) {
      const existing = await this.prisma.products.findUnique({
        where: { hareruya_product_id: hareruyaProduct.product },
      });

      if (existing) {
        // Update existing product
        return this.updateFromHareruya(existing.id, createDto);
      }
    }

    // Get or create default category if not provided
    let categoryId = category_id;
    if (!categoryId) {
      const defaultCategory = await this.prisma.categories.findFirst({
        where: { name: 'Single' },
      });

      if (!defaultCategory) {
        // Create default category
        const newCategory = await this.prisma.categories.create({
          data: {
            name: 'Single',
            order: 1,
          },
        });
        categoryId = newCategory.id;
      } else {
        categoryId = defaultCategory.id;
      }
    } else {
      // Verify category exists
      const category = await this.prisma.categories.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
    }

    // Get or create language based on Hareruya language code
    const languageMap: Record<string, { code: string; name: string; display_name: string }> = {
      '1': { code: 'JP', name: 'Japonés', display_name: 'Japonés' },
      '2': { code: 'EN', name: 'Inglés', display_name: 'Inglés' },
      '3': { code: 'CS', name: 'Chino Simplificado', display_name: 'Chino Simplificado' },
      '4': { code: 'CT', name: 'Chino Tradicional', display_name: 'Chino Tradicional' },
      '5': { code: 'FR', name: 'Francés', display_name: 'Francés' },
      '6': { code: 'DE', name: 'Alemán', display_name: 'Alemán' },
      '7': { code: 'IT', name: 'Italiano', display_name: 'Italiano' },
      '8': { code: 'KO', name: 'Coreano', display_name: 'Coreano' },
      '9': { code: 'PT', name: 'Portugués', display_name: 'Portugués' },
      '10': { code: 'RU', name: 'Ruso', display_name: 'Ruso' },
      '11': { code: 'ES', name: 'Español', display_name: 'Español' },
      '12': { code: 'AG', name: 'Antiguo', display_name: 'Antiguo' },
    };

    const languageData = languageMap[hareruyaProduct.language] || languageMap['2']; // Default to English
    let language = await this.prisma.languages.findUnique({
      where: { code: languageData.code },
    });
    if (!language) {
      language = await this.prisma.languages.create({
        data: {
          code: languageData.code,
          name: languageData.name,
          display_name: languageData.display_name,
        },
      });
    }

    // Get or create condition (assuming 1 = Near Mint)
    const conditionMap: Record<string, string> = {
      '1': 'Near Mint',
      '2': 'Lightly Played',
      '3': 'Moderately Played',
      '4': 'Heavily Played',
      '5': 'Damaged',
    };
    const conditionName = conditionMap[hareruyaProduct.card_condition] || 'Near Mint';
    let condition = await this.prisma.conditions.findUnique({
      where: { name: conditionName },
    });
    if (!condition) {
      condition = await this.prisma.conditions.create({
        data: { name: conditionName },
      });
    }

    // Parse price (Hareruya prices are in JPY, stored as string)
    const price = parseFloat(hareruyaProduct.price) || 0;

    // Create product
    try {
      const product = await this.prisma.products.create({
        data: {
          name: hareruyaProduct.product_name_en || hareruyaProduct.card_name,
          price: price,
          image_url: hareruyaProduct.image_url,
          category_id: categoryId,
          condition_id: condition.id,
          language_id: language.id,
          owner_id: owner_id,
          // Hareruya-specific fields
          hareruya_product_id: hareruyaProduct.product,
          card_name: hareruyaProduct.card_name,
          product_name_en: hareruyaProduct.product_name_en,
          product_name_jp: hareruyaProduct.product_name,
          is_foil: hareruyaProduct.foil_flg === '1',
          hareruya_stock: parseInt(hareruyaProduct.stock) || 0,
          hareruya_product_class: hareruyaProduct.product_class,
          hareruya_sale_flg: hareruyaProduct.sale_flg === '1',
          hareruya_weekly_sales: parseInt(hareruyaProduct.weekly_sales) || 0,
        },
        include: {
          categories: true,
          conditions: true,
          languages: true,
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

  async updateFromHareruya(productId: string, updateDto: CreateProductFromHareruyaDto) {
    const { hareruyaProduct } = updateDto;

    // Verify product exists
    const existing = await this.prisma.products.findUnique({
      where: { id: productId },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Parse price
    const price = parseFloat(hareruyaProduct.price) || 0;

    // Update product
    const product = await this.prisma.products.update({
      where: { id: productId },
      data: {
        name: hareruyaProduct.product_name_en || hareruyaProduct.card_name,
        price: price,
        image_url: hareruyaProduct.image_url,
        // Update Hareruya-specific fields
        card_name: hareruyaProduct.card_name,
        product_name_en: hareruyaProduct.product_name_en,
        product_name_jp: hareruyaProduct.product_name,
        is_foil: hareruyaProduct.foil_flg === '1',
        hareruya_stock: parseInt(hareruyaProduct.stock) || 0,
        hareruya_product_class: hareruyaProduct.product_class,
        hareruya_sale_flg: hareruyaProduct.sale_flg === '1',
        hareruya_weekly_sales: parseInt(hareruyaProduct.weekly_sales) || 0,
      },
      include: {
        categories: true,
        conditions: true,
        languages: true,
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
    const product = await this.prisma.products.findUnique({
      where: { hareruya_product_id: hareruyaProductId },
      include: {
        categories: true,
        conditions: true,
        languages: true,
        rarities: true,
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
      this.prisma.products.findMany({
        skip,
        take: limit,
        include: {
          categories: true,
          conditions: true,
          languages: true,
          rarities: true,
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
      this.prisma.products.count(),
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
      this.prisma.products.findMany({
        where: { owner_id: ownerId },
        skip,
        take: limit,
        include: {
          categories: true,
          conditions: true,
          languages: true,
          rarities: true,
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
      this.prisma.products.count({
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
}

