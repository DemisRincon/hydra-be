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
    const { hareruyaProduct, category_id, owner_id } = createDto;

    // Verify owner exists
    const owner = await this.prisma.users.findUnique({
      where: { id: owner_id },
    });

    if (!owner) {
      throw new NotFoundException(`User with ID ${owner_id} not found`);
    }

    // Check if product already exists by Hareruya product ID
    if (hareruyaProduct.hareruyaId) {
      const existing = await this.prisma.singles.findUnique({
        where: { hareruyaId: hareruyaProduct.hareruyaId },
      });

      if (existing) {
        throw new ConflictException('Product with this Hareruya ID already exists');
      }
    }

    // Get or create category
    let categoryId = category_id;
    if (!categoryId) {
      // Map category string to category name
      const categoryName = hareruyaProduct.category === 'SINGLES' ? 'Single' : hareruyaProduct.category || 'Single';
      const defaultCategory = await this.prisma.categories.findFirst({
        where: { name: categoryName },
      });

      if (!defaultCategory) {
        // Create category
        const newCategory = await this.prisma.categories.create({
          data: {
            name: categoryName,
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

    // Get or create language based on language string (e.g., "Inglés", "Japonés")
    const languageNameMap: Record<string, { code: string; name: string; display_name: string }> = {
      'Inglés': { code: 'EN', name: 'Inglés', display_name: 'Inglés' },
      'Japonés': { code: 'JP', name: 'Japonés', display_name: 'Japonés' },
      'Chino Simplificado': { code: 'CS', name: 'Chino Simplificado', display_name: 'Chino Simplificado' },
      'Chino Tradicional': { code: 'CT', name: 'Chino Tradicional', display_name: 'Chino Tradicional' },
      'Francés': { code: 'FR', name: 'Francés', display_name: 'Francés' },
      'Alemán': { code: 'DE', name: 'Alemán', display_name: 'Alemán' },
      'Italiano': { code: 'IT', name: 'Italiano', display_name: 'Italiano' },
      'Coreano': { code: 'KO', name: 'Coreano', display_name: 'Coreano' },
      'Portugués': { code: 'PT', name: 'Portugués', display_name: 'Portugués' },
      'Ruso': { code: 'RU', name: 'Ruso', display_name: 'Ruso' },
      'Español': { code: 'ES', name: 'Español', display_name: 'Español' },
      'Antiguo': { code: 'AG', name: 'Antiguo', display_name: 'Antiguo' },
    };

    const languageData = languageNameMap[hareruyaProduct.language] || languageNameMap['Inglés'];
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

    // Get or create condition based on condition string (e.g., "Near Mint")
    const conditionNameMap: Record<string, { code: string; name: string; display_name: string }> = {
      'Near Mint': { code: 'NM', name: 'Cerca de Mint', display_name: 'Cerca de Mint' },
      'Slightly Played': { code: 'SP', name: 'Ligeramente Jugada', display_name: 'Ligeramente Jugada' },
      'Moderately Played': { code: 'MP', name: 'Moderadamente Jugada', display_name: 'Moderadamente Jugada' },
      'Heavily Played': { code: 'HP', name: 'Muy Jugada', display_name: 'Muy Jugada' },
      'Damaged': { code: 'DM', name: 'Dañada', display_name: 'Dañada' },
      'Cerca de Mint': { code: 'NM', name: 'Cerca de Mint', display_name: 'Cerca de Mint' },
      'Ligeramente Jugada': { code: 'SP', name: 'Ligeramente Jugada', display_name: 'Ligeramente Jugada' },
      'Moderadamente Jugada': { code: 'MP', name: 'Moderadamente Jugada', display_name: 'Moderadamente Jugada' },
      'Muy Jugada': { code: 'HP', name: 'Muy Jugada', display_name: 'Muy Jugada' },
      'Dañada': { code: 'DM', name: 'Dañada', display_name: 'Dañada' },
    };

    const conditionData = conditionNameMap[hareruyaProduct.condition] || conditionNameMap['Near Mint'];
    let condition = await this.prisma.conditions.findUnique({
      where: { code: conditionData.code },
    });
    if (!condition) {
      condition = await this.prisma.conditions.create({
        data: {
          code: conditionData.code,
          name: conditionData.name,
          display_name: conditionData.display_name,
        },
      });
    }

    // Use finalPrice for the price (already in MXN)
    const price = hareruyaProduct.finalPrice || 0;

    // Create product with new schema structure
    try {
      const product = await this.prisma.singles.create({
        data: {
          name: hareruyaProduct.cardName,
          price: price,
          category_id: categoryId,
          condition_id: condition.id,
          language_id: language.id,
          owner_id: owner_id,
          // New schema fields (camelCase)
          borderless: hareruyaProduct.borderless,
          cardName: hareruyaProduct.cardName,
          cardNumber: hareruyaProduct.cardNumber,
          expansion: hareruyaProduct.expansion,
          extendedArt: hareruyaProduct.extendedArt,
          finalPrice: price,
          foil: hareruyaProduct.foil,
          hareruyaId: hareruyaProduct.hareruyaId,
          img: hareruyaProduct.img,
          isLocalInventory: hareruyaProduct.isLocalInventory,
          link: hareruyaProduct.link,
          metadata: hareruyaProduct.metadata || [],
          prerelease: hareruyaProduct.prerelease,
          premierPlay: hareruyaProduct.premierPlay,
          showImportacionBadge: hareruyaProduct.showImportacionBadge,
          source: hareruyaProduct.source || 'hareruya',
          stock: hareruyaProduct.stock || 0,
          surgeFoil: hareruyaProduct.surgeFoil,
          variant: hareruyaProduct.variant || null,
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

  async updateFromHareruya(productId: string, updateDto: CreateSingleDto) {
    const { hareruyaProduct } = updateDto;

    // Verify product exists
    const existing = await this.prisma.singles.findUnique({
      where: { id: productId },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Get or create language based on language string
    const languageNameMap: Record<string, { code: string; name: string; display_name: string }> = {
      'Inglés': { code: 'EN', name: 'Inglés', display_name: 'Inglés' },
      'Japonés': { code: 'JP', name: 'Japonés', display_name: 'Japonés' },
      'Chino Simplificado': { code: 'CS', name: 'Chino Simplificado', display_name: 'Chino Simplificado' },
      'Chino Tradicional': { code: 'CT', name: 'Chino Tradicional', display_name: 'Chino Tradicional' },
      'Francés': { code: 'FR', name: 'Francés', display_name: 'Francés' },
      'Alemán': { code: 'DE', name: 'Alemán', display_name: 'Alemán' },
      'Italiano': { code: 'IT', name: 'Italiano', display_name: 'Italiano' },
      'Coreano': { code: 'KO', name: 'Coreano', display_name: 'Coreano' },
      'Portugués': { code: 'PT', name: 'Portugués', display_name: 'Portugués' },
      'Ruso': { code: 'RU', name: 'Ruso', display_name: 'Ruso' },
      'Español': { code: 'ES', name: 'Español', display_name: 'Español' },
      'Antiguo': { code: 'AG', name: 'Antiguo', display_name: 'Antiguo' },
    };

    const languageData = languageNameMap[hareruyaProduct.language] || languageNameMap['Inglés'];
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

    // Get or create condition based on condition string
    const conditionNameMap: Record<string, { code: string; name: string; display_name: string }> = {
      'Near Mint': { code: 'NM', name: 'Cerca de Mint', display_name: 'Cerca de Mint' },
      'Slightly Played': { code: 'SP', name: 'Ligeramente Jugada', display_name: 'Ligeramente Jugada' },
      'Moderately Played': { code: 'MP', name: 'Moderadamente Jugada', display_name: 'Moderadamente Jugada' },
      'Heavily Played': { code: 'HP', name: 'Muy Jugada', display_name: 'Muy Jugada' },
      'Damaged': { code: 'DM', name: 'Dañada', display_name: 'Dañada' },
      'Cerca de Mint': { code: 'NM', name: 'Cerca de Mint', display_name: 'Cerca de Mint' },
      'Ligeramente Jugada': { code: 'SP', name: 'Ligeramente Jugada', display_name: 'Ligeramente Jugada' },
      'Moderadamente Jugada': { code: 'MP', name: 'Moderadamente Jugada', display_name: 'Moderadamente Jugada' },
      'Muy Jugada': { code: 'HP', name: 'Muy Jugada', display_name: 'Muy Jugada' },
      'Dañada': { code: 'DM', name: 'Dañada', display_name: 'Dañada' },
    };

    const conditionData = conditionNameMap[hareruyaProduct.condition] || conditionNameMap['Near Mint'];
    let condition = await this.prisma.conditions.findUnique({
      where: { code: conditionData.code },
    });
    if (!condition) {
      condition = await this.prisma.conditions.create({
        data: {
          code: conditionData.code,
          name: conditionData.name,
          display_name: conditionData.display_name,
        },
      });
    }

    // Use finalPrice for the price
    const price = hareruyaProduct.finalPrice || 0;

    // Update product with new schema structure
    const product = await this.prisma.singles.update({
      where: { id: productId },
      data: {
        name: hareruyaProduct.cardName,
        price: price,
        condition_id: condition.id,
        language_id: language.id,
        // Update new schema fields (camelCase)
        borderless: hareruyaProduct.borderless,
        cardName: hareruyaProduct.cardName,
        cardNumber: hareruyaProduct.cardNumber,
        expansion: hareruyaProduct.expansion,
        extendedArt: hareruyaProduct.extendedArt,
        finalPrice: price,
        foil: hareruyaProduct.foil,
        img: hareruyaProduct.img,
        isLocalInventory: hareruyaProduct.isLocalInventory,
        link: hareruyaProduct.link,
        metadata: hareruyaProduct.metadata || [],
        prerelease: hareruyaProduct.prerelease,
        premierPlay: hareruyaProduct.premierPlay,
        showImportacionBadge: hareruyaProduct.showImportacionBadge,
        source: hareruyaProduct.source || 'hareruya',
        stock: hareruyaProduct.stock || 0,
        surgeFoil: hareruyaProduct.surgeFoil,
        variant: hareruyaProduct.variant || null,
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
    const product = await this.prisma.singles.findUnique({
      where: { hareruyaId: hareruyaProductId },
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
      this.prisma.singles.findMany({
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
}

