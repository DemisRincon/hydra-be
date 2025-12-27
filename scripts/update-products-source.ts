import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Prisma client with adapter for Supabase
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const pool: pg.Pool = new pg.Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
  options: '-c client_encoding=UTF8',
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function updateProductsSource() {
  try {
    console.log('🔄 Starting to update products source to "local" and isLocalInventory to true...');

    // Update all products with source='hareruya', 'manual', or null to 'local'
    // Also update isLocalInventory to true for all products
    const result = await prisma.singles.updateMany({
      where: {
        OR: [{ source: 'hareruya' }, { source: 'manual' }, { source: null }],
      },
      data: {
        source: 'local',
        isLocalInventory: true,
      },
    });

    // Also update products that have isLocalInventory=false
    const result2 = await prisma.singles.updateMany({
      where: {
        isLocalInventory: false,
      },
      data: {
        isLocalInventory: true,
      },
    });

    console.log(`✅ Successfully updated ${result.count} products to have source='local'`);
    console.log(`✅ Successfully updated ${result2.count} products to have isLocalInventory=true`);
    console.log('\n📊 Summary:');
    console.log(`   - Products with source updated: ${result.count}`);
    console.log(`   - Products with isLocalInventory updated: ${result2.count}`);

    // Show some statistics
    const totalProducts = await prisma.singles.count();
    const localProducts = await prisma.singles.count({
      where: { source: 'local' },
    });
    const hareruyaProducts = await prisma.singles.count({
      where: { source: 'hareruya' },
    });
    const manualProducts = await prisma.singles.count({
      where: { source: 'manual' },
    });
    const nullSourceProducts = await prisma.singles.count({
      where: { source: null },
    });
    const localInventoryProducts = await prisma.singles.count({
      where: { isLocalInventory: true },
    });
    const nonLocalInventoryProducts = await prisma.singles.count({
      where: { isLocalInventory: false },
    });

    console.log('\n📈 Current database state:');
    console.log(`   - Total products: ${totalProducts}`);
    console.log(`   - Products with source='local': ${localProducts}`);
    console.log(`   - Products with source='hareruya': ${hareruyaProducts}`);
    console.log(`   - Products with source='manual': ${manualProducts}`);
    console.log(`   - Products with source=null: ${nullSourceProducts}`);
    console.log(`   - Products with isLocalInventory=true: ${localInventoryProducts}`);
    console.log(`   - Products with isLocalInventory=false: ${nonLocalInventoryProducts}`);

    return {
      success: true,
      updated: result.count,
      message: `Successfully updated ${result.count} products to have source='local'`,
    };
  } catch (error) {
    console.error('❌ Error updating products:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateProductsSource()
  .then((result) => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

