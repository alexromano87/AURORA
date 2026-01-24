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
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  private yahooFinance: any;
  private initPromise: Promise<void>;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 10000; // 10 secondi tra le richieste (test)

  constructor() {
    // Dynamic import for ESM module - store the promise
    this.initPromise = this.initYahooFinance();
  }

  private async initYahooFinance() {
    // Non serve più inizializzazione, usiamo fetch diretto
    this.yahooFinance = true;
    this.logger.log('Yahoo Finance HTTP client ready');
  }

  private async ensureInitialized() {
    await this.initPromise;
  }

  /**
   * Rate limiting: aspetta prima di fare una nuova richiesta
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      this.logger.log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Scarica dati storici direttamente dall'API Yahoo Finance via HTTP
   */
  private async fetchYahooHistorical(symbol: string, startDate: Date, endDate: Date, retries = 3): Promise<any[]> {
    // Rate limiting
    await this.waitForRateLimit();

    try {
      const period1 = Math.floor(startDate.getTime() / 1000);
      const period2 = Math.floor(endDate.getTime() / 1000);

      // Usa l'endpoint chart JSON che è più affidabile e non richiede cookies
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;

      this.logger.log(`Fetching from: ${url}`);

      const response = await fetch.default(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
        },
      });

      // Se ricevi 429 (Too Many Requests), fai retry con backoff esponenziale
      if (response.status === 429 && retries > 0) {
        const backoffTime = (4 - retries) * 5000; // 5s, 10s, 15s
        this.logger.warn(`Rate limited (429), retrying in ${backoffTime}ms (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return this.fetchYahooHistorical(symbol, startDate, endDate, retries - 1);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseYahooJSON(data);
    } catch (error) {
      this.logger.error('Error fetching from Yahoo Finance:', error.message);
      throw error;
    }
  }

  /**
   * Parse JSON response from Yahoo Finance Chart API
   */
  private parseYahooJSON(data: any): any[] {
    try {
      const result = data?.chart?.result?.[0];
      if (!result) {
        this.logger.warn('No result in Yahoo Finance response');
        return [];
      }

      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0];

      if (!quotes || !timestamps.length) {
        this.logger.warn('No quotes or timestamps in response');
        return [];
      }

      const { open, high, low, close, volume } = quotes;

      return timestamps
        .map((timestamp: number, index: number) => {
          const closePrice = close[index];

          // Skip null/invalid data points
          if (closePrice === null || closePrice === undefined || isNaN(closePrice)) {
            return null;
          }

          return {
            date: new Date(timestamp * 1000),
            open: open[index] || closePrice,
            high: high[index] || closePrice,
            low: low[index] || closePrice,
            close: closePrice,
            volume: volume[index] || 0,
          };
        })
        .filter(row => row !== null);
    } catch (error) {
      this.logger.error('Error parsing Yahoo Finance JSON:', error.message);
      return [];
    }
  }

  /**
   * Scarica i prezzi storici per uno strumento da Yahoo Finance
   */
  async fetchPricesForInstrument(
    instrumentId: string,
    days: number = 365,
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      // Ensure yahooFinance is loaded
      await this.ensureInitialized();

      const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId },
        include: { isinMapping: true },
      });

      if (!instrument) {
        return { success: false, count: 0, error: 'Instrument not found' };
      }

      // Determina il ticker Yahoo Finance
      let yahooTicker = instrument.isinMapping?.yahooTicker;

      // Se non c'è mapping, prova a usare l'ISIN direttamente
      if (!yahooTicker) {
        // Per ETF, STOCK e BOND, Yahoo Finance supporta la ricerca diretta tramite ISIN
        if (instrument.isin && (instrument.type === 'ETF' || instrument.type === 'STOCK' || instrument.type === 'BOND')) {
          yahooTicker = instrument.isin;
          this.logger.log(`Using ISIN as ticker: ${yahooTicker}`);
        } else {
          // Fallback: prova a costruirlo dal ticker
          yahooTicker = this.guessYahooTicker(instrument.ticker, instrument.type);
        }
      }

      if (!yahooTicker) {
        return {
          success: false,
          count: 0,
          error: 'No Yahoo Finance ticker or ISIN available'
        };
      }

      this.logger.log(`Fetching prices for ${instrument.ticker} using identifier: ${yahooTicker}`);

      // Scarica i prezzi storici via HTTP
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.fetchYahooHistorical(yahooTicker, startDate, endDate);

      if (!result || result.length === 0) {
        return {
          success: false,
          count: 0,
          error: 'No price data available from Yahoo Finance'
        };
      }

      // I dati sono già nel formato corretto dal parseYahooCSV
      const priceData: PriceData[] = result;

      // Salva i prezzi nel database
      const operations = priceData.map((price) =>
        prisma.priceHistory.upsert({
          where: {
            instrumentId_date: {
              instrumentId,
              date: price.date,
            },
          },
          create: {
            instrumentId,
            ...price,
          },
          update: price,
        }),
      );

      await prisma.$transaction(operations);

      this.logger.log(
        `Successfully fetched ${priceData.length} prices for ${instrument.ticker}`,
      );

      return { success: true, count: priceData.length };
    } catch (error) {
      this.logger.error(
        `Error fetching prices for instrument ${instrumentId}:`,
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
   * Aggiorna i prezzi per tutti gli strumenti
   */
  async updateAllPrices(
    days: number = 365,
  ): Promise<{ total: number; success: number; failed: number }> {
    this.logger.log('Starting bulk price update...');

    const instruments = await prisma.instrument.findMany({
      where: {
        type: { in: ['ETF', 'STOCK', 'CRYPTO'] }, // Escludiamo BOND e CASH
      },
    });

    let successCount = 0;
    let failedCount = 0;

    for (const instrument of instruments) {
      const result = await this.fetchPricesForInstrument(instrument.id, days);
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
        this.logger.warn(
          `Failed to update prices for ${instrument.ticker}: ${result.error}`,
        );
      }

      // Pausa di 3 secondi tra le richieste per evitare rate limiting
      // (il rate limiting interno già aspetta 2s, ma aggiungiamo margine)
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    this.logger.log(
      `Bulk update completed: ${successCount} success, ${failedCount} failed`,
    );

    return {
      total: instruments.length,
      success: successCount,
      failed: failedCount,
    };
  }

  /**
   * Ottiene l'ultimo prezzo disponibile per uno strumento
   */
  async getLatestPrice(instrumentId: string): Promise<{
    priceEur: number;
    priceOriginal: number | null;
    currency: string;
  } | null> {
    const latestPrice = await prisma.priceHistory.findFirst({
      where: { instrumentId },
      orderBy: { date: 'desc' },
      select: {
        close: true,
        originalClose: true,
        originalCurrency: true,
        instrument: {
          select: {
            currency: true,
          },
        },
      },
    });

    if (!latestPrice) {
      return null;
    }

    return {
      priceEur: latestPrice.close,
      priceOriginal: latestPrice.originalClose,
      currency: latestPrice.originalCurrency || 'EUR',
    };
  }

  /**
   * Cerca di indovinare il ticker Yahoo Finance dal ticker dello strumento
   * Nota: per ETF, STOCK e BOND è meglio usare l'ISIN direttamente
   */
  private guessYahooTicker(ticker: string, type: string): string | null {
    if (!ticker) return null;

    // Per crypto, usa il formato ticker-USD
    if (type === 'CRYPTO') {
      return `${ticker}-USD`; // Es. BTC-USD, ETH-USD
    }

    // Per altri tipi, ritorna il ticker così com'è come fallback
    // Ma nota: per ETF/STOCK/BOND europei l'ISIN funziona meglio
    return ticker;
  }

  /**
   * Crea o aggiorna il mapping Instrument -> Yahoo Ticker
   */
  async upsertIsinMapping(
    instrumentId: string,
    yahooTicker: string,
    exchange?: string,
  ): Promise<void> {
    await prisma.isinMapping.upsert({
      where: { instrumentId },
      create: {
        instrumentId,
        yahooTicker,
        exchange,
      },
      update: {
        yahooTicker,
        exchange,
      },
    });
  }
}
