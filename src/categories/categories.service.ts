import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { listing_status_enum } from '../generated/prisma/enums.js';
import { PrismaClient, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

type PrismaWithSingles = PrismaClient & {
  singles: {
    count: (args?: { where?: { category_id: string } }) => Promise<number>;
  };
};

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const existing = await this.prisma.categories.findUnique({
      where: { name: createCategoryDto.name },
    });

    if (existing) {
      throw new ConflictException('Category with this name already exists');
    }

    return this.prisma.categories.create({
      data: createCategoryDto,
    });
  }

  async findAll() {
    return this.prisma.categories.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async findActive() {
    return this.prisma.categories.findMany({
      where: { is_active: true } as Prisma.categoriesWhereInput,
      orderBy: { order: 'asc' },
    });
  }

  async findWithProducts() {
    const categoriesWithListings = await this.prisma.categories.findMany({
      where: {
        is_active: true,
        singles: {
          some: {
            listings: {
              some: {
                status: listing_status_enum.ACTIVE,
              },
            },
          },
        },
      } as Prisma.categoriesWhereInput,
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        display_name: true,
        order: true,
      } as Prisma.categoriesSelect,
    });

    if (categoriesWithListings.length > 0) {
      return categoriesWithListings;
    }

    const categoriesWithSingles = await this.prisma.categories.findMany({
      where: {
        is_active: true,
        singles: {
          some: {},
        },
      } as Prisma.categoriesWhereInput,
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        display_name: true,
        order: true,
      } as Prisma.categoriesSelect,
    });

    return categoriesWithSingles;
  }

  async findOne(id: string) {
    const [category, singlesCount] = await Promise.all([
      this.prisma.categories.findUnique({
        where: { id },
      }),
      (this.prisma as unknown as PrismaWithSingles).singles.count({
        where: { category_id: id },
      }),
    ]);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return {
      ...category,
      _count: {
        singles: singlesCount,
      },
    };
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.categories.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existing = await this.prisma.categories.findUnique({
        where: { name: updateCategoryDto.name },
      });

      if (existing) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    return this.prisma.categories.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string) {
    const category = await this.prisma.categories.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const singlesCount = await (
      this.prisma as unknown as PrismaWithSingles
    ).singles.count({
      where: { category_id: id },
    });

    if (singlesCount > 0) {
      throw new ConflictException(
        `Cannot delete category with ID ${id} because it has ${singlesCount} associated singles`,
      );
    }

    return this.prisma.categories.delete({
      where: { id },
    });
  }
}
