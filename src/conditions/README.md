# Conditions API - CRUD Operations

This module provides complete CRUD (Create, Read, Update, Delete) operations for conditions.

## API Endpoints

**Authentication:**
- **GET endpoints**: Public (no authentication required)
- **POST, PATCH, DELETE endpoints**: Require authentication with ADMIN or SELLER role

### Create Condition

```
POST /api/conditions
```

**Authentication Required:** ADMIN or SELLER role

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "code": "NM",
  "name": "Cerca de Mint",
  "display_name": "Cerca de Mint"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "code": "NM",
  "name": "Cerca de Mint",
  "display_name": "Cerca de Mint"
}
```

### Get All Conditions

```
GET /api/conditions
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "code": "NM",
    "name": "Cerca de Mint",
    "display_name": "Cerca de Mint"
  },
  {
    "id": "uuid",
    "code": "SP",
    "name": "Ligeramente Jugada",
    "display_name": "Ligeramente Jugada"
  }
]
```

### Get Condition by ID

```
GET /api/conditions/:id
```

**Response (200):**
```json
{
  "id": "uuid",
  "code": "NM",
  "name": "Cerca de Mint",
  "display_name": "Cerca de Mint",
  "_count": {
    "products": 5
  }
}
```

### Get Condition by Code

```
GET /api/conditions/code/:code
```

**Example:**
```
GET /api/conditions/code/NM
```

**Response (200):**
```json
{
  "id": "uuid",
  "code": "NM",
  "name": "Cerca de Mint",
  "display_name": "Cerca de Mint",
  "_count": {
    "products": 5
  }
}
```

### Update Condition

```
PATCH /api/conditions/:id
```

**Authentication Required:** ADMIN or SELLER role

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body (all fields optional):**
```json
{
  "code": "NM",
  "name": "Cerca de Mint",
  "display_name": "Cerca de Mint (Near Mint)"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "code": "NM",
  "name": "Cerca de Mint",
  "display_name": "Cerca de Mint (Near Mint)"
}
```

### Delete Condition

```
DELETE /api/conditions/:id
```

**Authentication Required:** ADMIN or SELLER role

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "message": "Condition with ID {id} has been deleted successfully"
}
```

**Error (400):**
```json
{
  "statusCode": 400,
  "message": "Cannot delete condition with ID {id} because it has {count} product(s) assigned to it",
  "error": "Bad Request"
}
```

## Condition Codes

Supported condition codes (Hareruya mapping):
- `NM` - Cerca de Mint (Near Mint) - Hareruya code: 1
- `SP` - Ligeramente Jugada (Lightly Played) - Hareruya code: 2
- `MP` - Moderadamente Jugada (Moderately Played) - Hareruya code: 3
- `HP` - Muy Jugada (Highly Played) - Hareruya code: 4
- `DM` - Dañada (Damaged) - Hareruya code: 5

## Validation Rules

- `code`: Required, unique, max 10 characters
- `name`: Required, unique, human-readable name in Spanish
- `display_name`: Required, display name for UI

## Error Responses

### 409 Conflict
- Condition with this code already exists
- Condition with this name already exists

### 404 Not Found
- Condition with specified ID not found
- Condition with specified code not found

### 400 Bad Request
- Invalid input data
- Cannot delete condition with products assigned

## Example Usage

### Create a new condition
```bash
curl -X POST http://localhost:3002/api/conditions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "NM",
    "name": "Cerca de Mint",
    "display_name": "Cerca de Mint"
  }'
```

### Get all conditions
```bash
curl http://localhost:3002/api/conditions
```

### Get condition by code
```bash
curl http://localhost:3002/api/conditions/code/NM
```

### Update condition
```bash
curl -X PATCH http://localhost:3002/api/conditions/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "display_name": "Cerca de Mint (Near Mint)"
  }'
```

### Delete condition
```bash
curl -X DELETE http://localhost:3002/api/conditions/{id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Notes

- **GET endpoints** are public (no authentication required)
- **POST, PATCH, DELETE endpoints** require ADMIN or SELLER role
- Conditions cannot be deleted if they have products assigned
- Both `code` and `name` must be unique
- The `_count.products` field shows how many products use this condition
- Hareruya condition codes are automatically mapped when creating products from Hareruya data


