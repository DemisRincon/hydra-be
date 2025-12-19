# Languages API - CRUD Operations

This module provides complete CRUD (Create, Read, Update, Delete) operations for languages.

## API Endpoints

**Authentication:**
- **GET endpoints**: Public (no authentication required)
- **POST, PATCH, DELETE endpoints**: Require authentication with ADMIN or SELLER role

### Create Language

```
POST /api/languages
```

**Authentication Required:** ADMIN or SELLER role

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "code": "EN",
  "name": "Inglés",
  "display_name": "Inglés"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "code": "EN",
  "name": "Inglés",
  "display_name": "Inglés"
}
```

### Get All Languages

```
GET /api/languages
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "code": "EN",
    "name": "Inglés",
    "display_name": "Inglés"
  },
  {
    "id": "uuid",
    "code": "JP",
    "name": "Japonés",
    "display_name": "Japonés"
  }
]
```

### Get Language by ID

```
GET /api/languages/:id
```

**Response (200):**
```json
{
  "id": "uuid",
  "code": "EN",
  "name": "Inglés",
  "display_name": "Inglés",
  "_count": {
    "products": 5
  }
}
```

### Get Language by Code

```
GET /api/languages/code/:code
```

**Example:**
```
GET /api/languages/code/EN
```

**Response (200):**
```json
{
  "id": "uuid",
  "code": "EN",
  "name": "Inglés",
  "display_name": "Inglés",
  "_count": {
    "products": 5
  }
}
```

### Update Language

```
PATCH /api/languages/:id
```

**Authentication Required:** ADMIN or SELLER role

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body (all fields optional):**
```json
{
  "code": "EN",
  "name": "Inglés",
  "display_name": "Inglés (English)"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "code": "EN",
  "name": "Inglés",
  "display_name": "Inglés (English)"
}
```

### Delete Language

```
DELETE /api/languages/:id
```

**Authentication Required:** ADMIN or SELLER role

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "message": "Language with ID {id} has been deleted successfully"
}
```

**Error (400):**
```json
{
  "statusCode": 400,
  "message": "Cannot delete language with ID {id} because it has {count} product(s) assigned to it",
  "error": "Bad Request"
}
```

## Language Codes

Supported language codes:
- `JP` - Japonés
- `EN` - Inglés
- `CS` - Chino Simplificado
- `CT` - Chino Tradicional
- `FR` - Francés
- `DE` - Alemán
- `IT` - Italiano
- `KO` - Coreano
- `PT` - Portugués
- `RU` - Ruso
- `ES` - Español
- `AG` - Antiguo

## Validation Rules

- `code`: Required, unique, max 10 characters
- `name`: Required, unique, human-readable name in Spanish
- `display_name`: Required, display name for UI

## Error Responses

### 409 Conflict
- Language with this code already exists
- Language with this name already exists

### 404 Not Found
- Language with specified ID not found
- Language with specified code not found

### 400 Bad Request
- Invalid input data
- Cannot delete language with products assigned

## Example Usage

### Create a new language
```bash
curl -X POST http://localhost:3002/api/languages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "FR",
    "name": "Francés",
    "display_name": "Francés"
  }'
```

### Get all languages
```bash
curl http://localhost:3002/api/languages
```

### Get language by code
```bash
curl http://localhost:3002/api/languages/code/EN
```

### Update language
```bash
curl -X PATCH http://localhost:3002/api/languages/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "display_name": "Inglés (English)"
  }'
```

### Delete language
```bash
curl -X DELETE http://localhost:3002/api/languages/{id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Notes

- **GET endpoints** are public (no authentication required)
- **POST, PATCH, DELETE endpoints** require ADMIN or SELLER role
- Languages cannot be deleted if they have products assigned
- Both `code` and `name` must be unique
- The `_count.products` field shows how many products use this language

