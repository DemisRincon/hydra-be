import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Prisma client with adapter for Supabase
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting database seed...');

  // Seed roles
  console.log('Seeding roles...');
  
  const roles = [
    {
      name: 'ADMIN' as const,
      display_name: 'Administrator',
    },
    {
      name: 'CLIENT' as const,
      display_name: 'Client',
    },
    {
      name: 'SELLER' as const,
      display_name: 'Seller',
    },
  ];

  for (const role of roles) {
    const existingRole = await prisma.roles.findUnique({
      where: { name: role.name },
    });

    if (existingRole) {
      console.log(`Role ${role.name} already exists, skipping...`);
    } else {
      const created = await prisma.roles.create({
        data: role,
      });
      console.log(`Created role: ${created.display_name} (${created.name})`);
    }
  }

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

