# Backend Environment Variables Setup

## Required Environment Variables

Create a `.env` file in the `hydra-be` directory with the following variables:

```env
# Database Configuration (Required)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres?sslmode=require"

# JWT Configuration (Required)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="15m"

# Server Configuration
PORT=3002
FRONTEND_URL="http://localhost:3000"

# Supabase Configuration (Required for OAuth - Main Authentication Path)
# Get these from your Supabase project: Settings > API
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"  # Optional, but recommended
```

## Getting Your Database URL

### For Supabase:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **Database**
3. Under **Connection string**, select **URI**
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your database password

Example format:
```
postgresql://postgres.gxkxkjnehvhhxpjrxuhq:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

### For Local PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/hydra_db"
DIRECT_URL="postgresql://postgres:password@localhost:5432/hydra_db"
```

## Quick Setup Steps

1. **Create `.env` file:**
   ```bash
   cd hydra-be
   # Create .env file (copy from example above)
   ```

2. **Add your DATABASE_URL:**
   - Get your database connection string
   - Add it to `.env` file

3. **Generate JWT Secret (optional but recommended):**
   ```bash
   # Generate a random secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Test the connection:**
   ```bash
   # Start the backend
   pnpm start:dev
   ```

5. **If database is empty, seed it:**
   ```bash
   # Push schema
   pnpm prisma db push
   
   # Seed roles
   pnpm db:seed
   ```

## Verification

After setting up, test the connection:

```bash
curl http://localhost:3002/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "roles": 3,
  "timestamp": "..."
}
```

## Troubleshooting

### Error: "DATABASE_URL is not configured"
- Make sure `.env` file exists in `hydra-be` directory
- Check that `DATABASE_URL` is set (no quotes needed in .env file)
- Restart the backend after creating/updating `.env`

### Error: "Connection refused" or "Connection timeout"
- Verify database is accessible
- Check firewall settings
- For Supabase: Ensure you're using the correct connection string (pooler vs direct)

### Error: "SSL required"
- Make sure your connection string includes `?sslmode=require`
- For Supabase, SSL is always required

## Security Notes

- **Never commit `.env` file to git** (it should be in `.gitignore`)
- Use strong, random JWT secrets in production
- Keep database passwords secure
- Use different credentials for development and production

