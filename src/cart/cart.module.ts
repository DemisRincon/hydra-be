import { Module } from '@nestjs/common';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { PrismaModule } from '../database/prisma.module.js';
import { SearchModule } from '../search/search.module.js';
import { HareruyaModule } from '../hareruya/hareruya.module.js';

@Module({
  imports: [PrismaModule, SearchModule, HareruyaModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
