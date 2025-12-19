import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { SignupDto } from './dto/signup.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
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

  async findById(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      include: {
        roles: true,
      },
    });

    if (!user) {
      return null;
    }

    // Return user in format expected by JWT strategy
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      role: {
        id: user.roles.id,
        name: user.roles.name,
        display_name: user.roles.display_name,
      },
    };
  }

  async signup(signupDto: SignupDto) {
    // Check if email already exists
    const existingUserByEmail = await this.prisma.users.findUnique({
      where: { email: signupDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if username already exists
    const existingUserByUsername = await this.prisma.users.findUnique({
      where: { username: signupDto.username },
    });

    if (existingUserByUsername) {
      throw new ConflictException('Username already exists');
    }

    // Find CLIENT role
    const clientRole = await this.prisma.roles.findFirst({
      where: { name: 'CLIENT' },
    });

    if (!clientRole) {
      throw new NotFoundException('CLIENT role not found. Please seed the database.');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(signupDto.password, saltRounds);

    // Create user with CLIENT role
    try {
      const user = await this.prisma.users.create({
        data: {
          email: signupDto.email,
          username: signupDto.username,
          password: hashedPassword,
          role_id: clientRole.id,
          first_name: signupDto.first_name,
          last_name: signupDto.last_name,
          is_active: true, // New signups are active by default
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

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Check if user exists
    const user = await this.prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // If email is being updated, check for conflicts
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUserByEmail = await this.prisma.users.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUserByEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // If username is being updated, check for conflicts
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUserByUsername = await this.prisma.users.findUnique({
        where: { username: updateUserDto.username },
      });

      if (existingUserByUsername) {
        throw new ConflictException('Username already exists');
      }
    }

    // If role is being updated, verify it exists
    if (updateUserDto.role_id) {
      const role = await this.prisma.roles.findUnique({
        where: { id: updateUserDto.role_id },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }
    }

    try {
      const updatedUser = await this.prisma.users.update({
        where: { id },
        data: {
          ...(updateUserDto.email && { email: updateUserDto.email }),
          ...(updateUserDto.username && { username: updateUserDto.username }),
          ...(updateUserDto.role_id && { role_id: updateUserDto.role_id }),
          ...(updateUserDto.first_name !== undefined && {
            first_name: updateUserDto.first_name,
          }),
          ...(updateUserDto.last_name !== undefined && {
            last_name: updateUserDto.last_name,
          }),
          ...(updateUserDto.is_active !== undefined && {
            is_active: updateUserDto.is_active,
          }),
        },
        include: {
          roles: true,
        },
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      throw new BadRequestException('Failed to update user');
    }
  }

  async remove(id: string) {
    // Check if user exists
    const user = await this.prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    try {
      await this.prisma.users.delete({
        where: { id },
      });

      return { message: `User with ID ${id} has been deleted successfully` };
    } catch (error) {
      // Handle foreign key constraint errors
      if (error.code === 'P2003') {
        throw new BadRequestException(
          `Cannot delete user with ID ${id} because they have related records (orders, listings, etc.)`,
        );
      }
      throw new BadRequestException('Failed to delete user');
    }
  }

  async resetPassword(id: string, resetPasswordDto: ResetPasswordDto) {
    // Check if user exists
    const user = await this.prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, saltRounds);

    try {
      const updatedUser = await this.prisma.users.update({
        where: { id },
        data: {
          password: hashedPassword,
        },
        include: {
          roles: true,
        },
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      return {
        message: `Password has been reset successfully for user with ID ${id}`,
        user: userWithoutPassword,
      };
    } catch (error) {
      throw new BadRequestException('Failed to reset password');
    }
  }

  async updateProfile(userId: string, updateProfileDto: { first_name?: string; last_name?: string }) {
    // Check if user exists
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    try {
      const updatedUser = await this.prisma.users.update({
        where: { id: userId },
        data: {
          ...(updateProfileDto.first_name !== undefined && {
            first_name: updateProfileDto.first_name,
          }),
          ...(updateProfileDto.last_name !== undefined && {
            last_name: updateProfileDto.last_name,
          }),
        },
        include: {
          roles: true,
        },
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      throw new BadRequestException('Failed to update profile');
    }
  }
}

