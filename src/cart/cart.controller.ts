import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  HttpException,
  HttpStatus as NestHttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserWithRole } from '../users/interfaces/user.interface.js';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(private readonly cartService: CartService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved successfully',
  })
  async getCart(@CurrentUser() user: UserWithRole) {
    try {
      this.logger.log(`Getting cart for user ${user.id}`);
      const items = await this.cartService.getCart(user.id);
      this.logger.log(
        `Successfully retrieved cart with ${items.length} items for user ${user.id}`,
      );
      return {
        success: true,
        data: items,
      };
    } catch (error) {
      this.logger.error(`Error getting cart for user ${user.id}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: 'Internal server error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        NestHttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({
    status: 201,
    description: 'Item added to cart successfully',
  })
  async addItem(
    @CurrentUser() user: UserWithRole,
    @Body() addItemDto: AddCartItemDto,
  ) {
    const item = await this.cartService.addItem(user.id, addItemDto);
    return {
      success: true,
      data: item,
    };
  }

  @Put('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({
    status: 200,
    description: 'Cart item updated successfully',
  })
  async updateItem(
    @CurrentUser() user: UserWithRole,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateCartItemDto,
  ) {
    const item = await this.cartService.updateItem(user.id, itemId, updateDto);
    return {
      success: true,
      data: item,
    };
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({
    status: 200,
    description: 'Item removed from cart successfully',
  })
  async removeItem(
    @CurrentUser() user: UserWithRole,
    @Param('itemId') itemId: string,
  ) {
    const result = await this.cartService.removeItem(user.id, itemId);
    return result;
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
  })
  async clearCart(@CurrentUser() user: UserWithRole) {
    const result = await this.cartService.clearCart(user.id);
    return result;
  }
}
