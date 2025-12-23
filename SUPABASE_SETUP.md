# Supabase Setup - Main Authentication Path

## Required Supabase Environment Variables

Since Supabase is the **main authentication path** for OAuth, you **must** configure these environment variables in your `.env` file:

```env
# Supabase Configuration (REQUIRED for OAuth)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
```

## Getting Your Supabase Credentials

1. **Go to your Supabase project dashboard**
2. **Navigate to Settings > API**
3. **Copy the following:**
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`

## Complete .env File Example

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

# Supabase Configuration (REQUIRED - Main Authentication Path)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"  # Optional but recommended
```

## Quick Setup

1. **Get your Supabase credentials** (see above)

2. **Add to `.env` file in `hydra-be` directory:**
   ```env
   SUPABASE_URL="https://xxxxx.supabase.co"
   SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

3. **Restart the backend:**
   ```bash
   cd hydra-be
   pnpm start:dev
   ```

## Verification

After adding Supabase credentials, the backend should start without errors. You should see:
```
[Nest] Application successfully started
```

## OAuth Flow

With Supabase configured, the OAuth flow works as follows:

1. **Frontend** → User clicks "Continue with Google"
2. **Supabase** → Handles Google OAuth
3. **Frontend Callback** → `/api/auth/oauth/callback` receives Supabase user data
4. **Backend** → `/api/auth/oauth/supabase` creates/links user account
5. **Backend** → Returns JWT token for your backend API

## Troubleshooting

### Error: "Supabase URL and Key must be configured"

**Solution:** Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your `.env` file

### Error: "Cannot connect to Supabase"

**Check:**
- Verify `SUPABASE_URL` is correct (should start with `https://`)
- Verify `SUPABASE_ANON_KEY` is the anon/public key (not service_role key)
- Check Supabase project is active

### OAuth Not Working

**Verify:**
1. Supabase credentials are in `.env` file
2. Backend restarted after adding credentials
3. Frontend has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Supabase redirect URL is configured: `http://localhost:3000/api/auth/oauth/callback`

## Important Notes

- **Supabase is the main authentication path** - OAuth requires these credentials
- The `SUPABASE_JWT_SECRET` is optional but recommended for additional security
- Never commit your `.env` file to git
- Use different Supabase projects for development and production



