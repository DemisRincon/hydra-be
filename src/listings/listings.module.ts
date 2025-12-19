import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service.js';
import { ListingsController } from './listings.controller.js';
import { PrismaModule } from '../database/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}

