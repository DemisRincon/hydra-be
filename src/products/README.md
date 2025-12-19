# Products Module - Hareruya Integration

This module handles product creation and management from Hareruya MTG API data.

## Database Migration Required

**IMPORTANT:** After updating the schema, you MUST:

1. **Regenerate Prisma Client:**
   ```bash
   cd hydra-be
   pnpm prisma generate
   ```

2. **Run Migration:**
   ```bash
   pnpm prisma migrate dev --name add_product_owner_and_hareruya_fields
   ```

   Or if you prefer to push directly (development only):
   ```bash
   pnpm prisma db push
   ```

3. **Restart Backend:**
   ```bash
   pnpm start:dev
   ```

## API Endpoints

### Create/Update Product from Hareruya

```
POST /api/products/hareruya
```

**Request Body:**
```json
{
  "hareruyaProduct": {
    "product": "91507",
    "product_name": "【Foil】(197)《ロフガフフの息子、ログラクフ/Rograkh, Son of Rohgahh》[CMR] 赤U",
    "product_name_en": "【Foil】《Rograkh, Son of Rohgahh》[CMR]",
    "card_name": "Rograkh, Son of Rohgahh",
    "language": "2",
    "price": "200",
    "image_url": "https://files.hareruyamtg.com/img/goods/L/CMR/EN/0197.jpg",
    "foil_flg": "1",
    "stock": "0",
    "weekly_sales": "0",
    "product_class": "592857",
    "card_condition": "1",
    "sale_flg": "0"
  },
  "owner_id": "user-uuid-here", // REQUIRED - User who owns this product
  "category_id": "optional-uuid" // Optional, will create "Single" category if not provided
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "【Foil】《Rograkh, Son of Rohgahh》[CMR]",
  "price": "200.00",
  "image_url": "https://...",
  "hareruya_product_id": "91507",
  "card_name": "Rograkh, Son of Rohgahh",
  "product_name_en": "【Foil】《Rograkh, Son of Rohgahh》[CMR]",
  "product_name_jp": "【Foil】(197)《ロフガフフの息子、ログラクフ/Rograkh, Son of Rohgahh》[CMR] 赤U",
  "is_foil": true,
  "hareruya_stock": 0,
  "hareruya_product_class": "592857",
  "hareruya_sale_flg": false,
  "hareruya_weekly_sales": 0,
  "categories": { ... },
  "conditions": { ... },
  "languages": { ... }
}
```

### Find Product by Hareruya ID

```
GET /api/products/hareruya/:hareruyaId
```

**Example:**
```
GET /api/products/hareruya/91507
```

### Get All Products

```
GET /api/products?page=1&limit=20
```

## Features

- **Product Ownership**: Every product must have an owner (user)
- **Automatic Category Creation**: If no category is provided, creates a "Single" category
- **Language Mapping**: Maps Hareruya language codes (1=Japanese, 2=English) to language records
- **Condition Mapping**: Maps Hareruya condition codes to condition records
- **Duplicate Prevention**: Uses `hareruya_product_id` as unique identifier
- **Auto-Update**: If product with same Hareruya ID exists, updates it instead of creating duplicate
- **Owner Validation**: Verifies that the owner user exists before creating product

## Field Mappings

| Hareruya Field | Database Field | Type | Notes |
|----------------|----------------|------|-------|
| `product` | `hareruya_product_id` | String (unique) | Unique identifier |
| `card_name` | `card_name` | String | Card name |
| `product_name_en` | `product_name_en` | String | English product name |
| `product_name` | `product_name_jp` | String | Japanese product name |
| `price` | `price` | Decimal | Price in JPY |
| `image_url` | `image_url` | String | Product image |
| `foil_flg` | `is_foil` | Boolean | 1=true, 0=false |
| `stock` | `hareruya_stock` | Int | Stock from Hareruya |
| `product_class` | `hareruya_product_class` | String | Product class ID |
| `sale_flg` | `hareruya_sale_flg` | Boolean | 1=true, 0=false |
| `weekly_sales` | `hareruya_weekly_sales` | Int | Weekly sales count |
| `language` | `language_id` | UUID | Mapped to language record |
| `card_condition` | `condition_id` | UUID | Mapped to condition record |

## Example Usage

### Using curl

```bash
curl -X POST http://localhost:3002/api/products/hareruya \
  -H "Content-Type: application/json" \
  -d '{
    "hareruyaProduct": {
      "product": "91507",
      "product_name": "【Foil】(197)《ロフガフフの息子、ログラクフ/Rograkh, Son of Rohgahh》[CMR] 赤U",
      "product_name_en": "【Foil】《Rograkh, Son of Rohgahh》[CMR]",
      "card_name": "Rograkh, Son of Rohgahh",
      "language": "2",
      "price": "200",
      "image_url": "https://files.hareruyamtg.com/img/goods/L/CMR/EN/0197.jpg",
      "foil_flg": "1",
      "stock": "0",
      "weekly_sales": "0",
      "product_class": "592857",
      "card_condition": "1",
      "sale_flg": "0"
    },
    "owner_id": "user-uuid-here"
  }'
```

## Integration with Search API

You can combine the search and product creation:

1. Search Hareruya: `GET /api/search/hareruya?kw=cardname`
2. Extract product from response
3. Create product: `POST /api/products/hareruya` with the product data

