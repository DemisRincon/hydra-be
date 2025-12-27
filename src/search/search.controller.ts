import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { SearchService } from './search.service.js';
import { SearchHareruyaDto } from './dto/search-hareruya.dto.js';
import { HareruyaPricingDto } from '../hareruya/dto/hareruya-pricing.dto.js';
import { HareruyaService } from '../hareruya/hareruya.service.js';
import { Public } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly hareruyaService: HareruyaService,
  ) {}

  @Get('hareruya')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search Hareruya MTG API for cards',
    description:
      'Returns transformed search results with MXN prices, language mapping, foil status, card numbers, and metadata extraction',
  })
  @ApiQuery({
    name: 'kw',
    required: true,
    description: 'Search keyword (card name)',
  })
  @ApiQuery({
    name: 'rows',
    required: false,
    description: 'Number of results per page (default: 60)',
    type: Number,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'fq.price',
    required: false,
    description: 'Price filter (default: "1~*")',
    example: '1~*',
  })
  @ApiResponse({
    status: 200,
    description: 'Transformed search results with MXN prices and metadata',
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  async searchHareruya(
    @Query('kw') kw: string,
    @Query('rows') rows?: number,
    @Query('page') page?: number,
    @Query('fq.price') priceFilter?: string,
  ) {
    if (!kw || kw.trim() === '') {
      throw new BadRequestException('Keyword (kw) is required');
    }

    const searchDto: SearchHareruyaDto = {
      kw: kw.trim(),
      rows: rows ? Number(rows) : 12,
      page: page ? Number(page) : 1,
      priceFilter,
    };
    return this.searchService.searchHareruya(searchDto);
  }

  @Post('hareruya/pricing')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Hareruya pricing for multiple products',
    description:
      'Fetches pricing for multiple Hareruya products with variant matching (language and foil status)',
  })
  @ApiBody({ type: HareruyaPricingDto })
  @ApiResponse({
    status: 200,
    description: 'Pricing results from Hareruya API',
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async getHareruyaPricing(@Body() dto: HareruyaPricingDto) {
    return this.hareruyaService.getHareruyaPricing({
      productIds: dto.productIds,
      cardNames: dto.cardNames,
    });
  }

  @Get('autocomplete')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get card name autocomplete suggestions from Scryfall',
    description:
      'Returns card name suggestions using Scryfall API autocomplete endpoint',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'Search query (minimum 2 characters)',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of card name suggestions',
    type: [String],
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameter' })
  async autocomplete(@Query('query') query: string): Promise<string[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const suggestions = await this.searchService.autocomplete(query.trim());
    return suggestions;
  }

  @Get('hybrid')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hybrid search: Search both Hareruya API and local database',
    description:
      'Searches Hareruya API and local database, synchronizes prices when matches are found (by hareruyaId, foil, and language), applies condition discounts to local products, and returns combined results with pagination',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query (card name)',
    example: 'Lightning Bolt',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results per page (default: 12)',
    type: Number,
    example: 12,
  })
  @ApiResponse({
    status: 200,
    description:
      'Combined search results from Hareruya and local database with pagination',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
        localCount: { type: 'number' },
        hareruyaCount: { type: 'number' },
        updatedPrices: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameter' })
  async searchHybrid(
    @Query('q') q: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!q || q.trim() === '') {
      throw new BadRequestException('Query parameter (q) is required');
    }

    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 12;

    if (pageNum < 1) {
      throw new BadRequestException('Page must be at least 1');
    }

    if (limitNum < 1) {
      throw new BadRequestException('Limit must be at least 1');
    }

    return this.searchService.searchHybrid(q.trim(), pageNum, limitNum);
  }

  @Get('local')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Local search: Search only local database',
    description:
      'Searches only local database, applies condition discounts to local products, and returns results. If no query is provided, returns the latest added items. Pagination is optional and only returned if enabled via the paginate parameter.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query (card name). If not provided, returns latest added items',
    example: 'Lightning Bolt',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1, only used if pagination is enabled)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results per page (default: 12)',
    type: Number,
    example: 12,
  })
  @ApiQuery({
    name: 'paginate',
    required: false,
    description: 'Enable pagination (default: false). If true, returns pagination object',
    type: Boolean,
    example: false,
  })
  @ApiQuery({
    name: 'metadata',
    required: false,
    description: 'Filter by metadata (e.g., "commander")',
    type: String,
    example: 'commander',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category name (e.g., "singles")',
    type: String,
    example: 'singles',
  })
  @ApiResponse({
    status: 200,
    description:
      'Local search results. Pagination object is only included if paginate=true',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
        localCount: { type: 'number' },
      },
      required: ['success', 'data', 'localCount'],
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameter' })
  async searchLocal(
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('paginate') paginate?: string,
    @Query('metadata') metadata?: string,
    @Query('category') category?: string,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 12;
    const enablePagination = paginate === 'true' || paginate === '1';
    const metadataFilter = metadata ? metadata.trim() : undefined;
    const categoryFilter = category ? category.trim() : undefined;

    if (pageNum < 1) {
      throw new BadRequestException('Page must be at least 1');
    }

    if (limitNum < 1) {
      throw new BadRequestException('Limit must be at least 1');
    }

    const query = q ? q.trim() : null;
    return this.searchService.searchLocal(query, pageNum, limitNum, enablePagination, metadataFilter, categoryFilter);
  }
}
