import { Injectable } from '@nestjs/common';

@Injectable()
export class CurrencyService {
  /**
   * Convert JPY to MXN
   * @param jpyAmount Amount in Japanese Yen
   * @param exchangeRate Exchange rate (default: 0.15, meaning 1 JPY = 0.15 MXN)
   * @returns Amount in Mexican Pesos
   */
  convertJPYToMXN(jpyAmount: number, exchangeRate: number = 0.15): number {
    return jpyAmount * exchangeRate;
  }
}


