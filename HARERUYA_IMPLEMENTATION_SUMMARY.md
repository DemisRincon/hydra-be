# Hareruya Implementation Summary

## Overview
This document summarizes the enhancements made to the Hareruya API integration in `hydra-be` to match the comprehensive implementation from `hydra-backend`.

## New Files Created

### 1. `src/hareruya/currency.service.ts`
- **Purpose**: Currency conversion service
- **Methods**:
  - `convertJPYToMXN()` - Converts Japanese Yen to Mexican Pesos (default rate: 0.15)

### 2. `src/hareruya/hareruya.service.ts`
- **Purpose**: Comprehensive Hareruya API service
- **Key Features**:
  - Browser-like headers to reduce 403 errors
  - Batch processing (5 products at a time with 200ms delays)
  - Variant matching (language + foil status)
  - Currency conversion (JPY → MXN)
  - Language mapping and transformation
  - Metadata extraction (foil, borderless, extended art, etc.)
  - Comprehensive error handling

- **Methods**:
  - `getHareruyaPricing()` - Fetch pricing for multiple products
  - `getPriceForSingle()` - Get price for a single product with variant matching
  - `getPricesForSingles()` - Bulk pricing for multiple products
  - `searchCards()` - Full card search with data transformation
  - `transformToHareruyaPricing()` - Transform API docs to pricing format
  - `transformHareruyaDocToSearchResult()` - Transform API docs to search results
  - `normalizeLanguage()` - Normalize language names
  - `formatSearchQuery()` - Format search queries (handles double-faced cards)
  - `getBrowserHeaders()` - Generate browser-like headers

### 3. `src/hareruya/hareruya.module.ts`
- **Purpose**: NestJS module for Hareruya services
- **Exports**: `HareruyaService`, `CurrencyService`

### 4. `src/hareruya/dto/hareruya-pricing.dto.ts`
- **Purpose**: DTO for pricing requests
- **Fields**:
  - `productIds: string[]` - Array of Hareruya product IDs
  - `cardNames?: string[]` - Optional card names for better matching

## Enhanced Files

### 1. `src/search/search.service.ts`
**Enhancements**:
- ✅ Added browser-like headers (reduces 403 errors)
- ✅ Better error handling (returns empty results for 403 instead of throwing)
- ✅ Added logging with Logger
- ✅ Added `searchCards()` method that uses HareruyaService for transformation
- ✅ Improved error messages and logging

**Changes**:
- Now uses `HareruyaService` for transformed search results
- Headers include: User-Agent, Accept-Language, Referer, Origin, Sec-Fetch-*, etc.
- Handles 403 errors gracefully by returning empty results

### 2. `src/search/search.controller.ts`
**New Endpoints**:
- `GET /api/search/hareruya/cards?query=...&page=...` - Transformed search results
- `POST /api/search/hareruya/pricing` - Get pricing for multiple products

**Existing Endpoint** (Enhanced):
- `GET /api/search/hareruya?kw=...` - Now uses browser-like headers

### 3. `src/search/search.module.ts`
- Added `HareruyaModule` import

### 4. `src/app.module.ts`
- Added `HareruyaModule` to imports

## API Endpoints

### 1. Search (Raw API Response)
```
GET /api/search/hareruya?kw=Lightning+Bolt&rows=12&page=1
```
- Returns raw Hareruya API response
- Enhanced with browser-like headers
- Better error handling

### 2. Search (Transformed)
```
GET /api/search/hareruya/cards?query=Lightning+Bolt&page=1
```
- Returns transformed `HareruyaSearchResult[]`
- Includes currency conversion (JPY → MXN)
- Language mapping to Spanish
- Metadata extraction
- Pagination info

### 3. Get Pricing
```
POST /api/search/hareruya/pricing
Body: {
  "productIds": ["12345", "67890"],
  "cardNames": ["Lightning Bolt", "Black Lotus"] // optional
}
```
- Returns pricing for multiple products
- Supports variant matching (language + foil)
- Returns all variants per product
- Batch processing (5 at a time)

## Key Improvements

### 1. Browser-like Headers
**Before**:
```typescript
headers: {
  'Accept': 'application/json',
  'User-Agent': 'Hydra-BE/1.0',
}
```

