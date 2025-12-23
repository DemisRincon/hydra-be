import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SearchHareruyaDto } from './dto/search-hareruya.dto.js';
import { HareruyaService } from '../hareruya/hareruya.service.js';
import { ProductsService } from '../products/products.service.js';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly scryfallBaseUrl = 'https://api.scryfall.com';

  constructor(
    private readonly hareruyaService: HareruyaService,
    private readonly productsService: ProductsService,
    private readonly prisma: PrismaService,
  ) {}

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

  /**
   * Normalize language for comparison
   * Maps language codes and names to normalized English names
   */
  private normalizeLanguageForComparison(
    lang: string | undefined | null,
  ): string {
    if (!lang) return 'ENGLISH';
    const upperLang = lang.toUpperCase().trim();

    // Map language codes to normalized names
    const codeMap: Record<string, string> = {
      JP: 'JAPANESE',
      EN: 'ENGLISH',
      ES: 'SPANISH',
      FR: 'FRENCH',
      DE: 'GERMAN',
      IT: 'ITALIAN',
      PT: 'PORTUGUESE',
      RU: 'RUSSIAN',
      KO: 'KOREAN',
      CS: 'CHINESE',
      CT: 'CHINESE',
      AG: 'ENGLISH',
    };

    // Map Spanish names to normalized names
    const nameMap: Record<string, string> = {
      JAPONÉS: 'JAPANESE',
      JAPANESE: 'JAPANESE',
      INGLÉS: 'ENGLISH',
      ENGLISH: 'ENGLISH',
      ESPAÑOL: 'SPANISH',
      SPANISH: 'SPANISH',
      ITALIANO: 'ITALIAN',
      ITALIAN: 'ITALIAN',
      FRANCÉS: 'FRENCH',
      FRENCH: 'FRENCH',
      ALEMÁN: 'GERMAN',
      GERMAN: 'GERMAN',
      PORTUGUÉS: 'PORTUGUESE',
      PORTUGUESE: 'PORTUGUESE',
      RUSO: 'RUSSIAN',
      RUSSIAN: 'RUSSIAN',
      COREANO: 'KOREAN',
      KOREAN: 'KOREAN',
      CHINO: 'CHINESE',
      CHINESE: 'CHINESE',
    };

    return codeMap[upperLang] || nameMap[upperLang] || upperLang || 'ENGLISH';
  }

  /**
   * Transform local product to match Hareruya search result format
   */
  private transformLocalProductToHareruyaFormat(localProduct: any): any {
    // Extract price values (handle Decimal types)
    const basePrice =
      localProduct.finalPrice?.toNumber?.() ||
      localProduct.finalPrice ||
      localProduct.price?.toNumber?.() ||
      localProduct.price ||
      0;

    // Calculate final price with condition discount
    const condition = localProduct.conditions;
    const discountPercent = condition?.discount || 0;
    const finalPrice =
      Math.round(basePrice * (1 - discountPercent / 100) * 100) / 100;

    // Format price as string
    const priceFormatted = `$${finalPrice.toFixed(2)} MXN`;

    // Extract category name
    const categoryName =
      localProduct.categories?.name ||
      localProduct.categories?.display_name ||
      'SINGLES';

    // Extract condition name
    const conditionName =
      localProduct.conditions?.display_name ||
      localProduct.conditions?.name ||
      'Near Mint';

    // Extract language display name
    const languageName =
      localProduct.languages?.display_name ||
      localProduct.languages?.name ||
      'Inglés';

    // Extract metadata from local product
    const metadata: string[] = [];
    if (localProduct.metadata && Array.isArray(localProduct.metadata)) {
      metadata.push(...localProduct.metadata);
    }
    if (localProduct.foil === true) {
      if (!metadata.includes('Foil')) {
        metadata.push('Foil');
      }
    }

    // Extract boolean flags from metadata
    const borderless = metadata.includes('Borderless') || localProduct.borderless === true;
    const extendedArt = metadata.includes('Extended Art') || localProduct.extendedArt === true;
    const prerelease = metadata.includes('Prerelease') || localProduct.prerelease === true;
    const premierPlay = metadata.includes('Premier Play') || localProduct.premierPlay === true;
    const surgeFoil = metadata.includes('Surge Foil') || metadata.includes('SurgeFoil') || localProduct.surgeFoil === true;

    // Build link if hareruyaId exists
    const languageCode = localProduct.languages?.code || 'EN';
    const link = localProduct.hareruyaId
      ? `https://www.hareruyamtg.com/en/products/detail/${localProduct.hareruyaId}?lang=${languageCode}`
      : '';

    // Extract stock count
    const stockCount = localProduct.stock || 0;
    const hasStock = stockCount > 0;
    const hasHareruyaId = !!localProduct.hareruyaId;

    // Check if metadata includes "Personal"
    const hasPersonalMetadata = metadata.includes('Personal');

    // Determine if import badge should be shown
    // Show badge if:
    // 1. Product has hareruyaId AND is local inventory AND has stock > 0, OR
    // 2. Explicitly set to true, OR
    // 3. Metadata includes "Personal"
    const showImportacionBadge =
      (hasHareruyaId && hasStock) ||
      localProduct.showImportacionBadge === true ||
      hasPersonalMetadata;

    // Return in Hareruya format
    return {
      borderless,
      cardName: localProduct.cardName || localProduct.name || '',
      cardNumber: localProduct.cardNumber || '',
      category: categoryName,
      condition: conditionName,
      expansion: localProduct.expansion || localProduct.variant || '',
      extendedArt,
      finalPrice: finalPrice,
      foil: localProduct.foil === true,
      hareruyaId: localProduct.hareruyaId || null,
      img: localProduct.img || '',
      isLocalInventory: true,
      language: languageName,
      link: link,
      metadata: metadata,
      prerelease,
      premierPlay,
      price: priceFormatted,
      showImportacionBadge: showImportacionBadge,
      source: 'local',
      stock: stockCount,
      surgeFoil,
      tags: localProduct.tags || [],
      variant: localProduct.variant || localProduct.expansion || null,
    };
  }

  /**
   * Hybrid search: searches both Hareruya API and local database
   * Synchronizes prices when matches are found
   * Applies condition discounts to local products
   * Returns combined results with pagination
   */
  async searchHybrid(
    query: string,
    page: number = 1,
    limit: number = 12,
  ): Promise<{
    success: boolean;
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    localCount: number;
    hareruyaCount: number;
    updatedPrices: number;
  }> {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Query parameter (q) is required');
    }

    const searchQuery = query.trim();
    this.logger.log(
      `Starting hybrid search for: ${searchQuery}, page: ${page}, limit: ${limit}`,
    );

    let hareruyaResults: any[] = [];
    let hareruyaPagination: {
      totalItems: number;
      totalItemsAllPages: number;
      currentPage: number;
      maxPage: number;
      hasNextPage: boolean;
      itemsPerPage: number;
    } | null = null;
    let localProducts: any[] = [];
    let updatedPricesCount = 0;

    // Calculate how many Hareruya results we need for matching with local products
    // We need enough for matching, so fetch a reasonable buffer
    // The actual total will come from pagination.totalItemsAllPages
    const hareruyaRows = limit * 3; // Buffer for matching with local products

    // Search Hareruya API using rows parameter
    try {
      const hareruyaResponse = await this.searchHareruya({
        kw: searchQuery,
        page: 1,
        rows: hareruyaRows, // Use rows parameter to get results for matching
      });
      hareruyaResults = hareruyaResponse.data || [];
      hareruyaPagination = hareruyaResponse.pagination || null;
      this.logger.log(
        `Found ${hareruyaResults.length} results from Hareruya (total available: ${hareruyaPagination?.totalItemsAllPages || 0})`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to search Hareruya API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Continue with local search only
    }

    // Search local database
    try {
      localProducts = await this.productsService.findByName(searchQuery);
      this.logger.log(`Found ${localProducts.length} local products`);
    } catch (error) {
      this.logger.error(
        `Failed to search local database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Continue with Hareruya results only
    }

    // Process local products: match with Hareruya and update prices
    const processedLocalProducts: any[] = [];
    const priceUpdates: Array<{
      id: string;
      price: number;
      finalPrice: number;
    }> = [];

    for (const localProduct of localProducts) {
      if (!localProduct.hareruyaId) {
        // No hareruyaId, skip matching but include in results (transformed)
        const transformedProduct = this.transformLocalProductToHareruyaFormat(localProduct);
        processedLocalProducts.push(transformedProduct);
        continue;
      }

      // Find matching Hareruya product
      const hareruyaMatch = hareruyaResults.find((h) => {
        // Match by hareruyaId
        if (h.hareruyaId !== localProduct.hareruyaId) {
          return false;
        }

        // Match by foil status
        const localFoil = localProduct.foil === true;
        const hareruyaFoil = h.foil === true;
        if (localFoil !== hareruyaFoil) {
          return false;
        }

        // Match by language
        const localLanguageCode = localProduct.languages?.code || '';
        const localLanguageName =
          localProduct.languages?.name ||
          localProduct.languages?.display_name ||
          '';
        const localNormalized = this.normalizeLanguageForComparison(
          localLanguageCode || localLanguageName,
        );

        const hareruyaLanguage = h.language || '';
        const hareruyaNormalized =
          this.normalizeLanguageForComparison(hareruyaLanguage);

        return localNormalized === hareruyaNormalized;
      });

      // If match found, update prices
      if (hareruyaMatch && hareruyaMatch.finalPrice !== undefined) {
        const newPrice = hareruyaMatch.finalPrice;
        const newFinalPrice = hareruyaMatch.finalPrice;

        priceUpdates.push({
          id: localProduct.id,
          price: newPrice,
          finalPrice: newFinalPrice,
        });

        // Update local product object for response
        localProduct.price = newPrice;
        localProduct.finalPrice = newFinalPrice;
        updatedPricesCount++;
      }

      // Transform local product to match Hareruya format
      const transformedProduct = this.transformLocalProductToHareruyaFormat(localProduct);
      processedLocalProducts.push(transformedProduct);
    }

    // Update prices in database in batch
    if (priceUpdates.length > 0) {
      try {
        await this.prisma.$transaction(
          priceUpdates.map((update) =>
            (this.prisma as any).singles.update({
              where: { id: update.id },
              data: {
                price: update.price,
                finalPrice: update.finalPrice,
              },
            }),
          ),
        );
        this.logger.log(`Updated ${priceUpdates.length} product prices`);
      } catch (error) {
        this.logger.error(
          `Failed to update prices in database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Calculate total: local products + totalItemsAllPages from Hareruya
    // Use the actual total from Hareruya pagination response
    const hareruyaTotal =
      hareruyaPagination?.totalItemsAllPages || hareruyaResults.length;
    const localTotal = processedLocalProducts.length;
    const total = localTotal + hareruyaTotal;
    const totalPages = Math.ceil(total / limit);

    // Calculate pagination: local products come first, then Hareruya results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    let paginatedResults: any[] = [];

    if (startIndex < localTotal) {
      // Page includes local products (possibly mixed with Hareruya)
      const localStart = startIndex;
      const localEnd = Math.min(endIndex, localTotal);
      const localSlice = processedLocalProducts.slice(localStart, localEnd);
      const hareruyaNeeded = Math.max(0, endIndex - localTotal);

      if (hareruyaNeeded > 0) {
        // Need some Hareruya results to complete the page
        // Calculate which Hareruya page we need (always page 1 since we fetched buffer)
        const hareruyaSlice = hareruyaResults.slice(0, hareruyaNeeded);
        paginatedResults = [...localSlice, ...hareruyaSlice];
      } else {
        // Only local products
        paginatedResults = localSlice;
      }
    } else {
      // Page is completely in Hareruya range
      // Calculate which Hareruya page corresponds to this page
      // Since local products come first, we need to adjust the page number
      // If there are local products, they take up space in earlier pages
      // Example: if localTotal=1, page=2, limit=12:
      //   - Page 1 had 1 local + 11 Hareruya (from Hareruya page 1)
      //   - Page 2 needs 12 Hareruya (from Hareruya page 2)
      // So: hareruyaPage = page - Math.floor(localTotal / limit)
      // But if localTotal < limit, then page 1 uses some Hareruya from page 1
      // and page 2 should use Hareruya page 2
      // Actually simpler: hareruyaPage = page (if we assume local products are always < limit)
      // But to be safe: hareruyaPage = page - Math.floor(localTotal / limit)
      const hareruyaPage = page - Math.floor(localTotal / limit);

      // Fetch the correct Hareruya page directly
      try {
        const hareruyaPageResponse = await this.searchHareruya({
          kw: searchQuery,
          page: hareruyaPage,
          rows: limit,
        });
        paginatedResults = hareruyaPageResponse.data || [];
      } catch (error) {
        this.logger.warn(
          `Failed to fetch Hareruya page ${hareruyaPage}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        paginatedResults = [];
      }
    }

    return {
      success: true,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      localCount: localTotal,
      hareruyaCount: hareruyaTotal,
      updatedPrices: updatedPricesCount,
    };
  }
}
