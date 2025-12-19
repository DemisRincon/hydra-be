import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SearchHareruyaDto } from './dto/search-hareruya.dto.js';
import { HareruyaService } from '../hareruya/hareruya.service.js';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly scryfallBaseUrl = 'https://api.scryfall.com';

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

  /**
   * Autocomplete card names using Scryfall API
   * Returns array of card name suggestions
   */
  async autocomplete(query: string): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const url = `${this.scryfallBaseUrl}/cards/autocomplete?q=${encodeURIComponent(query)}`;
      this.logger.debug(`Scryfall autocomplete query: ${query}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Hydra-BE/1.0',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Scryfall API error: ${response.status}`);
      }

      const data = (await response.json()) as { data?: string[] };
      // Scryfall returns { data: ["Card Name 1", "Card Name 2", ...] }
      return data.data || [];
    } catch (error) {
      this.logger.error(
        `Error fetching autocomplete from Scryfall: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }
}
