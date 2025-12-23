# Hareruya Search API

This module provides an endpoint to search the Hareruya MTG API for Magic: The Gathering cards.

## Endpoint

```
GET /api/search/hareruya
```

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `kw` | string | Yes | - | Search keyword (card name) |
| `rows` | number | No | 12 | Number of results per page (1-100) |
| `page` | number | No | 1 | Page number (minimum 1) |
| `fq.price` | string | No | - | Price filter (e.g., "1~*" for minimum price 1) |

## Examples

### Basic Search

```bash
GET /api/search/hareruya?kw=Rograkh,%20Son%20of%20Rohgahh
```

### Search with Pagination

```bash
GET /api/search/hareruya?kw=Lightning%20Bolt&rows=20&page=2
```

### Search with Price Filter

```bash
GET /api/search/hareruya?kw=Rograkh,%20Son%20of%20Rohgahh&fq.price=1~*
```

### Full Example

```bash
GET /api/search/hareruya?kw=Rograkh,%20Son%20of%20Rohgahh&rows=12&page=1&fq.price=1~*
```

## Response Format

The API returns the raw response from Hareruya API:

```json
{
  "responseHeader": {
    "status": 0,
    "QTime": "1",
    "reqID": "..."
  },
  "response": {
    "numFound": 14,
    "docs": [
      {
        "product": "178410",
        "product_name": "...",
        "product_name_en": "...",
        "card_name": "Rograkh, Son of Rohgahh",
        "language": "1",
        "price": "8000",
        "image_url": "https://...",
        "foil_flg": "0",
        "stock": "30",
        "weekly_sales": "4",
        "product_class": "1169548",
        "card_condition": "1",
        "sale_flg": "0"
      }
    ],
    "page": 1
  }
}
```

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Keyword (kw) is required",
  "error": "Bad Request"
}
```

## Testing

You can test the endpoint using curl:

```bash
curl "http://localhost:3002/api/search/hareruya?kw=Rograkh,%20Son%20of%20Rohgahh&rows=12&page=1"
```

Or using the Swagger UI at `http://localhost:3002/api` (search for "search" tag).

## Notes

- The endpoint is public (no authentication required)
- The API proxies requests to Hareruya MTG API
- All query parameters are URL-encoded
- The `kw` parameter should be URL-encoded (e.g., `Rograkh, Son of Rohgahh` becomes `Rograkh%2C%20Son%20of%20Rohgahh`)



