import { Injectable, Logger } from '@nestjs/common';
import YahooFinanceClass from 'yahoo-finance2';

@Injectable()
export class CurrencyConverterService {
  private readonly logger = new Logger(CurrencyConverterService.name);
  private readonly yahooFinance: typeof YahooFinanceClass.prototype;
  private readonly rateCache: Map<string, { rate: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 3600000; // 1 ora in millisecondi

  constructor() {
    this.yahooFinance = new YahooFinanceClass();
    this.logger.log('Currency Converter service initialized');
  }

  /**
   * Converti un importo da una valuta a EUR
   */
  async convertToEUR(amount: number, fromCurrency: string): Promise<number> {
    // Se è già in EUR, ritorna il valore originale
    if (fromCurrency === 'EUR') {
      return amount;
    }

    try {
      const rate = await this.getExchangeRate(fromCurrency, 'EUR');
      const convertedAmount = amount * rate;

      this.logger.log(
        `Converted ${amount} ${fromCurrency} to ${convertedAmount.toFixed(4)} EUR (rate: ${rate.toFixed(6)})`,
      );

      return convertedAmount;
    } catch (error) {
      this.logger.error(
        `Failed to convert ${fromCurrency} to EUR: ${error.message}`,
      );
      throw new Error(
        `Currency conversion failed from ${fromCurrency} to EUR`,
      );
    }
  }

  /**
   * Ottieni il tasso di cambio tra due valute usando Yahoo Finance
   * Yahoo Finance usa il formato: USDEUR=X per USD->EUR
   */
  private async getExchangeRate(
    from: string,
    to: string,
  ): Promise<number> {
    const cacheKey = `${from}${to}`;

    // Controlla se abbiamo un valore in cache valido
    const cached = this.rateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      this.logger.debug(
        `Using cached exchange rate for ${from}->${to}: ${cached.rate}`,
      );
      return cached.rate;
    }

    try {
      // Yahoo Finance usa il formato FROMT0=X per i tassi di cambio
      const symbol = `${from}${to}=X`;

      this.logger.debug(`Fetching exchange rate from Yahoo Finance: ${symbol}`);

      const quote: any = await this.yahooFinance.quote(symbol);

      if (!quote || !quote.regularMarketPrice) {
        throw new Error(`No exchange rate data available for ${symbol}`);
      }

      const rate = quote.regularMarketPrice as number;

      // Salva in cache
      this.rateCache.set(cacheKey, {
        rate,
        timestamp: Date.now(),
      });

      this.logger.log(`Exchange rate ${from}->${to}: ${rate.toFixed(6)}`);

      return rate;
    } catch (error) {
      this.logger.error(
        `Failed to fetch exchange rate for ${from}->${to}: ${error.message}`,
      );

      // Se la richiesta diretta fallisce, prova l'inverso
      // Es: Se CHFEUR=X fallisce, prova EURCHF=X e inverti
      try {
        const inverseSymbol = `${to}${from}=X`;
        this.logger.debug(
          `Trying inverse exchange rate: ${inverseSymbol}`,
        );

        const inverseQuote: any = await this.yahooFinance.quote(inverseSymbol);

        if (inverseQuote && inverseQuote.regularMarketPrice) {
          const inverseRate = inverseQuote.regularMarketPrice as number;
          const rate = 1 / inverseRate;

          // Salva in cache
          this.rateCache.set(cacheKey, {
            rate,
            timestamp: Date.now(),
          });

          this.logger.log(
            `Exchange rate ${from}->${to} (inverse): ${rate.toFixed(6)}`,
          );

          return rate;
        }
      } catch (inverseError) {
        this.logger.error(
          `Inverse exchange rate also failed: ${inverseError.message}`,
        );
      }

      throw error;
    }
  }

  /**
   * Converti più importi contemporaneamente
   */
  async convertMultipleToEUR(
    amounts: Array<{ amount: number; currency: string }>,
  ): Promise<number[]> {
    return Promise.all(
      amounts.map((item) => this.convertToEUR(item.amount, item.currency)),
    );
  }

  /**
   * Pulisci la cache dei tassi di cambio
   */
  clearCache(): void {
    this.rateCache.clear();
    this.logger.log('Exchange rate cache cleared');
  }

  /**
   * Ottieni tutte le valute supportate da Yahoo Finance
   */
  getSupportedCurrencies(): string[] {
    return [
      'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
      'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN',
      'HRK', 'RUB', 'TRY', 'ZAR', 'BRL', 'MXN', 'CNY', 'HKD',
      'SGD', 'KRW', 'INR', 'IDR', 'MYR', 'PHP', 'THB',
    ];
  }
}
