
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to database...');
    const count = await prisma.user_addresses.count();
    console.log(`User addresses count: ${count}`);
    
    // Also check if any user exists
    const userCount = await prisma.users.count();
    console.log(`Users count: ${userCount}`);
     
  } catch (e) {
    console.error('Error querying database:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
