import { Injectable, BadRequestException } from '@nestjs/common';
import { SearchHareruyaDto } from './dto/search-hareruya.dto.js';

const HARERUYA_API_BASE_URL = 'https://www.hareruyamtg.com/en/products/search/unisearch_api';

@Injectable()
export class SearchService {
  async searchHareruya(searchDto: SearchHareruyaDto) {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('kw', searchDto.kw);
      
      if (searchDto.rows) {
        params.append('rows', searchDto.rows.toString());
      }
      
      if (searchDto.page) {
        params.append('page', searchDto.page.toString());
      }
      
      if (searchDto.priceFilter) {
        params.append('fq.price', searchDto.priceFilter);
      }

      // Make request to Hareruya API
      const url = `${HARERUYA_API_BASE_URL}?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Hydra-BE/1.0',
        },
      });

      if (!response.ok) {
        throw new BadRequestException(
          `Hareruya API returned status ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        `Failed to search Hareruya API: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

