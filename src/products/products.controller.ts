import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { CreateSingleDto } from './dto/create-single.dto.js';
import { CreateBulkSinglesDto } from './dto/create-bulk-singles.dto.js';
import { Public } from '../auth/guards/jwt-auth.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiTags('singles')
@Controller('singles')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create single product from Hareruya data (ADMIN, SELLER only)' })
  @ApiBody({ type: CreateSingleDto })
  @ApiResponse({
    status: 201,
    description: 'Single product created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid product data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Seller role required' })
  @ApiResponse({ status: 404, description: 'Owner user, category, condition, or language not found' })
  @ApiResponse({ status: 409, description: 'Product already exists' })
  async create(@Body() createDto: CreateSingleDto) {
    return this.productsService.create(createDto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create multiple single products at once (ADMIN, SELLER only)' })
  @ApiBody({ type: CreateBulkSinglesDto })
  @ApiResponse({
    status: 201,
    description: 'Products created successfully (some may have failed)',
  })
  @ApiResponse({ status: 400, description: 'Invalid product data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Seller role required' })
  async createBulk(@Body() bulkDto: CreateBulkSinglesDto) {
    return this.productsService.createBulk(bulkDto.products);
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

  @Get('local')
  @Public()
  @ApiOperation({ summary: 'Get all local inventory singles with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Local singles retrieved successfully',
  })
  async findLocal(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
  ) {
    return this.productsService.findLocal(page, limit);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search singles by name (case-insensitive)' })
  @ApiQuery({ name: 'name', required: true, description: 'Card name to search for' })
  @ApiResponse({
    status: 200,
    description: 'Singles found',
  })
  async findByName(@Query('name') name: string) {
    return this.productsService.findByName(name);
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

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Product found',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a single product (ADMIN, SELLER only)' })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Seller role required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

