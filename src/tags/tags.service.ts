import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateTagDto } from './dto/create-tag.dto.js';
import { UpdateTagDto } from './dto/update-tag.dto.js';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async create(createTagDto: CreateTagDto) {
    // Check if tag with same name already exists
    const existing = await this.prisma.tags.findUnique({
      where: { name: createTagDto.name },
    });

    if (existing) {
      throw new ConflictException('Tag with this name already exists');
    }

    return this.prisma.tags.create({
      data: {
        name: createTagDto.name,
        display_name: createTagDto.display_name || createTagDto.name,
        is_default: createTagDto.is_default ?? false,
        is_active: createTagDto.is_active ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.tags.findMany({
      orderBy: [
        { is_default: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findDefault() {
    return this.prisma.tags.findMany({
      where: { is_default: true, is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findActive() {
    return this.prisma.tags.findMany({
      where: { is_active: true },
      orderBy: [
        { is_default: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const tag = await this.prisma.tags.findUnique({
      where: { id },
      include: {
        singles: {
          select: {
            single_id: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return tag;
  }

  async findByName(name: string) {
    const tag = await this.prisma.tags.findUnique({
      where: { name },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with name ${name} not found`);
    }

    return tag;
  }

  async update(id: string, updateTagDto: UpdateTagDto) {
    // Check if tag exists
    const tag = await this.prisma.tags.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    // If name is being updated, check for conflicts
    if (updateTagDto.name && updateTagDto.name !== tag.name) {
      const existing = await this.prisma.tags.findUnique({
        where: { name: updateTagDto.name },
      });

      if (existing) {
        throw new ConflictException('Tag with this name already exists');
      }
    }

    return this.prisma.tags.update({
      where: { id },
      data: updateTagDto,
    });
  }

  async remove(id: string) {
    // Check if tag exists
    const tag = await this.prisma.tags.findUnique({
      where: { id },
      include: {
        singles: {
          select: {
            single_id: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    // Check if tag has associated singles
    if (tag.singles.length > 0) {
      throw new ConflictException(
        `Cannot delete tag with ID ${id} because it has ${tag.singles.length} associated singles`,
      );
    }

    return this.prisma.tags.delete({
      where: { id },
    });
  }
}

