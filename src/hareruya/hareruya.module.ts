import { Module } from '@nestjs/common';
import { HareruyaService } from './hareruya.service.js';
import { CurrencyService } from './currency.service.js';

@Module({
  providers: [HareruyaService, CurrencyService],
  exports: [HareruyaService, CurrencyService],
})
export class HareruyaModule {}


