import { Module } from '@nestjs/common';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { HareruyaModule } from '../hareruya/hareruya.module.js';
import { PrismaModule } from '../database/prisma.module.js';
import { ProductsModule } from '../products/products.module.js';

@Module({
  imports: [HareruyaModule, PrismaModule, ProductsModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
