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
import { TagsService } from './tags.service.js';
import { CreateTagDto } from './dto/create-tag.dto.js';
import { UpdateTagDto } from './dto/update-tag.dto.js';
import { Public } from '../auth/guards/jwt-auth.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tag (ADMIN, SELLER only)' })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({
    status: 201,
    description: 'Tag created successfully',
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
    description: 'Tag with this name already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({
    status: 200,
    description: 'List of all tags',
  })
  async findAll() {
    return this.tagsService.findAll();
  }

  @Get('default')
  @Public()
  @ApiOperation({ summary: 'Get all default tags (for forms)' })
  @ApiResponse({
    status: 200,
    description: 'List of default tags',
  })
  async findDefault() {
    return this.tagsService.findDefault();
  }

  @Get('active')
  @Public()
  @ApiOperation({ summary: 'Get all active tags' })
  @ApiResponse({
    status: 200,
    description: 'List of active tags',
  })
  async findActive() {
    return this.tagsService.findActive();
  }

  @Get('name/:name')
  @Public()
  @ApiOperation({ summary: 'Get a tag by name' })
  @ApiParam({
    name: 'name',
    description: 'Tag name',
    example: 'Commander Personal',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag found',
  })
  @ApiResponse({
    status: 404,
    description: 'Tag not found',
  })
  async findByName(@Param('name') name: string) {
    return this.tagsService.findByName(name);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a tag by ID' })
  @ApiParam({
    name: 'id',
    description: 'Tag ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag found',
  })
  @ApiResponse({
    status: 404,
    description: 'Tag not found',
  })
  async findOne(@Param('id') id: string) {
    return this.tagsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a tag (ADMIN, SELLER only)' })
  @ApiParam({
    name: 'id',
    description: 'Tag ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateTagDto })
  @ApiResponse({
    status: 200,
    description: 'Tag updated successfully',
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
    description: 'Tag not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Tag with this name already exists',
  })
  async update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a tag (ADMIN, SELLER only)' })
  @ApiParam({
    name: 'id',
    description: 'Tag ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag deleted successfully',
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
    description: 'Tag not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete tag with products assigned',
  })
  async remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}

