import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@aurora/db';

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

  constructor() {
    // Dynamic import for ESM module
    this.initYahooFinance();
  }

  private async initYahooFinance() {
    try {
      const module = await import('yahoo-finance2');
      this.yahooFinance = module.default;
    } catch (error) {
      this.logger.error('Failed to load yahoo-finance2:', error);
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
      if (!this.yahooFinance) {
        await this.initYahooFinance();
        // Wait a bit for initialization
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!this.yahooFinance) {
        return { success: false, count: 0, error: 'Yahoo Finance module not loaded' };
      }

      const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId },
        include: { isinMapping: true },
      });

      if (!instrument) {
        return { success: false, count: 0, error: 'Instrument not found' };
      }

      // Determina il ticker Yahoo Finance
      let yahooTicker = instrument.isinMapping?.yahooTicker;

      // Se non c'è mapping, prova a costruirlo dal ticker
      if (!yahooTicker) {
        yahooTicker = this.guessYahooTicker(instrument.ticker, instrument.type);
      }

      if (!yahooTicker) {
        return {
          success: false,
          count: 0,
          error: 'No Yahoo Finance ticker available'
        };
      }

      this.logger.log(`Fetching prices for ${instrument.ticker} (${yahooTicker})...`);

      // Scarica i prezzi storici
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.yahooFinance.historical(yahooTicker, {
        period1: startDate,
        period2: endDate,
        interval: '1d',
      }) as any[];

      if (!result || result.length === 0) {
        return {
          success: false,
          count: 0,
          error: 'No price data available from Yahoo Finance'
        };
      }

      // Converti i dati in formato PriceHistory
      const priceData: PriceData[] = result.map((quote: any) => ({
        date: quote.date,
        open: quote.open || quote.close,
        high: quote.high || quote.close,
        low: quote.low || quote.close,
        close: quote.close,
        volume: quote.volume || 0,
      }));

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

      // Pausa di 1 secondo tra le richieste per evitare rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
  async getLatestPrice(instrumentId: string): Promise<number | null> {
    const latestPrice = await prisma.priceHistory.findFirst({
      where: { instrumentId },
      orderBy: { date: 'desc' },
      select: { close: true },
    });

    return latestPrice?.close || null;
  }

  /**
   * Cerca di indovinare il ticker Yahoo Finance dal ticker dello strumento
   */
  private guessYahooTicker(ticker: string, type: string): string | null {
    if (!ticker) return null;

    // Per ETF europei su Borsa Italiana
    if (type === 'ETF') {
      return `${ticker}.MI`; // Milano
    }

    // Per crypto
    if (type === 'CRYPTO') {
      return `${ticker}-USD`; // Es. BTC-USD
    }

    // Per stock, proviamo varie borse
    // Questo è un approccio semplificato, idealmente dovremmo avere il mapping nel DB
    return ticker; // Prova il ticker così com'è
  }

  /**
   * Crea o aggiorna il mapping ISIN -> Yahoo Ticker
   */
  async upsertIsinMapping(
    isin: string,
    yahooTicker: string,
    exchange?: string,
  ): Promise<void> {
    await prisma.isinMapping.upsert({
      where: { isin },
      create: {
        isin,
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
