import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateConditionDto } from './dto/create-condition.dto.js';
import { UpdateConditionDto } from './dto/update-condition.dto.js';

@Injectable()
export class ConditionsService {
  constructor(private prisma: PrismaService) {}

  async create(createConditionDto: CreateConditionDto) {
    // Check if condition with this code already exists
    const existingByCode = await this.prisma.conditions.findUnique({
      where: { code: createConditionDto.code },
    });

    if (existingByCode) {
      throw new ConflictException(
        `Condition with code '${createConditionDto.code}' already exists`,
      );
    }

    // Check if condition with this name already exists
    const existingByName = await this.prisma.conditions.findUnique({
      where: { name: createConditionDto.name },
    });

    if (existingByName) {
      throw new ConflictException(
        `Condition with name '${createConditionDto.name}' already exists`,
      );
    }

    try {
      const condition = await this.prisma.conditions.create({
        data: {
          code: createConditionDto.code,
          name: createConditionDto.name,
          display_name: createConditionDto.display_name,
        },
      });

      return condition;
    } catch (error) {
      throw new BadRequestException('Failed to create condition');
    }
  }

  async findAll() {
    return this.prisma.conditions.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const condition = await this.prisma.conditions.findUnique({
      where: { id },
    });

    if (!condition) {
      throw new NotFoundException(`Condition with ID ${id} not found`);
    }

    const singlesCount = await this.prisma.singles.count({
      where: { condition_id: id },
    });

    return {
      ...condition,
      _count: {
        singles: singlesCount,
      },
    };
  }

  async findByCode(code: string) {
    const condition = await this.prisma.conditions.findUnique({
      where: { code },
    });

    if (!condition) {
      throw new NotFoundException(`Condition with code '${code}' not found`);
    }

    const singlesCount = await this.prisma.singles.count({
      where: { condition_id: condition.id },
    });

    return {
      ...condition,
      _count: {
        singles: singlesCount,
      },
    };
  }

  async update(id: string, updateConditionDto: UpdateConditionDto) {
    // Check if condition exists
    const condition = await this.prisma.conditions.findUnique({
      where: { id },
    });

    if (!condition) {
      throw new NotFoundException(`Condition with ID ${id} not found`);
    }

    // If code is being updated, check for conflicts
    if (updateConditionDto.code && updateConditionDto.code !== condition.code) {
      const existingByCode = await this.prisma.conditions.findUnique({
        where: { code: updateConditionDto.code },
      });

      if (existingByCode) {
        throw new ConflictException(
          `Condition with code '${updateConditionDto.code}' already exists`,
        );
      }
    }

    // If name is being updated, check for conflicts
    if (updateConditionDto.name && updateConditionDto.name !== condition.name) {
      const existingByName = await this.prisma.conditions.findUnique({
        where: { name: updateConditionDto.name },
      });

      if (existingByName) {
        throw new ConflictException(
          `Condition with name '${updateConditionDto.name}' already exists`,
        );
      }
    }

    try {
      const updatedCondition = await this.prisma.conditions.update({
        where: { id },
        data: {
          ...(updateConditionDto.code && { code: updateConditionDto.code }),
          ...(updateConditionDto.name && { name: updateConditionDto.name }),
          ...(updateConditionDto.display_name && {
            display_name: updateConditionDto.display_name,
          }),
        },
      });

      return updatedCondition;
    } catch (error) {
      throw new BadRequestException('Failed to update condition');
    }
  }

  async remove(id: string) {
    // Check if condition exists
    const condition = await this.prisma.conditions.findUnique({
      where: { id },
    });

    if (!condition) {
      throw new NotFoundException(`Condition with ID ${id} not found`);
    }

    // Check if condition has products assigned
    const singlesCount = await this.prisma.singles.count({
      where: { condition_id: id },
    });

    if (singlesCount > 0) {
      throw new BadRequestException(
        `Cannot delete condition with ID ${id} because it has ${singlesCount} product(s) assigned to it`,
      );
    }

    try {
      await this.prisma.conditions.delete({
        where: { id },
      });

      return { message: `Condition with ID ${id} has been deleted successfully` };
    } catch (error) {
      throw new BadRequestException('Failed to delete condition');
    }
  }
}

