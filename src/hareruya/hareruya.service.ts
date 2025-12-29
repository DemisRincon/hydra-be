import { Injectable, Logger } from '@nestjs/common';
import { CurrencyService } from './currency.service.js';

export interface HareruyaPricingResult {
  productId: string;
  name: string;
  title: string;
  price: number;
  currency: string;
  stock: number;
  condition: string;
  language: string;
  imageUrl?: string;
  url: string;
  description?: string;
  isFoil?: boolean;
}

export interface HareruyaApiDoc {
  product: string;
  card_name: string;
  product_name_en: string;
  price: string;
  stock: string;
  image_url: string;
  language: string;
  foil_flg?: string;
}

interface HareruyaApiResponse {
  response: {
    numFound: number;
    docs: unknown[];
    page?: number;
  };
  responseHeader?: {
    status: number;
    QTime?: string;
    reqID?: string;
  };
}

export interface HareruyaSearchResult {
  borderless: boolean;
  cardName: string; // Original card_name from Hareruya API
  cardNumber: string;
  category: string;
  condition: string;
  expansion: string;
  finalPrice: number;
  foil: boolean; // true if foil_flg === "1", false otherwise
  hareruyaId: string; // Hareruya product ID (replaces id and productId)
  img: string;
  isLocalInventory: boolean;
  language: string;
  link: string;
  metadata: string[];
  prerelease: boolean;
  premierPlay: boolean;
  price: string;
  showImportacionBadge: boolean;
  source: 'hareruya';
  stock: number;
  extendedArt: boolean;
  surgeFoil: boolean;
  tags: string[];
  variant: string | null; // Set name from brackets [SET NAME]
}

// Hareruya language code mapping
const HARERUYA_LANGUAGE_MAP: Record<string, string> = {
  '1': 'JAPANESE',
  '2': 'ENGLISH',
  '3': 'FRENCH',
  '4': 'CHINESE',
  '5': 'FRENCH',
  '6': 'GERMAN',
  '7': 'ITALIAN',
  '8': 'KOREAN',
  '9': 'PORTUGUESE',
  '10': 'RUSSIAN',
  '11': 'SPANISH',
  '12': 'ENGLISH',
};

@Injectable()
export class HareruyaService {
  private readonly logger = new Logger(HareruyaService.name);
  private htmlResponseCount = 0;
  private maintenanceModeStartTime: number | null = null;
  private readonly MAINTENANCE_THRESHOLD = 3; // After 3 HTML responses, enter maintenance mode
  private readonly MAINTENANCE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown

  constructor(private currencyService: CurrencyService) {}

