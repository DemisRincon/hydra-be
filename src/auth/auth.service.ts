import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.prisma.users.findUnique({
      where: { email: loginDto.email },
      include: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Check if user has a password
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.roles.name,
    };

    const accessToken = this.jwtService.sign(payload);

    // Remove password from user object
    const { password, ...userWithoutPassword } = user;

    return {
      accessToken,
      user: {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        username: userWithoutPassword.username,
        first_name: userWithoutPassword.first_name,
        last_name: userWithoutPassword.last_name,
        role: {
          id: userWithoutPassword.roles.id,
          name: userWithoutPassword.roles.name,
          display_name: userWithoutPassword.roles.display_name,
        },
      },
    };
  }

  async adminLogin(adminLoginDto: AdminLoginDto) {
    // Find user by email
    const user = await this.prisma.users.findUnique({
      where: { email: adminLoginDto.email },
      include: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Check if user has required role (ADMIN or SELLER)
    if (user.roles.name !== 'ADMIN' && user.roles.name !== 'SELLER') {
      throw new ForbiddenException('Access denied. Admin or Seller role required.');
    }

    // Check if user has a password
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      adminLoginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.roles.name,
    };

    const accessToken = this.jwtService.sign(payload);

    // Remove password from user object
    const { password, ...userWithoutPassword } = user;

    return {
      accessToken,
      user: {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        username: userWithoutPassword.username,
        first_name: userWithoutPassword.first_name,
        last_name: userWithoutPassword.last_name,
        role: {
          id: userWithoutPassword.roles.id,
          name: userWithoutPassword.roles.name,
          display_name: userWithoutPassword.roles.display_name,
        },
      },
    };
  }
}

