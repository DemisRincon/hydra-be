import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { OAuthSupabaseDto } from './dto/oauth-supabase.dto.js';
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
        avatar_url: userWithoutPassword.avatar_url || null,
        phone: userWithoutPassword.phone || null,
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
        avatar_url: userWithoutPassword.avatar_url || null,
        phone: userWithoutPassword.phone || null,
        role: {
          id: userWithoutPassword.roles.id,
          name: userWithoutPassword.roles.name,
          display_name: userWithoutPassword.roles.display_name,
        },
      },
    };
  }

  async oauthSupabase(oauthDto: OAuthSupabaseDto) {
    // Find existing user by email
    let user = await this.prisma.users.findUnique({
      where: { email: oauthDto.email },
      include: { roles: true },
    });

    const isNewUser = !user;

    if (user) {
      // User exists - link the OAuth account
      // Check if user is active
      if (!user.is_active) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Update user with OAuth info - prioritize Google data for existing users
      // Always update with Google data if provided (Google is the source of truth)
      const updateData: any = {};
      
      // Update first_name if Google provides it (even if user already has one, Google takes priority)
      if (oauthDto.firstName) {
        updateData.first_name = oauthDto.firstName;
      }

      // Update last_name if Google provides it
      if (oauthDto.lastName) {
        updateData.last_name = oauthDto.lastName;
      }

      // Always update avatar_url if provided (Google profile picture is always fresh)
      if (oauthDto.avatarUrl) {
        updateData.avatar_url = oauthDto.avatarUrl;
      }

      // Update if we have any changes
      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.users.update({
          where: { id: user.id },
          data: updateData,
          include: { roles: true },
        });
      }
    } else {
      // Create new user from OAuth
      // Get CLIENT role (default for OAuth signups)
      const clientRole = await this.prisma.roles.findUnique({
        where: { name: 'CLIENT' },
      });

      if (!clientRole) {
        throw new NotFoundException('CLIENT role not found');
      }

      // Generate username from email if not provided
      const baseUsername = oauthDto.email.split('@')[0];
      let username = baseUsername;
      let usernameExists = await this.prisma.users.findUnique({
        where: { username },
      });

      // If username exists, append numbers
      let counter = 1;
      while (usernameExists) {
        username = `${baseUsername}${counter}`;
        usernameExists = await this.prisma.users.findUnique({
          where: { username },
        });
        counter++;
      }

      // Create user
      user = await this.prisma.users.create({
        data: {
          email: oauthDto.email,
          username: username,
          password: null, // OAuth users don't have passwords
          role_id: clientRole.id,
          first_name: oauthDto.firstName || 'User',
          last_name: oauthDto.lastName || '',
          avatar_url: oauthDto.avatarUrl || null,
          is_active: true,
        },
        include: {
          roles: true,
        },
      });
    }

    // At this point, user is guaranteed to be non-null
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
        avatar_url: userWithoutPassword.avatar_url || null,
        phone: userWithoutPassword.phone || null,
        role: {
          id: userWithoutPassword.roles.id,
          name: userWithoutPassword.roles.name,
          display_name: userWithoutPassword.roles.display_name,
        },
      },
      isNewUser,
    };
  }
}