  /**
   * Transform Hareruya API document to HareruyaPricing format
   */
  private transformToHareruyaPricing(
    doc: HareruyaApiDoc,
  ): HareruyaPricingResult {
    const productId = doc.product;
    const rawPrice = parseInt(doc.price) || 0;
    const stock = parseInt(doc.stock) || 0;
    const _isFoil = doc.foil_flg === '1';

    // Clean the card name
    let cleanCardName = doc.card_name || '';
    if (cleanCardName) {
      cleanCardName = cleanCardName
        .replace(/\bRetro\b/gi, '')
        .replace(/\bBRO-Retro\b/gi, '')
        .replace(/\(serial number\)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Extract expansion code and card number from pattern (WAR-211) or (EXPANSION-NUMBER)
    const expansionCardMatch = doc.product_name_en?.match(
      /\(([A-Z0-9]+)-(\d+)\)/,
    );
    let expansionCode = '';
    let cardNumber = '';

    if (expansionCardMatch) {
      expansionCode = expansionCardMatch[1]; // e.g., "WAR"
      cardNumber = expansionCardMatch[2]; // e.g., "211"
    } else {
      // Fallback: try to extract just card number from (NUMBER) pattern
      const cardNumberMatch = doc.product_name_en?.match(/\((\d+)\)/);
      cardNumber = cardNumberMatch ? cardNumberMatch[1] : '';
    }

    // Extract set information from brackets [SET NAME]
    const setMatch = doc.product_name_en?.match(/\[([^\]]+)\]/);
    let set = setMatch ? setMatch[1] : null;

    if (set) {
      set = set
        .replace(/\bRetro\b/gi, '')
        .replace(/\bBRO-Retro\b/gi, 'BRO')
        .replace(/-+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Format title
    let cardTitle = cleanCardName || doc.card_name || doc.product_name_en || '';
    if (expansionCode && cardNumber) {
      cardTitle = `${cardTitle} (${expansionCode} - ${cardNumber})`;
    } else if (set && cardNumber) {
      cardTitle = `${cardTitle} (${set} - ${cardNumber})`;
    } else if (set) {
      cardTitle = `${cardTitle} (${set})`;
    } else if (expansionCode) {
      cardTitle = `${cardTitle} (${expansionCode})`;
    }

    // Determine language
    const languageEnum =
      HARERUYA_LANGUAGE_MAP[doc.language] || HARERUYA_LANGUAGE_MAP['2'];
    const language = languageEnum || 'ENGLISH';
    const languageCode = doc.language === '1' ? 'JP' : 'EN';

    // Build product URL
    const url = `https://www.hareruyamtg.com/en/products/detail/${productId}?lang=${languageCode}`;

    // Build description
    const description = doc.product_name_en || cardTitle;

    // Ensure productId is always a string
    const normalizedProductId = String(productId || '').trim();

    return {
      productId: normalizedProductId,
      name: cleanCardName || doc.card_name || '',
      title: cardTitle,
      price: rawPrice,
      currency: 'JPY',
      stock,
      condition: 'Near Mint',
      language,
      imageUrl: doc.image_url,
      url,
      description,
      isFoil: _isFoil,
    };
  }

  /**
   * Get browser-like headers for Hareruya API requests
   */
  private getBrowserHeaders(refererUrl?: string): Record<string, string> {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'es-US,es;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      Referer: refererUrl || 'https://www.hareruyamtg.com/en/products/search',
      Origin: 'https://www.hareruyamtg.com',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  async getHareruyaPricing(input: {
    productIds: string[];
    cardNames?: string[];
  }): Promise<{
    success: boolean;
    pricing: HareruyaPricingResult[];
    total: number;
    message?: string;
    errors?: string[];
  }> {
    try {
      const { productIds, cardNames } = input;

      if (!productIds || productIds.length === 0) {
        return {
          success: false,
          pricing: [],
          total: 0,
          message: 'At least one product ID is required',
        };
      }

      const apiUrl =
        process.env.HARERUYA_API_BASE_URL ||
        'https://www.hareruyamtg.com/en/products/search/unisearch_api';
      const pricingResults: HareruyaPricingResult[] = [];
      const errors: string[] = [];

      // Create a map of productId -> cardName for efficient lookup
      const productIdToCardName = new Map<string, string>();
      if (cardNames && cardNames.length === productIds.length) {
        productIds.forEach((productId, index) => {
          if (cardNames[index]) {
            productIdToCardName.set(productId, cardNames[index]);
          }
        });
      }

      // Helper for fetching a single product
      const fetchPricing = async (productId: string) => {
        const cardName = productIdToCardName.get(productId);

        try {
          // Search by card name if available (more reliable), otherwise try product ID
          const searchQuery = cardName || productId;

          const apiParams = new URLSearchParams({
            kw: searchQuery.trim(),
            'fq.category_id': '1', // Cards category
            'fq.price': '1~*',
            rows: '60',
            page: '1',
            user:
              process.env.HARERUYA_USER_ID ||
              '3adcb9a90ba991e0b4b9222f901b884a2c2e30e3870961335e22a57305f19cc4',
          });

          const apiUrlWithParams = `${apiUrl}?${apiParams.toString()}`;

          // Call Hareruya API with proper headers
          const response = await fetch(apiUrlWithParams, {
            method: 'GET',
            headers: this.getBrowserHeaders(
              `https://www.hareruyamtg.com/en/products/search?product=${encodeURIComponent(searchQuery)}`,
            ),
          });

          if (!response.ok) {
            const errorText = await response
              .text()
              .catch(() => 'Unable to read error response');
            this.logger.error(
              `HTTP error for product ${productId}: ${response.status} - ${errorText.substring(0, 200)}`,
            );
            errors.push(
              `Failed to fetch product ${productId}: HTTP ${response.status}`,
            );
            return;
          }

          const apiData = (await response.json()) as HareruyaApiResponse;

          if (!apiData.response || !apiData.response.docs) {
            this.logger.error(`Invalid API response for product ${productId}`);
            errors.push(`Invalid API response for product ${productId}`);
            return;
          }

          // Validate and transform API documents
          const docs: HareruyaApiDoc[] = apiData.response.docs
            .map((doc: unknown) => {
              try {
                // Basic validation
                if (
                  typeof doc === 'object' &&
                  doc !== null &&
                  'product' in doc &&
                  typeof (doc as Record<string, unknown>).product === 'string'
                ) {
                  return doc as HareruyaApiDoc;
                }
                return null;
              } catch (parseError) {
                this.logger.error(
                  `Error parsing document for product ${productId}:`,
                  parseError,
                );
                return null;
              }
            })
            .filter((doc): doc is HareruyaApiDoc => doc !== null);

          // Find ALL variants with matching product ID (different languages/foil statuses)
          // Normalize both to strings for comparison
          const normalizedProductId = String(productId);
          let matchingDocs = docs.filter((doc: HareruyaApiDoc) => {
            const docProduct = String(doc.product || '');
            return docProduct === normalizedProductId;
          });

          // Fallback: If strict ID match failed but we searched by Name, use all results
          // This handles cases where the local DB has an outdated/incorrect ID but the Name is correct
          if (matchingDocs.length === 0 && cardName && docs.length > 0) {
            this.logger.warn(
              `Strict ID match failed for ${productId} (${cardName}), falling back to name-based results. Found IDs: ${docs.map((d) => d.product).join(', ')}`,
            );
            matchingDocs = docs;
          }

          if (matchingDocs.length > 0) {
            // Return all variants so caller can match by language and foil status
            matchingDocs.forEach((doc) => {
              const pricing = this.transformToHareruyaPricing(doc);
              pricingResults.push(pricing);
            });
          } else {
            // Log the productIds found in the results for debugging
            const foundProductIds = [
              ...new Set(
                docs.map((d: HareruyaApiDoc) => String(d.product || '')),
              ),
            ];
            this.logger.warn(
              `Product ${productId} not found in search results. Found productIds in results: ${foundProductIds.slice(0, 10).join(', ')}${foundProductIds.length > 10 ? '...' : ''}`,
            );
            errors.push(
              `Product ${productId} not found - search API may not support direct product ID lookup`,
            );
          }
        } catch (productError) {
          this.logger.error(
            `Error fetching pricing for product ${productId}:`,
            productError,
          );
          const errorMessage =
            productError instanceof Error
              ? productError.message
              : 'Unknown error';
          errors.push(`Error fetching product ${productId}: ${errorMessage}`);
        }
      };

      // Process in batches to improve performance while avoiding rate limits
      const BATCH_SIZE = 5;
      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((id) => fetchPricing(id)));

        // Add a small delay between batches if there are more items to process
        if (i + BATCH_SIZE < productIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      return {
        success: true,
        pricing: pricingResults,
        total: pricingResults.length,
        message:
          errors.length > 0
            ? `Fetched ${pricingResults.length} products, ${errors.length} errors`
            : `Successfully fetched pricing for ${pricingResults.length} products`,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error('Error fetching Hareruya pricing:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        success: false,
        message: `Error fetching Hareruya pricing: ${errorMessage}`,
        pricing: [],
        total: 0,
      };
    }
  }

  /**
   * Normalize language name to match Hareruya API format
   */
  private normalizeLanguage(lang: string | undefined | null): string {
    if (!lang) return 'ENGLISH';
    const upperLang = lang.toUpperCase().trim();
    const langMap: Record<string, string> = {
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
    return langMap[upperLang] || upperLang || 'ENGLISH';
  }

  /**
   * Get price for a single product from Hareruya API
   * Matches by hareruya_product_id, is_foil, and language
   */
  async getPriceForSingle(product: {
    hareruya_product_id?: string | null;
    is_foil?: boolean | null;
    language?: string | null;
    name?: string | null;
  }): Promise<number | null> {
    if (!product.hareruya_product_id || !product.hareruya_product_id.trim()) {
      return null;
    }

    try {
      const pricingResult = await this.getHareruyaPricing({
        productIds: [product.hareruya_product_id],
        cardNames: product.name ? [product.name] : undefined,
      });

      if (
        !pricingResult.success ||
        !pricingResult.pricing ||
        pricingResult.pricing.length === 0
      ) {
        return null;
      }

      // Normalize language
      const normalizedLanguage = this.normalizeLanguage(product.language);
      const isFoil = product.is_foil === true;

      // Find matching variant by language and foil status
      const matchingVariant = pricingResult.pricing.find((variant) => {
        const variantLanguage = (variant.language || 'ENGLISH')
          .toUpperCase()
          .trim();
        const normalizedItemLanguage = normalizedLanguage.toUpperCase().trim();
        const languageMatches = normalizedItemLanguage === variantLanguage;
        const foilMatches = isFoil === (variant.isFoil === true);
        return languageMatches && foilMatches;
      });

      if (!matchingVariant) {
        return null;
      }

      // Convert JPY to MXN
      const priceJPY = matchingVariant.price || 0;
      return priceJPY > 0
        ? this.currencyService.convertJPYToMXN(priceJPY)
        : null;
    } catch (error) {
      this.logger.error(
        `Error fetching price for single product ${product.hareruya_product_id}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get prices for multiple singles from Hareruya API
   * Returns a map of product ID -> price in MXN
   */
  async getPricesForSingles(
    products: Array<{
      id: string;
      hareruya_product_id?: string | null;
      is_foil?: boolean | null;
      language?: string | null;
      name?: string | null;
    }>,
  ): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();

    // Filter products that have hareruya_product_id
    const productsWithHareruyaId = products.filter(
      (p) => p.hareruya_product_id && p.hareruya_product_id.trim() !== '',
    );

    if (productsWithHareruyaId.length === 0) {
      return priceMap;
    }

    // Group by hareruya_product_id to minimize API calls
    const hareruyaProductIds = [
      ...new Set(
        productsWithHareruyaId.map((p) => String(p.hareruya_product_id).trim()),
      ),
    ];

    // Create map of hareruya_product_id -> products for matching
    const hareruyaIdToProducts = new Map<
      string,
      typeof productsWithHareruyaId
    >();
    for (const product of productsWithHareruyaId) {
      const hareruyaId = String(product.hareruya_product_id).trim();
      const existing = hareruyaIdToProducts.get(hareruyaId) || [];
      existing.push(product);
      hareruyaIdToProducts.set(hareruyaId, existing);
    }

    // Get card names for better API matching
    const cardNames = hareruyaProductIds.map((productId) => {
      const products = hareruyaIdToProducts.get(productId);
      return products?.[0]?.name || '';
    });

    try {
      const pricingResult = await this.getHareruyaPricing({
        productIds: hareruyaProductIds,
        cardNames: cardNames,
      });

      if (!pricingResult.success || !pricingResult.pricing) {
        return priceMap;
      }

      // Group pricing results by productId
      const pricingMap = new Map<string, HareruyaPricingResult[]>();
      for (const pricing of pricingResult.pricing) {
        const existing = pricingMap.get(pricing.productId) || [];
        existing.push(pricing);
        pricingMap.set(pricing.productId, existing);
      }

      // Match each product to its correct variant and convert price
      for (const product of productsWithHareruyaId) {
        const hareruyaId = String(product.hareruya_product_id).trim();
        const variants = pricingMap.get(hareruyaId);

        if (!variants || variants.length === 0) {
          continue;
        }

        // Normalize language
        const normalizedLanguage = this.normalizeLanguage(product.language);
        const isFoil = product.is_foil === true;

        // Find matching variant
        const matchingVariant = variants.find((variant) => {
          const variantLanguage = (variant.language || 'ENGLISH')
            .toUpperCase()
            .trim();
          const normalizedItemLanguage = normalizedLanguage
            .toUpperCase()
            .trim();
          const languageMatches = normalizedItemLanguage === variantLanguage;
          const foilMatches = isFoil === (variant.isFoil === true);
          return languageMatches && foilMatches;
        });

        if (matchingVariant && matchingVariant.price > 0) {
          const priceJPY = matchingVariant.price;
          const priceMXN = this.currencyService.convertJPYToMXN(priceJPY);
          priceMap.set(product.id, priceMXN);
        }
      }
    } catch (error) {
      this.logger.error('Error fetching prices for singles:', error);
    }

    return priceMap;
  }

  /**
   * Format search query for Hareruya API
   * For double-faced cards, uses only the first side (front face)
   */
  private formatSearchQuery(query: string): string {
    return query
      .trim()
      .split(/\s*\/\/\s*/)[0] // Take only the first part before "//"
      .split(/\s*\/\s*/)[0]; // Take only the first part before "/"
  }

  /**
   * Transform Hareruya API document to search result format
   */
  private transformHareruyaDocToSearchResult(
    doc: HareruyaApiDoc,
  ): HareruyaSearchResult {
    const isFoil = doc.foil_flg === '1';

    // Format price with JPY to MXN conversion and condition discount
    const rawPrice = parseInt(doc.price) || 0;

    // Convert JPY to MXN
    const convertedPriceMXN =
      rawPrice > 0 ? this.currencyService.convertJPYToMXN(rawPrice) : 0;

    // Apply condition discount (Near Mint = 1.0 multiplier)
    const finalPrice = convertedPriceMXN; // Hareruya products are always NM, so no discount

    const priceMXN =
      rawPrice > 0 ? `$${finalPrice.toFixed(2)} MXN` : 'Precio no disponible';

    // Clean the card name
    let cleanCardName = doc.card_name || '';
    if (cleanCardName) {
      cleanCardName = cleanCardName
        .replace(/\bRetro\b/gi, '')
        .replace(/\bBRO-Retro\b/gi, '')
        .replace(/\(serial number\)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Extract expansion code and card number from pattern (WAR-211) or (EXPANSION-NUMBER)
    const expansionCardMatch = doc.product_name_en?.match(
      /\(([A-Z0-9]+)-(\d+)\)/,
    );
    let expansionCode = '';
    let cardNumber = '';

    if (expansionCardMatch) {
      expansionCode = expansionCardMatch[1]; // e.g., "WAR"
      cardNumber = expansionCardMatch[2]; // e.g., "211"
    } else {
      // Fallback: try to extract just card number from (NUMBER) pattern
      const cardNumberMatch = doc.product_name_en?.match(/\((\d+)\)/);
      cardNumber = cardNumberMatch ? cardNumberMatch[1] : '';
    }

    // Extract set information from brackets [SET NAME]
    const setMatch = doc.product_name_en?.match(/\[([^\]]+)\]/);
    let set = setMatch ? setMatch[1] : null;

    if (set) {
      set = set
        .replace(/\bRetro\b/gi, '')
        .replace(/\bBRO-Retro\b/gi, 'BRO')
        .replace(/-+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Use expansion code from (WAR-211) pattern if available, otherwise use set name
    const expansion = expansionCode || set || '';

    // Extract metadata
    const metadata: string[] = [];
    if (isFoil) metadata.push('Foil');
    if (doc.product_name_en?.includes('Borderless'))
      metadata.push('Borderless');
    if (doc.product_name_en?.includes('Extended Art'))
      metadata.push('Extended Art');
    if (doc.product_name_en?.includes('Prerelease'))
      metadata.push('Prerelease');
    if (doc.product_name_en?.includes('Premier Play'))
      metadata.push('Premier Play');
    if (doc.product_name_en?.includes('Consignment'))
      metadata.push('Consignment Item');

    if (
      doc.product_name_en?.includes('Retro') ||
      doc.product_name_en?.includes('BRO-Retro')
    ) {
      metadata.push('Retro');
    }

    if (doc.product_name_en?.includes('(serial number)')) {
      metadata.push('Serializada');
    }

    // Extract special symbols
    const specialSymbols = doc.product_name_en?.match(/■([^■]+)■/g);
    if (specialSymbols) {
      specialSymbols.forEach((symbol: string) => {
        const badge = symbol.replace(/■/g, '').trim();
        if (
          badge &&
          !metadata.includes(badge) &&
          !(badge === 'RetroF' && metadata.includes('Retro'))
        ) {
          metadata.push(badge);
        }
      });
    }

    const bracketSymbols = doc.product_name_en?.match(/【([^】]+)】/g);
    if (bracketSymbols) {
      bracketSymbols.forEach((symbol: string) => {
        const badge = symbol.replace(/【|】/g, '').trim();
        if (badge && !metadata.includes(badge)) {
          metadata.push(badge);
        }
      });
    }

    const stockCount = parseInt(doc.stock) || 0;

    // Map Hareruya language to Spanish display name
    const hareruyaLanguage = HARERUYA_LANGUAGE_MAP[doc.language] || 'ENGLISH';
    const languageMap: Record<string, string> = {
      JAPANESE: 'Japonés',
      ENGLISH: 'Inglés',
      SPANISH: 'Español',
      ITALIAN: 'Italiano',
      FRENCH: 'Francés',
      GERMAN: 'Alemán',
      PORTUGUESE: 'Portugués',
      RUSSIAN: 'Ruso',
      KOREAN: 'Coreano',
      CHINESE: 'Chino',
    };
    const languageDisplayName =
      languageMap[hareruyaLanguage] || hareruyaLanguage;

    const conditionName = 'Near Mint'; // Hareruya products are always NM
    const languageCode = doc.language === '1' ? 'JP' : 'EN';

    // Extract boolean flags from metadata
    const surgeFoil =
      metadata.includes('Surge Foil') || metadata.includes('SurgeFoil');
    const borderless = metadata.includes('Borderless');
    const extendedArt = metadata.includes('Extended Art');
    const prerelease = metadata.includes('Prerelease');
    const premierPlay = metadata.includes('Premier Play');

    // Return only essential fields needed for search results display
    return {
      borderless, // Required by HareruyaSearchResult
      cardName: doc.card_name || '', // Original card_name from Hareruya API
      cardNumber, // Required by HareruyaSearchResult (already declared above)
      category: 'SINGLES', // Required by HareruyaSearchResult
      condition: conditionName,
      expansion: expansion || '',
      extendedArt, // Required by HareruyaSearchResult
      finalPrice: finalPrice, // Required by HareruyaSearchResult
      foil: isFoil, // true if foil_flg === "1", false otherwise
      hareruyaId: doc.product, // Hareruya product ID
      img: doc.image_url || '',
      isLocalInventory: false,
      language: languageDisplayName,
      link: `https://www.hareruyamtg.com/en/products/detail/${doc.product}?lang=${languageCode}`,
      metadata: metadata,
      prerelease, // Required by HareruyaSearchResult
      premierPlay, // Required by HareruyaSearchResult
      price: priceMXN,
      showImportacionBadge: true,
      source: 'hareruya',
      stock: stockCount,
      surgeFoil, // Required by HareruyaSearchResult
      tags: [], // Required by HareruyaSearchResult (empty for Hareruya products)
      variant: set || null, // Set name from brackets [SET NAME]
    };
  }

  /**
   * Search cards in Hareruya API
   * Similar to searchCards from admin
   */
  async searchCards(filters: {
    query: string;
    page?: number;
    rows?: number;
    priceFilter?: string;
  }): Promise<{
    success: boolean;
    data: HareruyaSearchResult[];
    pagination: {
      totalItems: number;
      totalItemsAllPages: number;
      currentPage: number;
      maxPage: number;
      hasNextPage: boolean;
      itemsPerPage: number;
    };
    message?: string;
  }> {
    // Check if we're in maintenance mode
    if (this.maintenanceModeStartTime !== null) {
      const timeSinceMaintenance = Date.now() - this.maintenanceModeStartTime;
      if (timeSinceMaintenance < this.MAINTENANCE_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil(
          (this.MAINTENANCE_COOLDOWN_MS - timeSinceMaintenance) / 1000,
        );
        this.logger.warn(
          `[HARERUYA] Service in maintenance mode. Skipping API call. Time remaining: ${remainingSeconds}s`,
        );
        return {
          success: false,
          data: [],
          pagination: {
            totalItems: 0,
            totalItemsAllPages: 0,
            currentPage: filters.page || 1,
            maxPage: 0,
            hasNextPage: false,
            itemsPerPage: filters.rows || 60,
          },
          message:
            'Hareruya API is currently under maintenance. Please try again later.',
        };
      } else {
        // Cooldown period expired, reset maintenance mode
        this.logger.log(
          '[HARERUYA] Maintenance cooldown expired. Resetting and attempting API call.',
        );
        this.maintenanceModeStartTime = null;
        this.htmlResponseCount = 0;
      }
    }

    try {
      const { query, page = 1, rows = 60, priceFilter = '1~*' } = filters;

      if (!query || !query.trim()) {
        return {
          success: false,
          data: [],
          pagination: {
            totalItems: 0,
            totalItemsAllPages: 0,
            currentPage: page,
            maxPage: 0,
            hasNextPage: false,
            itemsPerPage: rows,
          },
          message: 'Query is required',
        };
      }

      const formattedQuery = this.formatSearchQuery(query);

      const apiUrl =
        process.env.HARERUYA_API_BASE_URL ||
        'https://www.hareruyamtg.com/en/products/search/unisearch_api';

      // Build API URL with parameters
      const apiParams = new URLSearchParams({
        kw: formattedQuery,
        'fq.price': priceFilter,
        rows: rows.toString(),
        page: page.toString(),
        user:
          process.env.HARERUYA_USER_ID ||
          '3adcb9a90ba991e0b4b9222f901b884a2c2e30e3870961335e22a57305f19cc4',
      });

      const apiUrlWithParams = `${apiUrl}?${apiParams.toString()}`;

      // Call Hareruya API with browser-like headers
      const response = await fetch(apiUrlWithParams, {
        method: 'GET',
        headers: this.getBrowserHeaders(
          `https://www.hareruyamtg.com/en/products/search?product=${encodeURIComponent(formattedQuery)}`,
        ),
      });

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => 'Unable to read error response');
        this.logger.warn(`[HARERUYA] API error ${response.status}:`, {
          status: response.status,
          statusText: response.statusText,
          url: apiUrlWithParams,
          errorBody: errorText.substring(0, 200),
        });

        // For 403 or any error, return empty results instead of throwing
        if (response.status === 403) {
          this.logger.warn(
            `[HARERUYA] 403 Forbidden - Hareruya requires browser cookies. Returning empty results.`,
          );
        }

        return {
          success: true,
          data: [],
          pagination: {
            totalItems: 0,
            totalItemsAllPages: 0,
            currentPage: page,
            maxPage: 0,
            hasNextPage: false,
            itemsPerPage: 60,
          },
        };
      }

      // Try to parse JSON, but handle errors gracefully
      // Read response text once (can only be read once)
      const responseText = await response
        .text()
        .catch(() => 'Unable to read response');

      // Check if response is HTML (common error case - maintenance page)
      const isHtmlResponse =
        responseText.trim().startsWith('<!DOCTYPE') ||
        responseText.trim().startsWith('<html');

      if (isHtmlResponse) {
        this.htmlResponseCount++;
        this.logger.error(
          `[HARERUYA] Received HTML instead of JSON (count: ${this.htmlResponseCount}/${this.MAINTENANCE_THRESHOLD}):`,
          {
            url: apiUrlWithParams,
            responsePreview: responseText.substring(0, 300),
          },
        );

        // If we've received multiple HTML responses, enter maintenance mode
        if (this.htmlResponseCount >= this.MAINTENANCE_THRESHOLD) {
          if (this.maintenanceModeStartTime === null) {
            this.maintenanceModeStartTime = Date.now();
            this.logger.warn(
              `[HARERUYA] Entering maintenance mode after ${this.htmlResponseCount} HTML responses. Will retry after ${this.MAINTENANCE_COOLDOWN_MS / 1000}s`,
            );
          }
          return {
            success: false,
            data: [],
            pagination: {
              totalItems: 0,
              totalItemsAllPages: 0,
              currentPage: page,
              maxPage: 0,
              hasNextPage: false,
              itemsPerPage: rows,
            },
            message:
              'Hareruya API is currently under maintenance. Please try again later.',
          };
        }

        return {
          success: true,
          data: [],
          pagination: {
            totalItems: 0,
            totalItemsAllPages: 0,
            currentPage: page,
            maxPage: 0,
            hasNextPage: false,
            itemsPerPage: rows,
          },
        };
      }

      // Reset HTML response count on successful JSON response
      if (this.htmlResponseCount > 0) {
        this.logger.log(
          `[HARERUYA] Received valid JSON response. Resetting HTML response count.`,
        );
        this.htmlResponseCount = 0;
        this.maintenanceModeStartTime = null;
      }

      // Check Content-Type to ensure we're getting JSON
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        this.logger.warn(
          `[HARERUYA] Content-Type is ${contentType} but response appears to be JSON. Continuing...`,
        );
      }

      // Try to parse as JSON
      let apiData: HareruyaApiResponse;
      try {
        apiData = JSON.parse(responseText) as HareruyaApiResponse;
      } catch (parseError) {
        this.logger.error(`[HARERUYA] Failed to parse JSON response:`, {
          error:
            parseError instanceof Error ? parseError.message : 'Unknown error',
          url: apiUrlWithParams,
          responsePreview: responseText.substring(0, 300),
        });
        return {
          success: true,
          data: [],
          pagination: {
            totalItems: 0,
            totalItemsAllPages: 0,
            currentPage: page,
            maxPage: 0,
            hasNextPage: false,
            itemsPerPage: rows,
          },
        };
      }

      if (!apiData.response || !apiData.response.docs) {
        this.logger.error('Invalid API response structure:', {
          hasResponse: !!apiData.response,
          hasDocs: !!apiData.response?.docs,
          responseKeys: Object.keys(apiData || {}),
        });
        throw new Error('Invalid API response structure');
      }

      // Validate and transform API documents
      const docs: HareruyaApiDoc[] = apiData.response.docs
        .map((doc: unknown, index: number) => {
          try {
            // Ensure all required fields exist with defaults
            const docRecord = doc as Record<string, unknown>;
            const getString = (value: unknown): string =>
              typeof value === 'string' ? value : '';
            const getStringOrNumber = (value: unknown): string =>
              typeof value === 'string' || typeof value === 'number'
                ? String(value)
                : '0';
            const getFoilFlag = (record: Record<string, unknown>): string => {
              if (typeof record.foil_flg === 'string') return record.foil_flg;
              if (typeof record.foilFlg === 'string') return record.foilFlg;
              if (typeof record.foil === 'string') return record.foil;
              if (typeof record.foil === 'boolean')
                return record.foil ? '1' : '0';
              return '0';
            };
            const docWithDefaults = {
              product: getString(docRecord.product) || '',
              card_name:
                getString(docRecord.card_name) ||
                getString(docRecord.cardName) ||
                '',
              product_name_en:
                getString(docRecord.product_name_en) ||
                getString(docRecord.productNameEn) ||
                getString(docRecord.card_name) ||
                '',
              price: getStringOrNumber(docRecord.price) || '0',
              stock: getStringOrNumber(docRecord.stock) || '0',
              image_url:
                getString(docRecord.image_url) ||
                getString(docRecord.imageUrl) ||
                getString(docRecord.img) ||
                '',
              language: getString(docRecord.language) || 'EN',
              foil_flg: getFoilFlag(docRecord),
              ...docRecord,
            };
            return docWithDefaults as HareruyaApiDoc;
          } catch (parseError) {
            this.logger.error(
              `Error parsing Hareruya API document [${index}]:`,
              parseError,
            );
            return null;
          }
        })
        .filter(
          (doc: HareruyaApiDoc | null): doc is HareruyaApiDoc => doc !== null,
        );

      // Transform documents to search result format
      const data = docs.map((doc) =>
        this.transformHareruyaDocToSearchResult(doc),
      );

      // Calculate pagination info
      const totalItems = apiData.response.numFound || 0;
      const itemsPerPage = rows;
      const maxPage = Math.ceil(totalItems / itemsPerPage);
      const currentPage = page;
      const hasNextPage = currentPage < maxPage;

      return {
        success: true,
        data,
        pagination: {
          totalItems: data.length,
          totalItemsAllPages: totalItems,
          currentPage: currentPage,
          maxPage: maxPage,
          hasNextPage: hasNextPage,
          itemsPerPage: itemsPerPage,
        },
      };
    } catch (error) {
      this.logger.error('Error searching cards:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        success: false,
        data: [],
        pagination: {
          totalItems: 0,
          totalItemsAllPages: 0,
          currentPage: filters.page || 1,
          maxPage: 0,
          hasNextPage: false,
          itemsPerPage: 60,
        },
        message: `Error searching cards: ${errorMessage}`,
      };
    }
  }
}
