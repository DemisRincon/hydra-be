import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // Check if email already exists
    const existingUserByEmail = await this.prisma.users.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if username already exists
    const existingUserByUsername = await this.prisma.users.findUnique({
      where: { username: createUserDto.username },
    });

    if (existingUserByUsername) {
      throw new ConflictException('Username already exists');
    }

    // Verify role exists
    const role = await this.prisma.roles.findUnique({
      where: { id: createUserDto.role_id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Hash password if provided
    let hashedPassword: string | null = null;
    if (createUserDto.password) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);
    }

    // Create user
    try {
      const user = await this.prisma.users.create({
        data: {
          email: createUserDto.email,
          username: createUserDto.username,
          password: hashedPassword,
          role_id: createUserDto.role_id,
          first_name: createUserDto.first_name,
          last_name: createUserDto.last_name,
          is_active: createUserDto.is_active ?? true,
        },
        include: {
          roles: true,
        },
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw new BadRequestException('Failed to create user');
    }
  }

  async findAll() {
    const users = await this.prisma.users.findMany({
      include: {
        roles: true,
      },
    });

    // Remove passwords from response
    return users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
  }

  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      include: {
        roles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

