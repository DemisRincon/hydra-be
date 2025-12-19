import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { CreateProductFromHareruyaDto } from './dto/create-product-from-hareruya.dto.js';
import { Public } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('hareruya')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update product from Hareruya data' })
  @ApiBody({ type: CreateProductFromHareruyaDto })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid product data' })
  @ApiResponse({ status: 404, description: 'Owner user not found' })
  @ApiResponse({ status: 409, description: 'Product already exists' })
  async createFromHareruya(@Body() createDto: CreateProductFromHareruyaDto) {
    return this.productsService.createFromHareruya(createDto);
  }

  @Get('hareruya/:hareruyaId')
  @Public()
  @ApiOperation({ summary: 'Find product by Hareruya product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product found',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findByHareruyaId(@Param('hareruyaId') hareruyaId: string) {
    return this.productsService.findByHareruyaId(hareruyaId);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all products with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.productsService.findAll(page, limit);
  }

  @Get('owner/:ownerId')
  @Public()
  @ApiOperation({ summary: 'Get all products owned by a specific user' })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Owner not found' })
  async findByOwner(
    @Param('ownerId') ownerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.productsService.findByOwner(ownerId, page, limit);
  }
}

