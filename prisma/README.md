# Prisma Configuration for hydra-be

This project uses the same Prisma configuration as `hydra-backend`.

## .env Configuration

Your `.env` file should have the following (matching `hydra-backend`):

```env
# Use Session Mode (port 5432) for DATABASE_URL - required for introspection
DATABASE_URL="postgresql://prisma.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres"

# For migrations, use the same Session Mode connection
DIRECT_URL="postgresql://prisma.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres"
```

**Important:**
- Use `prisma.[PROJECT-REF]` as the username (custom prisma user)
- Use port **5432** (Session Mode) for both `DATABASE_URL` and `DIRECT_URL` for local development
- For serverless deployments, you can override `DATABASE_URL` to use port 6543 (Transaction Mode) in the deployment environment

## Setup Steps

1. **Create Prisma User in Supabase** (if not already done)
   - See `hydra-backend/prisma/setup-supabase-prisma-user.sql`

2. **Update .env** with the connection strings using the prisma user

3. **Run Prisma commands:**
   ```bash
   pnpm prisma db pull      # Introspect database
   pnpm prisma:generate     # Generate Prisma Client
   ```

