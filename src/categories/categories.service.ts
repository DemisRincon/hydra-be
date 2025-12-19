import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    // Check if category with same name already exists
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
      where: { is_active: true },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.categories.findUnique({
      where: { id },
      include: {
        singles: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    // Check if category exists
    const category = await this.prisma.categories.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // If name is being updated, check for conflicts
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
    // Check if category exists
    const category = await this.prisma.categories.findUnique({
      where: { id },
      include: {
        singles: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has associated singles
    if (category.singles.length > 0) {
      throw new ConflictException(
        `Cannot delete category with ID ${id} because it has ${category.singles.length} associated singles`,
      );
    }

    return this.prisma.categories.delete({
      where: { id },
    });
  }
}

