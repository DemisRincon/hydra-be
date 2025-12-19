import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service.js';
import { SearchHareruyaDto } from './dto/search-hareruya.dto.js';
import { Public } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('hareruya')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search Hareruya MTG API for cards' })
  @ApiQuery({ name: 'kw', required: true, description: 'Search keyword (card name)' })
  @ApiQuery({ name: 'rows', required: false, description: 'Number of results per page', type: Number })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'fq.price', required: false, description: 'Price filter (e.g., "1~*")' })
  @ApiResponse({
    status: 200,
    description: 'Search results from Hareruya API',
    schema: {
      type: 'object',
      properties: {
        responseHeader: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            QTime: { type: 'string' },
            reqID: { type: 'string' },
          },
        },
        response: {
          type: 'object',
          properties: {
            numFound: { type: 'number' },
            docs: {
              type: 'array',
              items: { type: 'object' },
            },
            page: { type: 'number' },
          },
        },
      },
    },
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
}

