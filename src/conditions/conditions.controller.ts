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
import { ConditionsService } from './conditions.service.js';
import { CreateConditionDto } from './dto/create-condition.dto.js';
import { UpdateConditionDto } from './dto/update-condition.dto.js';
import { Public } from '../auth/guards/jwt-auth.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiTags('conditions')
@Controller('conditions')
export class ConditionsController {
  constructor(private readonly conditionsService: ConditionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new condition (ADMIN, SELLER only)' })
  @ApiBody({ type: CreateConditionDto })
  @ApiResponse({
    status: 201,
    description: 'Condition created successfully',
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
    description: 'Condition with this code or name already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async create(@Body() createConditionDto: CreateConditionDto) {
    return this.conditionsService.create(createConditionDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all conditions' })
  @ApiResponse({
    status: 200,
    description: 'List of all conditions',
  })
  async findAll() {
    return this.conditionsService.findAll();
  }

  @Get('code/:code')
  @Public()
  @ApiOperation({ summary: 'Get a condition by code' })
  @ApiParam({
    name: 'code',
    description: 'Condition code (e.g., NM, SP, MP, HP, DM)',
    example: 'NM',
  })
  @ApiResponse({
    status: 200,
    description: 'Condition found',
  })
  @ApiResponse({
    status: 404,
    description: 'Condition not found',
  })
  async findByCode(@Param('code') code: string) {
    return this.conditionsService.findByCode(code);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a condition by ID' })
  @ApiParam({
    name: 'id',
    description: 'Condition ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Condition found',
  })
  @ApiResponse({
    status: 404,
    description: 'Condition not found',
  })
  async findOne(@Param('id') id: string) {
    return this.conditionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a condition (ADMIN, SELLER only)' })
  @ApiParam({
    name: 'id',
    description: 'Condition ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateConditionDto })
  @ApiResponse({
    status: 200,
    description: 'Condition updated successfully',
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
    description: 'Condition not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Condition with this code or name already exists',
  })
  async update(@Param('id') id: string, @Body() updateConditionDto: UpdateConditionDto) {
    return this.conditionsService.update(id, updateConditionDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a condition (ADMIN, SELLER only)' })
  @ApiParam({
    name: 'id',
    description: 'Condition ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Condition deleted successfully',
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
    description: 'Condition not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete condition with products assigned',
  })
  async remove(@Param('id') id: string) {
    return this.conditionsService.remove(id);
  }
}

