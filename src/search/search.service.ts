import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SearchHareruyaDto } from './dto/search-hareruya.dto.js';
import {
  HareruyaService,
  HareruyaSearchResult,
} from '../hareruya/hareruya.service.js';
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

      const response: Awaited<ReturnType<typeof fetch>> = await fetch(url, {
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
   * Filter products that have "Personal" tag and don't have stock in Hareruya
   * Returns a Set of product IDs that should be excluded
   */
  private async filterProductsWithoutHareruyaStock(
    products: any[],
  ): Promise<Set<string>> {
    const productsWithoutHareruyaStock = new Set<string>();
    const productsToCheckStock: Array<{
      product: { id?: string };
      hareruyaId: string;
      cardName: string;
      language: string;
      foil: boolean;
    }> = [];

    // Identify products that need Hareruya stock verification
    // IMPORTANT: Only process LOCAL products with "Personal" tag
    for (const localProduct of products) {
      // Type guard: ensure we have a valid product object
      const product = localProduct as Record<string, unknown> & {
        id?: string;
        isLocalInventory?: boolean;
        metadata?: string[] | null;
        tags?: unknown;
        hareruyaId?: string | null;
        languages?: { code?: string } | null;
        cardName?: string | null;
        name?: string | null;
        foil?: boolean;
      };

      // Skip products that are not local (isLocalInventory=false)
      if (product.isLocalInventory === false) {
        continue;
      }

      // Extract metadata and tags
      const metadata: string[] = [];
      const productMetadata = product.metadata;
      if (productMetadata && Array.isArray(productMetadata)) {
        metadata.push(
          ...productMetadata.filter(
            (item): item is string => typeof item === 'string',
          ),
        );
      }

      // Get tags from single_tags relation
      const tags = product.tags || [];
      const tagNames = (Array.isArray(tags) ? tags : [])
        .map((st: unknown) => {
          if (st && typeof st === 'object' && 'tags' in st) {
            const tagObj = st as { tags?: { name?: unknown } };
            return typeof tagObj.tags?.name === 'string'
              ? tagObj.tags.name
              : '';
          }
          return '';
        })
        .filter(Boolean);
      const hasPersonalTag =
        tagNames.some((tag: string) => tag.toLowerCase() === 'personal') ||
        metadata.includes('Personal');

      // Check if product needs stock verification
      // Only local products with Personal tag need verification
      const needsStockCheck = hasPersonalTag && product.hareruyaId;

      if (needsStockCheck) {
        const productLanguages = product.languages;
        const languageCode =
          productLanguages &&
          typeof productLanguages === 'object' &&
          typeof productLanguages.code === 'string'
            ? productLanguages.code
            : 'EN';
        productsToCheckStock.push({
          product: product,
          hareruyaId: product.hareruyaId || '',
          cardName: product.cardName || product.name || '',
          language: languageCode,
          foil: product.foil === true,
        });
      }
    }

    // Check Hareruya stock for products that need verification
    if (productsToCheckStock.length > 0) {
      try {
        const hareruyaIds = productsToCheckStock.map((p) => p.hareruyaId);
        const cardNames = productsToCheckStock.map((p) => p.cardName);

        const pricingResult = await this.hareruyaService.getHareruyaPricing({
          productIds: hareruyaIds,
          cardNames: cardNames,
        });

        if (pricingResult.success && pricingResult.pricing) {
          // For each product, find matching variant by language and foil
          for (const productToCheck of productsToCheckStock) {
            const matchingVariant = pricingResult.pricing.find((variant) => {
              // Match by hareruyaId
              if (variant.productId !== productToCheck.hareruyaId) {
                return false;
              }

              // Match by language
              const variantLanguage = (variant.language || 'ENGLISH')
                .toUpperCase()
                .trim();
              const productLanguage = this.normalizeLanguageForComparison(
                productToCheck.language,
              )
                .toUpperCase()
                .trim();
              const languageMatches = variantLanguage === productLanguage;

              // Match by foil
              const foilMatches =
                productToCheck.foil === (variant.isFoil === true);

              return languageMatches && foilMatches;
            });

            // If no matching variant found or stock is 0 or undefined, exclude from results
            const productId = productToCheck.product.id;
            if (!matchingVariant) {
              if (productId) {
                productsWithoutHareruyaStock.add(productId);
              }
              this.logger.log(
                `Excluding product ${productId || 'unknown'} (${productToCheck.cardName}) - no matching variant found in Hareruya (hareruyaId: ${productToCheck.hareruyaId}, language: ${productToCheck.language}, foil: ${productToCheck.foil})`,
              );
            } else {
              // Check stock - exclude if stock is 0, null, undefined, or negative
              const stock = matchingVariant.stock;
              if (stock === undefined || stock === null || stock <= 0) {
                if (productId) {
                  productsWithoutHareruyaStock.add(productId);
                }
                this.logger.log(
                  `Excluding product ${productId || 'unknown'} (${productToCheck.cardName}) - stock is 0 or invalid in Hareruya (hareruyaId: ${productToCheck.hareruyaId}, stock: ${stock}, language: ${productToCheck.language}, foil: ${productToCheck.foil})`,
                );
              }
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Error checking Hareruya stock for Personal/local inventory products: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // On error, be conservative and exclude products that need stock check
        // to avoid showing products that might not be available
        productsToCheckStock.forEach((p) => {
          const productId = p.product.id;
          if (productId) {
            productsWithoutHareruyaStock.add(productId);
          }
        });
      }
    }

    return productsWithoutHareruyaStock;
  }

  /**
   * Transform local product to match Hareruya search result format
   */
  transformLocalProductToHareruyaFormat(localProduct: any): any {
    // Extract price values (handle Decimal types)
    const getNumericValue = (value: unknown): number => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number') return value;
      if (
        typeof value === 'object' &&
        'toNumber' in value &&
        typeof (value as { toNumber?: () => unknown }).toNumber === 'function'
      ) {
        const numValue = (value as { toNumber: () => unknown }).toNumber();
        return typeof numValue === 'number' ? numValue : 0;
      }
      const parsed = Number(value);
      return isNaN(parsed) ? 0 : parsed;
    };

    const productRecord = localProduct as Record<string, unknown>;
    const finalPriceValue = productRecord.finalPrice;
    const priceValue = productRecord.price;
    const basePrice =
      getNumericValue(finalPriceValue) || getNumericValue(priceValue) || 0;

    // Calculate final price with condition discount
    const condition = productRecord.conditions as
      | { discount?: number }
      | null
      | undefined;
    const discountPercent =
      condition &&
      typeof condition === 'object' &&
      typeof condition.discount === 'number'
        ? condition.discount
        : 0;
    const finalPrice =
      Math.round(basePrice * (1 - discountPercent / 100) * 100) / 100;

    // Format price as string
    const priceFormatted = `$${finalPrice.toFixed(2)} MXN`;

    // Extract category name
    const categories = productRecord.categories as
      | { name?: string; display_name?: string }
      | null
      | undefined;
    const getCategoryName = (cat: unknown): string | null => {
      if (cat && typeof cat === 'object') {
        if ('name' in cat && typeof cat.name === 'string') {
          return cat.name;
        }
        if ('display_name' in cat && typeof cat.display_name === 'string') {
          return cat.display_name;
        }
      }
      return null;
    };
    const categoryName = getCategoryName(categories) || 'SINGLES';

    // Extract condition name
    const conditionWithName = productRecord.conditions as
      | { name?: string; display_name?: string }
      | null
      | undefined;
    const getConditionName = (cond: unknown): string | null => {
      if (cond && typeof cond === 'object') {
        if ('display_name' in cond && typeof cond.display_name === 'string') {
          return cond.display_name;
        }
        if ('name' in cond && typeof cond.name === 'string') {
          return cond.name;
        }
      }
      return null;
    };
    const conditionName = getConditionName(conditionWithName) || 'Near Mint';

    // Extract language display name
    const languages = productRecord.languages as
      | { name?: string; display_name?: string }
      | null
      | undefined;
    const getLanguageName = (lang: unknown): string | null => {
      if (lang && typeof lang === 'object') {
        if ('display_name' in lang && typeof lang.display_name === 'string') {
          return lang.display_name;
        }
        if ('name' in lang && typeof lang.name === 'string') {
          return lang.name;
        }
      }
      return null;
    };
    const languageName = getLanguageName(languages) || 'Inglés';

    // Extract metadata from local product
    const metadata: string[] = [];
    const productMetadata = productRecord.metadata;
    if (productMetadata && Array.isArray(productMetadata)) {
      metadata.push(
        ...productMetadata.filter(
          (item): item is string => typeof item === 'string',
        ),
      );
    }
    const productFoil = productRecord.foil;
    if (productFoil === true) {
      if (!metadata.includes('Foil')) {
        metadata.push('Foil');
      }
    }

    // Extract boolean flags from metadata
    const productBorderless = productRecord.borderless;
    const productExtendedArt = productRecord.extendedArt;
    const productPrerelease = productRecord.prerelease;
    const productPremierPlay = productRecord.premierPlay;
    const productSurgeFoil = productRecord.surgeFoil;

    const borderless =
      metadata.includes('Borderless') || productBorderless === true;
    const extendedArt =
      metadata.includes('Extended Art') || productExtendedArt === true;
    const prerelease =
      metadata.includes('Prerelease') || productPrerelease === true;
    const premierPlay =
      metadata.includes('Premier Play') || productPremierPlay === true;
    const surgeFoil =
      metadata.includes('Surge Foil') ||
      metadata.includes('SurgeFoil') ||
      productSurgeFoil === true;

    // Build link if hareruyaId exists
    const productLanguagesForLink = productRecord.languages as
      | { code?: string }
      | null
      | undefined;
    const languageCode =
      (productLanguagesForLink &&
      typeof productLanguagesForLink === 'object' &&
      typeof productLanguagesForLink.code === 'string'
        ? productLanguagesForLink.code
        : null) || 'EN';
    const productHareruyaId = productRecord.hareruyaId;
    const hareruyaIdString =
      productHareruyaId &&
      (typeof productHareruyaId === 'string' ||
        typeof productHareruyaId === 'number')
        ? String(productHareruyaId)
        : null;
    const link = hareruyaIdString
      ? `https://www.hareruyamtg.com/en/products/detail/${hareruyaIdString}?lang=${languageCode}`
      : '';

    // Extract stock count
    const productStock = productRecord.stock;
    const getNumericStock = (value: unknown): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    const stockCount = getNumericStock(productStock);
    const hasStock = stockCount > 0;
    const hasHareruyaId = !!(
      productHareruyaId &&
      (typeof productHareruyaId === 'string' ||
        typeof productHareruyaId === 'number')
    );

    // Check if metadata includes "Personal"
    const hasPersonalMetadata = metadata.includes('Personal');

    // Determine if import badge should be shown
    // Show badge if:
    // 1. Product has hareruyaId AND is local inventory AND has stock > 0, OR
    // 2. Explicitly set to true, OR
    // 3. Metadata includes "Personal"
    const productShowImportacionBadge = productRecord.showImportacionBadge;
    const showImportacionBadge =
      (hasHareruyaId && hasStock) ||
      productShowImportacionBadge === true ||
      hasPersonalMetadata;

    // Extract remaining properties from productRecord
    const productCardName = productRecord.cardName;
    const productName = productRecord.name;
    const productCardNumber = productRecord.cardNumber;
    const productExpansion = productRecord.expansion;
    const productVariant = productRecord.variant;
    const productImg = productRecord.img;
    const productTags = productRecord.tags;

    const getStringValue = (value: unknown): string => {
      return typeof value === 'string' ? value : '';
    };

    const getCardName = (): string => {
      const cardName = getStringValue(productCardName);
      if (cardName) return cardName;
      const name = getStringValue(productName);
      return name || '';
    };

    // Extract product ID
    const productId = productRecord.id;
    const productIdString =
      productId && typeof productId === 'string' ? productId : null;

    // Return in Hareruya format
    return {
      id: productIdString, // Local product ID (UUID)
      borderless,
      cardName: getCardName(),
      cardNumber: getStringValue(productCardNumber),
      category: categoryName,
      condition: conditionName,
      expansion:
        getStringValue(productExpansion) ||
        getStringValue(productVariant) ||
        '',
      extendedArt,
      finalPrice: finalPrice,
      foil: productFoil === true,
      hareruyaId: hareruyaIdString || null,
      img: getStringValue(productImg),
      isLocalInventory: true,
      language: languageName,
      link: link,
      metadata: metadata,
      prerelease,
      premierPlay,
      price: priceFormatted,
      showImportacionBadge: showImportacionBadge,
      stock: stockCount,
      surgeFoil,
      tags: Array.isArray(productTags) ? productTags : [],
      variant:
        getStringValue(productVariant) ||
        getStringValue(productExpansion) ||
        null,
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

    let hareruyaResults: HareruyaSearchResult[] = [];
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

    // Filter out products with "Personal" tag or isLocalInventory that don't have stock in Hareruya
    const productsWithoutHareruyaStock =
      await this.filterProductsWithoutHareruyaStock(localProducts);

    // Process local products: match with Hareruya and update prices
    const processedLocalProducts: any[] = [];
    const priceUpdates: Array<{
      id: string;
      price: number;
      finalPrice: number;
    }> = [];

    for (const localProduct of localProducts) {
      // Type guard: ensure we have a valid product object
      const product = localProduct as Record<string, unknown> & {
        id?: string;
        hareruyaId?: string | null;
        foil?: boolean;
        languages?: {
          code?: string;
          name?: string;
          display_name?: string;
        } | null;
      };

      // Skip products without Hareruya stock if they have Personal tag or are local inventory
      const productId = product.id;
      if (productId && productsWithoutHareruyaStock.has(productId)) {
        continue;
      }

      const productHareruyaId = product.hareruyaId;
      if (!productHareruyaId) {
        // No hareruyaId, skip matching but include in results (transformed)
        const transformedProduct = this.transformLocalProductToHareruyaFormat(
          localProduct,
        ) as unknown;
        processedLocalProducts.push(transformedProduct);
        continue;
      }

      // Find matching Hareruya product
      const hareruyaMatch = hareruyaResults.find((h) => {
        // Match by hareruyaId
        if (h.hareruyaId !== productHareruyaId) {
          return false;
        }

        // Match by foil status
        const localFoil = product.foil === true;
        const hareruyaFoil = h.foil === true;
        if (localFoil !== hareruyaFoil) {
          return false;
        }

        // Match by language
        const productLanguages = product.languages;
        const localLanguageCode =
          productLanguages &&
          typeof productLanguages === 'object' &&
          typeof productLanguages.code === 'string'
            ? productLanguages.code
            : '';
        const localLanguageName =
          productLanguages &&
          typeof productLanguages === 'object' &&
          typeof productLanguages.name === 'string'
            ? productLanguages.name
            : productLanguages &&
                typeof productLanguages === 'object' &&
                typeof productLanguages.display_name === 'string'
              ? productLanguages.display_name
              : '';
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
        const newPrice =
          typeof hareruyaMatch.finalPrice === 'number'
            ? hareruyaMatch.finalPrice
            : 0;
        const newFinalPrice =
          typeof hareruyaMatch.finalPrice === 'number'
            ? hareruyaMatch.finalPrice
            : 0;

        if (productId) {
          priceUpdates.push({
            id: productId,
            price: newPrice,
            finalPrice: newFinalPrice,
          });
        }

        // Update local product object for response
        if (typeof localProduct === 'object' && localProduct !== null) {
          (localProduct as Record<string, unknown>).price = newPrice;
          (localProduct as Record<string, unknown>).finalPrice = newFinalPrice;
        }
        updatedPricesCount++;
      }

      // Transform local product to match Hareruya format
      const transformedProduct = this.transformLocalProductToHareruyaFormat(
        localProduct,
      ) as unknown;
      processedLocalProducts.push(transformedProduct);
    }

    // Update prices in database in batch
    if (priceUpdates.length > 0) {
      try {
        const updatePromises = priceUpdates.map((update) => {
          const updateData: { price: number; finalPrice: number } = {
            price: update.price,
            finalPrice: update.finalPrice,
          };
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const updateResult = (this.prisma as any).singles.update({
            where: { id: update.id },
            data: updateData,
          }) as unknown;
          return updateResult;
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await this.prisma.$transaction(updatePromises as unknown as any);
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
        paginatedResults = [
          ...(localSlice as unknown[]),
          ...(hareruyaSlice as unknown[]),
        ];
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

  /**
   * Local search: searches only local database
   * Applies condition discounts to local products
   * Returns results with optional pagination
   * If no query provided, returns latest added items
   * Pagination is only returned if enabled via query parameter
   */
  async searchLocal(
    query: string | null,
    page: number = 1,
    limit: number = 12,
    enablePagination: boolean = false,
    metadata?: string,
    category?: string,
  ): Promise<{
    success: boolean;
    data: any[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    localCount: number;
  }> {
    const pageNum = page;
    const limitNum = limit;

    if (pageNum < 1) {
      throw new BadRequestException('Page must be at least 1');
    }

    if (limitNum < 1) {
      throw new BadRequestException('Limit must be at least 1');
    }

    let localProducts: any[] = [];
    let totalCount = 0;

    // If query is provided, search by name
    // Otherwise, get latest added items
    if (query && query.trim() !== '') {
      const searchQuery = query.trim();
      this.logger.log(
        `Starting local search for: ${searchQuery}, page: ${pageNum}, limit: ${limitNum}, pagination: ${enablePagination}`,
      );

      try {
        localProducts = await this.productsService.findByName(searchQuery);
        totalCount = localProducts.length;
        this.logger.log(`Found ${localProducts.length} local products`);

        // Apply pagination only if enabled
        if (enablePagination) {
          const startIndex = (pageNum - 1) * limitNum;
          const endIndex = startIndex + limitNum;
          localProducts = localProducts.slice(startIndex, endIndex);
        } else {
          // If pagination is disabled, limit to the specified limit
          localProducts = localProducts.slice(0, limitNum);
        }
      } catch (error) {
        this.logger.error(
          `Failed to search local database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        localProducts = [];
        totalCount = 0;
      }
    } else {
      // Get latest added items or filter by metadata
      if (metadata) {
        this.logger.log(
          `Getting local products with metadata: ${metadata}, page: ${pageNum}, limit: ${limitNum}, pagination: ${enablePagination}`,
        );

        try {
          // Normalize metadata to match tag name (case-insensitive, capitalize first letter)
          const normalizedMetadata =
            metadata.charAt(0).toUpperCase() + metadata.slice(1).toLowerCase();

          if (enablePagination) {
            // Get total count first for pagination with tag filter
            totalCount = await this.prisma.singles.count({
              where: {
                tags: {
                  some: {
                    tags: {
                      name: {
                        equals: normalizedMetadata,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
                // Filter: Exclude local inventory items without hareruyaId
                OR: [
                  { isLocalInventory: { not: true } },
                  {
                    AND: [
                      { isLocalInventory: true },
                      { hareruyaId: { not: null } },
                    ],
                  },
                ],
              },
            });
            // Get paginated results
            localProducts = await this.productsService.findByMetadata(
              metadata,
              limitNum,
              pageNum,
            );
            this.logger.log(
              `Found ${localProducts.length} products with tag ${normalizedMetadata} (total: ${totalCount})`,
            );
          } else {
            // If pagination is disabled, search iteratively until we have 4 valid products
            // (same behavior as category search without pagination)
            const TARGET_PRODUCTS = 4;
            const BATCH_SIZE = 12; // Search in batches of 12
            const validProducts: any[] = [];
            let currentPage = 1;
            const allFetchedProducts: any[] = [];

            // Keep searching until we have 4 valid products or run out of products
            while (validProducts.length < TARGET_PRODUCTS) {
              // Fetch a batch of products
              const batch = await this.productsService.findByMetadata(
                metadata,
                BATCH_SIZE,
                currentPage,
              );

              if (batch.length === 0) {
                // No more products available
                break;
              }

              allFetchedProducts.push(...batch);

              // Filter this batch
              const productsWithoutHareruyaStock =
                await this.filterProductsWithoutHareruyaStock(batch);

              // Process and add valid products
              for (const localProduct of batch) {
                if (validProducts.length >= TARGET_PRODUCTS) {
                  break;
                }

                // Skip products without Hareruya stock if they have Personal tag
                const productId = localProduct.id;
                if (
                  productId &&
                  typeof productId === 'string' &&
                  productsWithoutHareruyaStock.has(productId)
                ) {
                  continue;
                }

                // Transform local product to match Hareruya format
                const transformedProduct =
                  this.transformLocalProductToHareruyaFormat(
                    localProduct,
                  ) as unknown;
                validProducts.push(transformedProduct);
              }

              // If we got less than BATCH_SIZE, we've reached the end
              if (batch.length < BATCH_SIZE) {
                break;
              }

              currentPage++;
            }

            // Store the valid products in localProducts for consistency
            localProducts = validProducts;
            totalCount = validProducts.length;
            this.logger.log(
              `Found ${validProducts.length} valid products with tag ${normalizedMetadata} after filtering (searched ${allFetchedProducts.length} total products)`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to get products with metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          localProducts = [];
          totalCount = 0;
        }
      } else {
        // If no category is specified, default to "singles" to match the behavior
        // when category=singles is explicitly provided
        const effectiveCategory = category || 'singles';

        this.logger.log(
          `Getting latest local products, page: ${pageNum}, limit: ${limitNum}, pagination: ${enablePagination}, category: ${effectiveCategory}`,
        );

        try {
          if (enablePagination) {
            // Get total count first for pagination
            totalCount =
              await this.productsService.countByCategory(effectiveCategory);
            // Get paginated results
            localProducts = await this.productsService.findLatest(
              limitNum,
              pageNum,
              effectiveCategory,
            );
            this.logger.log(
              `Found ${localProducts.length} latest local products (total: ${totalCount})`,
            );
          } else {
            // If pagination is disabled, search iteratively until we have 4 valid products
            const TARGET_PRODUCTS = 4;
            const BATCH_SIZE = 12; // Search in batches of 12
            const validProducts: any[] = [];
            let currentPage = 1;
            const allFetchedProducts: any[] = [];

            // Keep searching until we have 4 valid products or run out of products
            while (validProducts.length < TARGET_PRODUCTS) {
              // Fetch a batch of products
              const batch = await this.productsService.findLatest(
                BATCH_SIZE,
                currentPage,
                effectiveCategory,
              );

              if (batch.length === 0) {
                // No more products available
                break;
              }

              allFetchedProducts.push(...batch);

              // Filter this batch
              const productsWithoutHareruyaStock =
                await this.filterProductsWithoutHareruyaStock(batch);

              // Process and add valid products
              for (const localProduct of batch) {
                if (validProducts.length >= TARGET_PRODUCTS) {
                  break;
                }

                // Skip products without Hareruya stock if they have Personal tag
                const productId = localProduct.id;
                if (
                  productId &&
                  typeof productId === 'string' &&
                  productsWithoutHareruyaStock.has(productId)
                ) {
                  continue;
                }

                // Transform local product to match Hareruya format
                const transformedProduct =
                  this.transformLocalProductToHareruyaFormat(
                    localProduct,
                  ) as unknown;
                validProducts.push(transformedProduct);
              }

              // If we got less than BATCH_SIZE, we've reached the end
              if (batch.length < BATCH_SIZE) {
                break;
              }

              currentPage++;
            }

            // Store the valid products in localProducts for consistency
            localProducts = validProducts;
            totalCount = validProducts.length;
            this.logger.log(
              `Found ${validProducts.length} valid products after filtering (searched ${allFetchedProducts.length} total products)`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to get latest products: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          localProducts = [];
          totalCount = 0;
        }
      }
    }

    // Process local products: transform to Hareruya format
    // For pagination mode, filter all products at once
    let processedLocalProducts: any[] = [];
    if (enablePagination) {
      // Filter out products with "Personal" tag or isLocalInventory that don't have stock in Hareruya
      const productsWithoutHareruyaStock =
        await this.filterProductsWithoutHareruyaStock(localProducts);

      // Transform and filter products
      for (const localProduct of localProducts) {
        // Skip products without Hareruya stock if they have Personal tag or are local inventory
        const productRecord = localProduct as Record<string, unknown>;
        const productId = productRecord.id;
        if (
          productId &&
          typeof productId === 'string' &&
          productsWithoutHareruyaStock.has(productId)
        ) {
          continue;
        }

        // Transform local product to match Hareruya format
        const transformedProduct = this.transformLocalProductToHareruyaFormat(
          localProduct,
        ) as unknown;
        processedLocalProducts.push(transformedProduct);
      }
    } else {
      // For non-pagination mode, products are already filtered and transformed above
      // (both for metadata and category searches, they go through the iterative filtering process)
      processedLocalProducts = localProducts;
    }

    // Build response
    const response: {
      success: boolean;
      data: any[];
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      localCount: number;
    } = {
      success: true,
      data: processedLocalProducts,
      localCount: totalCount,
    };

    // Only include pagination if enabled
    if (enablePagination) {
      const total = totalCount;
      const totalPages = Math.ceil(total / limitNum);
      response.pagination = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      };
    }

    return response;
  }
}
