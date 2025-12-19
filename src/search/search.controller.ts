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
  @ApiQuery({ name: 'kw', required: true, description: 'Search keyword (card name)' })
  @ApiQuery({ name: 'rows', required: false, description: 'Number of results per page (default: 60)', type: Number })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)', type: Number })
  @ApiQuery({ name: 'fq.price', required: false, description: 'Price filter (default: "1~*")', example: '1~*' })
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
}

