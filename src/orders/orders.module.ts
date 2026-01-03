import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { CartModule } from '../cart/cart.module.js';
import { PaymentsModule } from '../payments/payments.module.js';

@Module({
  imports: [CartModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

