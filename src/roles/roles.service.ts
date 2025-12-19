import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    // Check if role with this name already exists
    const existingRole = await this.prisma.roles.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException(
        `Role with name '${createRoleDto.name}' already exists`,
      );
    }

    try {
      const role = await this.prisma.roles.create({
        data: {
          name: createRoleDto.name,
          display_name: createRoleDto.display_name,
        },
      });

      return role;
    } catch (error) {
      throw new BadRequestException('Failed to create role');
    }
  }

  async findAll() {
    return this.prisma.roles.findMany({
      orderBy: { display_name: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.roles.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    // Check if role exists
    const role = await this.prisma.roles.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // If name is being updated, check for conflicts
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.prisma.roles.findUnique({
        where: { name: updateRoleDto.name },
      });

      if (existingRole) {
        throw new ConflictException(
          `Role with name '${updateRoleDto.name}' already exists`,
        );
      }
    }

    try {
      const updatedRole = await this.prisma.roles.update({
        where: { id },
        data: {
          ...(updateRoleDto.name && { name: updateRoleDto.name }),
          ...(updateRoleDto.display_name && {
            display_name: updateRoleDto.display_name,
          }),
        },
      });

      return updatedRole;
    } catch (error) {
      throw new BadRequestException('Failed to update role');
    }
  }

  async remove(id: string) {
    // Check if role exists
    const role = await this.prisma.roles.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Check if role has users assigned
    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role with ID ${id} because it has ${role._count.users} user(s) assigned to it`,
      );
    }

    try {
      await this.prisma.roles.delete({
        where: { id },
      });

      return { message: `Role with ID ${id} has been deleted successfully` };
    } catch (error) {
      throw new BadRequestException('Failed to delete role');
    }
  }
}

