# OAuth Integration Test Guide

## Prerequisites

1. **Backend Environment Variables** (`.env` in `hydra-be/`):
```env
DATABASE_URL=your-database-url
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=15m
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
FRONTEND_URL=http://localhost:3000
PORT=3002
```

2. **Frontend Environment Variables** (`.env.local` in `hydra-fe/`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Testing Steps

### 1. Test Database Connection

```bash
# Start backend
cd hydra-be
pnpm start:dev

# In another terminal, test health endpoint
curl http://localhost:3002/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "roles": 3,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Test OAuth Endpoint (Manual)

```bash
curl -X POST http://localhost:3002/api/auth/oauth/supabase \
  -H "Content-Type: application/json" \
  -d '{
    "supabaseUserId": "test-user-id",
    "email": "test@example.com",
    "provider": "google",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Expected response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "username": "test",
    "first_name": "Test",
    "last_name": "User",
    "role": {
      "id": "...",
      "name": "CLIENT",
      "display_name": "Client"
    }
  },
  "isNewUser": true
}
```

### 3. Test Full OAuth Flow

1. Start backend: `cd hydra-be && pnpm start:dev`
2. Start frontend: `cd hydra-fe && pnpm dev`
3. Navigate to `http://localhost:3000/login`
4. Click "Continue with Google"
5. Complete Google OAuth
6. Should redirect back and log in successfully

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` is correct
- Verify database is accessible
- Check SSL settings for Supabase

### OAuth Issues
- Verify Supabase redirect URLs are configured
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Ensure backend has `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### CORS Issues
- Verify `FRONTEND_URL` in backend `.env` matches frontend URL
- Check CORS settings in `main.ts`



