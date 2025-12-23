# Migration Steps for Products with Owner

## Step 1: Regenerate Prisma Client

After updating the schema, you MUST regenerate the Prisma client:

```bash
cd hydra-be
pnpm prisma generate
```

## Step 2: Create Database Migration

Run the migration to update your database:

```bash
pnpm prisma migrate dev --name add_product_owner_and_hareruya_fields
```

Or if you prefer to push directly (development only):

```bash
pnpm prisma db push
```

## Step 3: Restart Backend

After migration, restart your backend:

```bash
pnpm start:dev
```

## Schema Changes

### Products Model
- Added `owner_id` (required) - References users table
- Added Hareruya-specific fields:
  - `hareruya_product_id` (unique, optional)
  - `card_name`
  - `product_name_en`
  - `product_name_jp`
  - `is_foil`
  - `hareruya_stock`
  - `hareruya_product_class`
  - `hareruya_sale_flg`
  - `hareruya_weekly_sales`
  - `created_at`
  - `updated_at`

### Users Model
- Added `ownedProducts` relation to products

## Important Notes

- **All products must have an owner** - `owner_id` is required
- The owner must be a valid user in the database
- When creating products, you must provide `owner_id` in the request