**After**:
```typescript
headers: {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
  'Accept': '*/*',
  'Accept-Language': 'es-US,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://www.hareruyamtg.com/...',
  'Origin': 'https://www.hareruyamtg.com',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'X-Requested-With': 'XMLHttpRequest',
}
```

### 2. Error Handling
**Before**: Throws exception on any error
**After**: 
- Returns empty results for 403 errors
- Continues processing other products if one fails
- Detailed error logging
- Error messages in response

### 3. Data Transformation
**Before**: Returns raw API response
**After**: 
- Transforms to structured interfaces
- Currency conversion (JPY → MXN)
- Language mapping (codes → Spanish names)
- Metadata extraction
- Card name cleaning
- Set information extraction

### 4. Variant Matching
**New Feature**: Matches products by:
- Language (normalized)
- Foil status
- Product ID

### 5. Batch Processing
**New Feature**: 
- Processes 5 products per batch
- 200ms delay between batches
- Prevents rate limiting

## Language Mapping

The service includes comprehensive language mapping:

```typescript
Hareruya Code → English → Spanish Display
'1' → 'JAPANESE' → 'Japonés'
'2' → 'ENGLISH' → 'Inglés'
'3' → 'FRENCH' → 'Francés'
'4' → 'CHINESE' → 'Chino'
'5' → 'FRENCH' → 'Francés'
'6' → 'GERMAN' → 'Alemán'
'7' → 'ITALIAN' → 'Italiano'
'8' → 'KOREAN' → 'Coreano'
'9' → 'PORTUGUESE' → 'Portugués'
'10' → 'RUSSIAN' → 'Ruso'
'11' → 'SPANISH' → 'Español'
'12' → 'ENGLISH' → 'Inglés'
```

## Usage Examples

### Example 1: Get Pricing for Products
```typescript
const result = await hareruyaService.getHareruyaPricing({
  productIds: ['12345', '67890'],
  cardNames: ['Lightning Bolt', 'Black Lotus'],
});

// Returns:
// {
//   success: true,
//   pricing: [
//     {
//       productId: '12345',
//       name: 'Lightning Bolt',
//       price: 1000, // JPY
//       currency: 'JPY',
//       language: 'ENGLISH',
//       isFoil: false,
//       ...
//     },
//     ...
//   ],
//   total: 2,
// }
```

### Example 2: Search Cards
```typescript
const result = await hareruyaService.searchCards({
  query: 'Lightning Bolt',
  page: 1,
});

// Returns:
// {
//   success: true,
//   data: [
//     {
//       id: '12345',
//       title: 'Lightning Bolt (M21)',
//       price: '$150.00 MXN',
//       priceJPY: '¥1,000',
//       priceMXN: '$150.00 MXN',
//       language: 'Inglés',
//       languageCode: 'EN',
//       finalPrice: 150.0,
//       ...
//     },
//     ...
//   ],
//   pagination: {
//     totalItems: 10,
//     totalItemsAllPages: 50,
//     currentPage: 1,
//     maxPage: 1,
//     hasNextPage: false,
//     itemsPerPage: 60,
//   },
// }
```

### Example 3: Get Single Product Price
```typescript
const price = await hareruyaService.getPriceForSingle({
  hareruya_product_id: '12345',
  is_foil: false,
  language: 'ENGLISH',
  name: 'Lightning Bolt',
});

// Returns: 150.0 (MXN) or null if not found
```

## Testing

All endpoints are public (no authentication required) and can be tested via:

1. **Swagger UI**: `http://localhost:3002/api` (search for "search" tag)
2. **cURL**:
   ```bash
   # Search (raw)
   curl "http://localhost:3002/api/search/hareruya?kw=Lightning+Bolt&rows=12&page=1"
   
   # Search (transformed)
   curl "http://localhost:3002/api/search/hareruya/cards?query=Lightning+Bolt&page=1"
   
   # Get Pricing
   curl -X POST "http://localhost:3002/api/search/hareruya/pricing" \
     -H "Content-Type: application/json" \
     -d '{"productIds": ["12345"], "cardNames": ["Lightning Bolt"]}'
   ```

## Next Steps

1. ✅ Currency conversion implemented
2. ✅ Browser-like headers implemented
3. ✅ Error handling improved
4. ✅ Data transformation added
5. ✅ Variant matching implemented
6. ✅ Batch processing added
7. ✅ Language mapping added
8. ✅ New endpoints created

**Note**: Database modifications were not made as requested. All changes are API-only.


