import { Injectable, Logger } from '@nestjs/common';

// Static exchange rates (fallback)
// In production, these would be fetched from an API
const EXCHANGE_RATES_TO_EUR: Record<string, number> = {
  EUR: 1.0,
  USD: 0.92,
  GBP: 1.17,
  CHF: 1.04,
  JPY: 0.0062,
  CAD: 0.68,
  AUD: 0.60,
};

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private exchangeRates: Record<string, number> = { ...EXCHANGE_RATES_TO_EUR };
  private lastUpdated: Date = new Date();

  constructor() {
    // In production, we would fetch rates periodically
    this.logger.log('Currency service initialized with static exchange rates');
  }

  /**
   * Convert an amount from one currency to EUR
   */
  convertToEur(amount: number, fromCurrency: string): number {
    if (fromCurrency === 'EUR') {
      return amount;
    }

    const rate = this.exchangeRates[fromCurrency];
    if (!rate) {
      this.logger.warn(`Unknown currency: ${fromCurrency}, using 1:1 rate`);
      return amount;
    }

    return amount * rate;
  }

  /**
   * Convert an amount from EUR to another currency
   */
  convertFromEur(amount: number, toCurrency: string): number {
    if (toCurrency === 'EUR') {
      return amount;
    }

    const rate = this.exchangeRates[toCurrency];
    if (!rate) {
      this.logger.warn(`Unknown currency: ${toCurrency}, using 1:1 rate`);
      return amount;
    }

    return amount / rate;
  }

  /**
   * Convert an amount between any two currencies
   */
  convert(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Convert to EUR first, then to target currency
    const eurAmount = this.convertToEur(amount, fromCurrency);
    return this.convertFromEur(eurAmount, toCurrency);
  }

  /**
   * Get current exchange rate to EUR
   */
  getRate(currency: string): number {
    return this.exchangeRates[currency] || 1;
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): string[] {
    return Object.keys(this.exchangeRates);
  }

  /**
   * Get all exchange rates
   */
  getAllRates(): Record<string, number> {
    return { ...this.exchangeRates };
  }

  /**
   * Format amount with currency symbol
   */
  formatCurrency(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(amount);
  }

  /**
   * Update exchange rates (would be called by a scheduler in production)
   */
  async updateRates(): Promise<void> {
    // In production, fetch from an API like exchangerate-api.com
    // For now, we just log
    this.logger.log('Exchange rates update triggered (using static rates)');
    this.lastUpdated = new Date();
  }

  getLastUpdated(): Date {
    return this.lastUpdated;
  }
}
