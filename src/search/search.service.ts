import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SearchHareruyaDto } from './dto/search-hareruya.dto.js';
import { HareruyaService } from '../hareruya/hareruya.service.js';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly hareruyaService: HareruyaService) {}

  /**
   * Search Hareruya API - Returns transformed data with MXN prices, language mapping, and metadata
   * Uses HareruyaService for data transformation
   */
  async searchHareruya(searchDto: SearchHareruyaDto) {
    try {
      this.logger.log(
        `Searching Hareruya for: ${searchDto.kw}, page: ${searchDto.page || 1}`,
      );

      // Use the transformed search from HareruyaService
      const result = await this.hareruyaService.searchCards({
        query: searchDto.kw,
        page: searchDto.page || 1,
        rows: searchDto.rows,
        priceFilter: searchDto.priceFilter,
      });

      this.logger.log(`Found ${result.data.length} transformed results`);

      // Return transformed data in the same format as /cards endpoint
      return result;
    } catch (error) {
      this.logger.error('Error searching Hareruya API:', error);
      throw new BadRequestException(
        `Failed to search Hareruya API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
