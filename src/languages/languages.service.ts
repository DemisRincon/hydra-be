import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateLanguageDto } from './dto/create-language.dto.js';
import { UpdateLanguageDto } from './dto/update-language.dto.js';

@Injectable()
export class LanguagesService {
  constructor(private prisma: PrismaService) {}

  async create(createLanguageDto: CreateLanguageDto) {
    // Check if language with this code already exists
    const existingByCode = await this.prisma.languages.findUnique({
      where: { code: createLanguageDto.code },
    });

    if (existingByCode) {
      throw new ConflictException(
        `Language with code '${createLanguageDto.code}' already exists`,
      );
    }

    // Check if language with this name already exists
    const existingByName = await this.prisma.languages.findUnique({
      where: { name: createLanguageDto.name },
    });

    if (existingByName) {
      throw new ConflictException(
        `Language with name '${createLanguageDto.name}' already exists`,
      );
    }

    try {
      const language = await this.prisma.languages.create({
        data: {
          code: createLanguageDto.code,
          name: createLanguageDto.name,
          display_name: createLanguageDto.display_name,
        },
      });

      return language;
    } catch (error) {
      throw new BadRequestException('Failed to create language');
    }
  }

  async findAll() {
    return this.prisma.languages.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const language = await this.prisma.languages.findUnique({
      where: { id },
      include: {
        _count: {
          select: { singles: true },
        },
      },
    });

    if (!language) {
      throw new NotFoundException(`Language with ID ${id} not found`);
    }

    return language;
  }

  async findByCode(code: string) {
    const language = await this.prisma.languages.findUnique({
      where: { code },
      include: {
        _count: {
          select: { singles: true },
        },
      },
    });

    if (!language) {
      throw new NotFoundException(`Language with code '${code}' not found`);
    }

    return language;
  }

  async update(id: string, updateLanguageDto: UpdateLanguageDto) {
    // Check if language exists
    const language = await this.prisma.languages.findUnique({
      where: { id },
    });

    if (!language) {
      throw new NotFoundException(`Language with ID ${id} not found`);
    }

    // If code is being updated, check for conflicts
    if (updateLanguageDto.code && updateLanguageDto.code !== language.code) {
      const existingByCode = await this.prisma.languages.findUnique({
        where: { code: updateLanguageDto.code },
      });

      if (existingByCode) {
        throw new ConflictException(
          `Language with code '${updateLanguageDto.code}' already exists`,
        );
      }
    }

    // If name is being updated, check for conflicts
    if (updateLanguageDto.name && updateLanguageDto.name !== language.name) {
      const existingByName = await this.prisma.languages.findUnique({
        where: { name: updateLanguageDto.name },
      });

      if (existingByName) {
        throw new ConflictException(
          `Language with name '${updateLanguageDto.name}' already exists`,
        );
      }
    }

    try {
      const updatedLanguage = await this.prisma.languages.update({
        where: { id },
        data: {
          ...(updateLanguageDto.code && { code: updateLanguageDto.code }),
          ...(updateLanguageDto.name && { name: updateLanguageDto.name }),
          ...(updateLanguageDto.display_name && {
            display_name: updateLanguageDto.display_name,
          }),
        },
      });

      return updatedLanguage;
    } catch (error) {
      throw new BadRequestException('Failed to update language');
    }
  }

  async remove(id: string) {
    // Check if language exists
    const language = await this.prisma.languages.findUnique({
      where: { id },
      include: {
        _count: {
          select: { singles: true },
        },
      },
    });

    if (!language) {
      throw new NotFoundException(`Language with ID ${id} not found`);
    }

    // Check if language has products assigned
    if (language._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete language with ID ${id} because it has ${language._count.products} product(s) assigned to it`,
      );
    }

    try {
      await this.prisma.languages.delete({
        where: { id },
      });

      return { message: `Language with ID ${id} has been deleted successfully` };
    } catch (error) {
      throw new BadRequestException('Failed to delete language');
    }
  }
}

