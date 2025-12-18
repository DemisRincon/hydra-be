import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }

    // Prisma v7 requires driver adapter
    // Configure pg.Pool for Supabase with pgBouncer compatibility
    const pool = new pg.Pool({
      connectionString,
      // Supabase requires SSL
      ssl: { rejectUnauthorized: false },
      // Connection settings for serverless/pgBouncer
      max: 1, // Limit connections in serverless
      idleTimeoutMillis: 0, // Disable idle timeout
      connectionTimeoutMillis: 10000,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
