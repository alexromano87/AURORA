import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@aurora/db';
import * as fetch from 'node-fetch';

const prisma = new PrismaClient();

interface PriceData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable()
export class FinnhubService {
  private readonly logger = new Logger(FinnhubService.name);
  private apiKey: string;
  private readonly baseUrl = 'https://finnhub.io/api/v1';
  private exchangeRatesCache: { [key: string]: number } = {};
  private lastRatesFetch: Date | null = null;

  constructor() {
    this.apiKey = process.env.FINNHUB_API_KEY || 'demo';
    this.logger.log(`Finnhub client initialized with API key: ${this.apiKey.substring(0, 10)}...`);
  }

  /**
   * Scarica il prezzo corrente in tempo reale da Finnhub e lo salva come record giornaliero
   */
  async fetchCurrentPriceForInstrument(
    instrumentId: string,
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId },
        include: { isinMapping: true },
      });

      if (!instrument) {
        return { success: false, count: 0, error: 'Instrument not found' };
      }

      // Determina il simbolo per Finnhub
      let symbol = this.getSymbolForFinnhub(instrument);
      let data: any = null;
      let finalSymbol: string | null = null;

      if (!symbol) {
        return {
          success: false,
          count: 0,
          error: 'Cannot determine Finnhub symbol',
        };
      }

      // Prova prima con il ticker originale
      this.logger.log(`Fetching current price for ${instrument.ticker} using symbol: ${symbol}`);
      let url = `${this.baseUrl}/quote?symbol=${symbol}&token=${this.apiKey}`;
      let response = await fetch.default(url);
      let tempData = await response.json();

      if (response.ok && tempData.c && tempData.c > 0) {
        data = tempData;
        finalSymbol = symbol;
        this.logger.log(`Successfully fetched price with original ticker: ${symbol}`);
      }

      // Se il ticker originale fallisce, cerca su tutte le borse disponibili
      if (!data && instrument.type !== 'CRYPTO') {
        this.logger.log(`Original ticker failed. Searching all exchanges for ticker: ${instrument.ticker}`);

        // Cerca prima per ticker (restituisce più risultati che per ISIN)
        let allSymbols = await this.searchAllSymbolsByIsin(instrument.ticker);

        // Se non trova nulla per ticker e abbiamo un ISIN, prova con l'ISIN
        if (allSymbols.length === 0 && instrument.isin) {
          this.logger.log(`No results for ticker. Trying ISIN: ${instrument.isin}`);
          allSymbols = await this.searchAllSymbolsByIsin(instrument.isin);
        }

        if (allSymbols.length > 0) {
          this.logger.log(`Found ${allSymbols.length} symbols for ISIN ${instrument.isin}`);

          // Prova tutti i simboli trovati finché non ne trova uno che funziona
          for (const symbolInfo of allSymbols) {
            try {
              url = `${this.baseUrl}/quote?symbol=${symbolInfo.symbol}&token=${this.apiKey}`;
              this.logger.log(`Trying symbol: ${symbolInfo.symbol} (${symbolInfo.description})`);

              response = await fetch.default(url);
              tempData = await response.json();

              if (response.ok && tempData.c && tempData.c > 0) {
                data = tempData;
                finalSymbol = symbolInfo.symbol;
                this.logger.log(`✓ Found working symbol: ${symbolInfo.symbol} with price: ${tempData.c}`);
                break;
              } else {
                this.logger.log(`✗ Symbol ${symbolInfo.symbol} returned no data or error`);
              }
            } catch (err) {
              this.logger.warn(`Error trying symbol ${symbolInfo.symbol}: ${err.message}`);
              continue;
            }
          }
        }
      }

      // Verifica finale
      if (!data || !finalSymbol) {
        throw new Error(
          `Nessun prezzo disponibile per ${instrument.ticker}. Finnhub potrebbe non supportare questo strumento o tutte le borse sono inaccessibili con il piano gratuito.`,
        );
      }

      // Determina la valuta e converti in EUR se necessario
      const sourceCurrency = this.getCurrencyFromSymbol(finalSymbol);
      let finalPrice = data.c;

      if (sourceCurrency !== 'EUR') {
        this.logger.log(`Price is in ${sourceCurrency}, converting to EUR`);
        finalPrice = await this.convertToEUR(data.c, sourceCurrency);
      }

      // Crea un record per oggi (normalizzato a mezzanotte)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Converti tutti i prezzi OHLC se necessario
      const openPrice = data.o || finalPrice;
      const highPrice = data.h || finalPrice;
      const lowPrice = data.l || finalPrice;

      const priceData: PriceData = {
        date: today,
        open: sourceCurrency !== 'EUR' ? await this.convertToEUR(openPrice, sourceCurrency) : openPrice,
        high: sourceCurrency !== 'EUR' ? await this.convertToEUR(highPrice, sourceCurrency) : highPrice,
        low: sourceCurrency !== 'EUR' ? await this.convertToEUR(lowPrice, sourceCurrency) : lowPrice,
        close: finalPrice,
        volume: 0, // Il quote endpoint non fornisce il volume
      };

      // Salva il prezzo nel database (upsert per aggiornare se esiste già un record per oggi)
      await prisma.priceHistory.upsert({
        where: {
          instrumentId_date: {
            instrumentId,
            date: priceData.date,
          },
        },
        create: {
          instrumentId,
          ...priceData,
        },
        update: priceData,
      });

      const logMessage = sourceCurrency !== 'EUR'
        ? `Successfully fetched price for ${instrument.ticker} from ${finalSymbol}: ${data.c} ${sourceCurrency} → ${finalPrice.toFixed(2)} EUR`
        : `Successfully fetched price for ${instrument.ticker} from ${finalSymbol}: ${finalPrice.toFixed(2)} EUR`;

      this.logger.log(logMessage);

      return { success: true, count: 1 };
    } catch (error) {
      this.logger.error(
        `Error fetching current price from Finnhub for instrument ${instrumentId}:`,
        error,
      );
      return {
        success: false,
        count: 0,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Determina il simbolo giusto per Finnhub
   */
  private getSymbolForFinnhub(instrument: any): string | null {
    // Per crypto, Finnhub usa il formato "BINANCE:BTCUSDT"
    if (instrument.type === 'CRYPTO') {
      return `BINANCE:${instrument.ticker}USDT`;
    }

    // Per ETF e STOCK, usa il ticker direttamente
    // Se fallisce, il metodo principale proverà con la ricerca ISIN
    if (instrument.type === 'ETF' || instrument.type === 'STOCK') {
      return instrument.ticker;
    }

    return null;
  }

  /**
   * Cerca tutti i simboli disponibili per un ISIN su diverse borse
   */
  private async searchAllSymbolsByIsin(isin: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/search?q=${isin}&token=${this.apiKey}`;
      const response = await fetch.default(url);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.result || [];
    } catch (error) {
      this.logger.error(`Error searching symbols by ISIN ${isin}:`, error);
      return [];
    }
  }

  /**
   * Ottiene i tassi di cambio rispetto all'EUR
   * Usa exchangerate-api.com (gratuito, 1500 richieste/mese)
   */
  private async getExchangeRates(): Promise<{ [key: string]: number }> {
    // Cache per 1 ora
    if (
      this.lastRatesFetch &&
      Date.now() - this.lastRatesFetch.getTime() < 3600000 &&
      Object.keys(this.exchangeRatesCache).length > 0
    ) {
      return this.exchangeRatesCache;
    }

    try {
      const url = 'https://api.exchangerate-api.com/v4/latest/EUR';
      const response = await fetch.default(url);

      if (!response.ok) {
        this.logger.warn('Failed to fetch exchange rates, using cached values');
        return this.exchangeRatesCache;
      }

      const data = await response.json();

      // Inverti i tassi per avere tutto rispetto a EUR
      const rates: { [key: string]: number } = { EUR: 1 };
      for (const [currency, rate] of Object.entries(data.rates)) {
        rates[currency] = 1 / (rate as number);
      }

      this.exchangeRatesCache = rates;
      this.lastRatesFetch = new Date();

      this.logger.log(`Exchange rates updated: ${Object.keys(rates).length} currencies`);
      return rates;
    } catch (error) {
      this.logger.error('Error fetching exchange rates:', error);
      return this.exchangeRatesCache;
    }
  }

  /**
   * Converte un prezzo in EUR
   */
  private async convertToEUR(price: number, fromCurrency: string): Promise<number> {
    if (fromCurrency === 'EUR') {
      return price;
    }

    const rates = await this.getExchangeRates();
    const rate = rates[fromCurrency];

    if (!rate) {
      this.logger.warn(`No exchange rate found for ${fromCurrency}, returning original price`);
      return price;
    }

    const converted = price * rate;
    this.logger.log(`Converted ${price} ${fromCurrency} to ${converted.toFixed(2)} EUR (rate: ${rate.toFixed(4)})`);
    return converted;
  }

  /**
   * Estrae la valuta dal simbolo della borsa
   */
  private getCurrencyFromSymbol(symbol: string): string {
    const exchangeCurrencies: { [key: string]: string } = {
      'L': 'GBP',   // London
      'DE': 'EUR',  // Xetra
      'F': 'EUR',   // Frankfurt
      'MI': 'EUR',  // Milan
      'PA': 'EUR',  // Paris
      'AS': 'EUR',  // Amsterdam
      'BR': 'EUR',  // Brussels
      'LS': 'EUR',  // Lisbon
      'MC': 'EUR',  // Madrid
      'HM': 'EUR',  // Hamburg
      'MU': 'EUR',  // Munich
      'DU': 'EUR',  // Dusseldorf
      'SG': 'EUR',  // Stuttgart
      'HA': 'EUR',  // Hannover
      'TG': 'EUR',  // Tradegate
      'SW': 'CHF',  // Swiss
      'ST': 'SEK',  // Stockholm
      'CO': 'DKK',  // Copenhagen
      'OL': 'NOK',  // Oslo
      'HE': 'EUR',  // Helsinki
    };

    // Se il simbolo non ha suffisso, assume USD
    if (!symbol.includes('.')) {
      return 'USD';
    }

    const suffix = symbol.split('.')[1];
    return exchangeCurrencies[suffix] || 'USD';
  }
}
