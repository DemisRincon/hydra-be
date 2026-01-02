import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LanguagesService } from './languages.service.js';
import { CreateLanguageDto } from './dto/create-language.dto.js';
import { UpdateLanguageDto } from './dto/update-language.dto.js';
import { Public } from '../auth/guards/jwt-auth.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiTags('languages')
@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new language (ADMIN, SELLER only)' })
  @ApiBody({ type: CreateLanguageDto })
  @ApiResponse({
    status: 201,
    description: 'Language created successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Seller role required',
  })
  @ApiResponse({
    status: 409,
    description: 'Language with this code or name already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async create(@Body() createLanguageDto: CreateLanguageDto) {
    return this.languagesService.create(createLanguageDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all languages' })
  @ApiResponse({
    status: 200,
    description: 'List of all languages',
  })
  async findAll() {
    return this.languagesService.findAll();
  }

  @Get('active')
  @Public()
  @ApiOperation({ summary: 'Get all active languages' })
  @ApiResponse({
    status: 200,
    description: 'List of all active languages',
  })
  async findActive() {
    return this.languagesService.findAll();
  }

  @Get('code/:code')
  @Public()
  @ApiOperation({ summary: 'Get a language by code' })
  @ApiParam({
    name: 'code',
    description: 'Language code (e.g., EN, JP, ES)',
    example: 'EN',
  })
  @ApiResponse({
    status: 200,
    description: 'Language found',
  })
  @ApiResponse({
    status: 404,
    description: 'Language not found',
  })
  async findByCode(@Param('code') code: string) {
    return this.languagesService.findByCode(code);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a language by ID' })
  @ApiParam({
    name: 'id',
    description: 'Language ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Language found',
  })
  @ApiResponse({
    status: 404,
    description: 'Language not found',
  })
  async findOne(@Param('id') id: string) {
    return this.languagesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a language (ADMIN, SELLER only)' })
  @ApiParam({
    name: 'id',
    description: 'Language ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateLanguageDto })
  @ApiResponse({
    status: 200,
    description: 'Language updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Seller role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Language not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Language with this code or name already exists',
  })
  async update(@Param('id') id: string, @Body() updateLanguageDto: UpdateLanguageDto) {
    return this.languagesService.update(id, updateLanguageDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a language (ADMIN, SELLER only)' })
  @ApiParam({
    name: 'id',
    description: 'Language ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Language deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Seller role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Language not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete language with products assigned',
  })
  async remove(@Param('id') id: string) {
    return this.languagesService.remove(id);
  }
}

