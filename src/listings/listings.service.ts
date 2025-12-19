import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';
import { UserWithRole } from '../users/interfaces/user.interface.js';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async create(createListingDto: CreateListingDto, user: UserWithRole) {
    // Verify user has permission (SELLER or ADMIN)
    if (user.role.name !== 'SELLER' && user.role.name !== 'ADMIN') {
      throw new ForbiddenException('Only sellers and admins can create listings');
    }

    // Verify product exists
    const product = await this.prisma.products.findUnique({
      where: { id: createListingDto.product_id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    try {
      const listing = await this.prisma.listings.create({
        data: {
          user_id: user.id,
          product_id: createListingDto.product_id,
          status: createListingDto.status || 'ACTIVE',
        },
        include: {
          products: true,
          users: {
            include: {
              roles: true,
            },
          },
        },
      });

      // Remove password from user if present
      const { password, ...userWithoutPassword } = listing.users as any;
      return {
        ...listing,
        users: userWithoutPassword,
      };
    } catch (error) {
      throw new BadRequestException('Failed to create listing');
    }
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      this.prisma.listings.findMany({
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          products: {
            include: {
              categories: true,
              conditions: true,
              languages: true,
              rarities: true,
            },
          },
          users: {
            include: {
              roles: true,
            },
            select: {
              id: true,
              email: true,
              username: true,
              first_name: true,
              last_name: true,
              is_active: true,
              roles: true,
            },
          },
        },
      }),
      this.prisma.listings.count(),
    ]);

    return {
      data: listings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listings.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            categories: true,
            conditions: true,
            languages: true,
            rarities: true,
          },
        },
        users: {
          include: {
            roles: true,
          },
          select: {
            id: true,
            email: true,
            username: true,
            first_name: true,
            last_name: true,
            is_active: true,
            roles: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    return listing;
  }

  async update(id: string, updateListingDto: UpdateListingDto, user: UserWithRole) {
    // Verify user has permission (SELLER or ADMIN)
    if (user.role.name !== 'SELLER' && user.role.name !== 'ADMIN') {
      throw new ForbiddenException('Only sellers and admins can update listings');
    }

    // Check if listing exists
    const listing = await this.prisma.listings.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    // Both SELLER and ADMIN can update any listing's status
    try {
      const updatedListing = await this.prisma.listings.update({
        where: { id },
        data: {
          ...(updateListingDto.status && { status: updateListingDto.status }),
        },
        include: {
          products: {
            include: {
              categories: true,
              conditions: true,
              languages: true,
              rarities: true,
            },
          },
          users: {
            include: {
              roles: true,
            },
            select: {
              id: true,
              email: true,
              username: true,
              first_name: true,
              last_name: true,
              is_active: true,
              roles: true,
            },
          },
        },
      });

      return updatedListing;
    } catch (error) {
      throw new BadRequestException('Failed to update listing');
    }
  }

  async remove(id: string, user: UserWithRole) {
    // Verify user has permission (SELLER or ADMIN)
    if (user.role.name !== 'SELLER' && user.role.name !== 'ADMIN') {
      throw new ForbiddenException('Only sellers and admins can delete listings');
    }

    // Check if listing exists
    const listing = await this.prisma.listings.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    // Both SELLER and ADMIN can delete any listing
    try {
      await this.prisma.listings.delete({
        where: { id },
      });

      return { message: `Listing with ID ${id} has been deleted successfully` };
    } catch (error) {
      throw new BadRequestException('Failed to delete listing');
    }
  }

  async findByUser(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      this.prisma.listings.findMany({
        where: { user_id: userId },
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          products: {
            include: {
              categories: true,
              conditions: true,
              languages: true,
              rarities: true,
            },
          },
        },
      }),
      this.prisma.listings.count({
        where: { user_id: userId },
      }),
    ]);

    return {
      data: listings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

