# Database Setup Guide

## Initial Setup

### 1. Create Database Schema

First, you need to create the database tables. You have two options:

**Option A: Using Migrations (Recommended for production)**
```bash
pnpm prisma migrate dev --name init
```

**Option B: Push Schema Directly (Quick setup for development)**
```bash
pnpm prisma db push
```

### 2. Seed the Database

After the schema is created, seed the database with initial data (roles):

```bash
pnpm db:seed
```

This will create the following roles:
- **ADMIN** - Administrator
- **CLIENT** - Client
- **SELLER** - Seller

## Creating Users

Once the database is seeded with roles, you can create users via the API:

1. Start the server:
   ```bash
   pnpm start:dev
   ```

2. Open Swagger UI: http://localhost:3000/api

3. Use the POST `/users` endpoint to create a user. You'll need to provide:
   - `email` - User email address
   - `username` - Unique username
   - `password` - User password (optional but recommended)
   - `role_id` - UUID of one of the seeded roles
   - `first_name` - First name
   - `last_name` - Last name
   - `is_active` - Whether the user is active (default: true)

4. To get role IDs, use the GET `/users` endpoint after seeding, or query the database directly.

## Getting Role IDs

After seeding, you can get role IDs by:

1. Using the Supabase SQL Editor:
   ```sql
   SELECT id, name, display_name FROM roles;
   ```

2. Or create a roles endpoint in your API to fetch them.

## Environment Variables

Make sure your `.env` file has:
```
DATABASE_URL="postgresql://postgres.gxkxkjnehvhhxpjrxuhq:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.gxkxkjnehvhhxpjrxuhq:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```
