import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@aurora/db';
import YahooFinanceClass from 'yahoo-finance2';
import { GoogleFinanceService } from './google-finance.service';
import { CurrencyConverterService } from './currency-converter.service';

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
export class YahooFinanceService {
  private readonly logger = new Logger(YahooFinanceService.name);
  private readonly yahooFinance: typeof YahooFinanceClass.prototype;

  constructor(
    private readonly googleFinanceService: GoogleFinanceService,
    private readonly currencyConverter: CurrencyConverterService,
  ) {
    this.yahooFinance = new YahooFinanceClass();
    this.logger.log('Yahoo Finance client initialized');
  }

  /**
   * Scarica il prezzo corrente in tempo reale da Yahoo Finance e lo salva come record giornaliero
   */
  async fetchCurrentPriceForInstrument(
    instrumentId: string,
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId },
      });

      if (!instrument) {
        return { success: false, count: 0, error: 'Instrument not found' };
      }

      // Determina il simbolo per Yahoo Finance (cerca per ISIN se disponibile)
      const symbol = await this.getSymbolForYahoo(instrument);

      if (!symbol) {
        return {
          success: false,
          count: 0,
          error: 'Cannot determine Yahoo Finance symbol',
        };
      }

      this.logger.log(`Fetching current price for ${instrument.ticker} using Yahoo symbol: ${symbol}`);

      // Scarica il quote da Yahoo Finance
      const quote: any = await this.yahooFinance.quote(symbol);

      if (!quote || !quote.regularMarketPrice) {
        throw new Error(`No price data available for ${symbol}`);
      }

      const price = quote.regularMarketPrice as number;
      const open = (quote.regularMarketOpen as number) || price;
      const high = (quote.regularMarketDayHigh as number) || price;
      const low = (quote.regularMarketDayLow as number) || price;
      const volume = (quote.regularMarketVolume as number) || 0;

      // Verifica la valuta restituita da Yahoo Finance
      const currency = (quote.currency as string) || instrument.currency;

      this.logger.log(
        `Fetched price for ${instrument.ticker}: ${price.toFixed(2)} ${currency}`,
      );

      // Converti i prezzi in EUR se necessario
      let priceEUR = price;
      let openEUR = open;
      let highEUR = high;
      let lowEUR = low;

      if (currency !== 'EUR') {
        this.logger.log(
          `Converting prices from ${currency} to EUR for ${instrument.ticker}`,
        );

        try {
          priceEUR = await this.currencyConverter.convertToEUR(price, currency);
          openEUR = await this.currencyConverter.convertToEUR(open, currency);
          highEUR = await this.currencyConverter.convertToEUR(high, currency);
          lowEUR = await this.currencyConverter.convertToEUR(low, currency);

          this.logger.log(
            `Converted ${price.toFixed(2)} ${currency} to ${priceEUR.toFixed(2)} EUR`,
          );
        } catch (conversionError) {
          this.logger.error(
            `Currency conversion failed for ${instrument.ticker}: ${conversionError.message}`,
          );
          throw new Error(
            `Failed to convert price from ${currency} to EUR: ${conversionError.message}`,
          );
        }
      }

      // Crea un record per oggi (normalizzato a mezzanotte)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const priceData: any = {
        date: today,
        open: openEUR,
        high: highEUR,
        low: lowEUR,
        close: priceEUR,
        volume,
        // Salva i prezzi originali se c'è stata conversione
        originalClose: currency !== 'EUR' ? price : null,
        originalOpen: currency !== 'EUR' ? open : null,
        originalHigh: currency !== 'EUR' ? high : null,
        originalLow: currency !== 'EUR' ? low : null,
        originalCurrency: currency !== 'EUR' ? currency : null,
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

      this.logger.log(
        `Successfully saved price for ${instrument.ticker} from Yahoo (${symbol}): ${priceEUR.toFixed(2)} EUR` +
        (currency !== 'EUR' ? ` (original: ${price.toFixed(2)} ${currency})` : ''),
      );

      return { success: true, count: 1 };
    } catch (error) {
      this.logger.error(
        `Error fetching current price from Yahoo Finance for instrument ${instrumentId}:`,
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
   * Determina il simbolo giusto per Yahoo Finance
   * Per ETF e STOCK cerca per ISIN su tutti gli exchange
   * Per CRYPTO usa il formato ticker-USD
   */
  private async getSymbolForYahoo(instrument: any): Promise<string | null> {
    // Per crypto, Yahoo Finance usa il formato "BTC-USD"
    if (instrument.type === 'CRYPTO') {
      return `${instrument.ticker}-USD`;
    }

    // Per ETF e STOCK, cerca per ISIN se disponibile
    if ((instrument.type === 'ETF' || instrument.type === 'STOCK') && instrument.isin && instrument.isin.trim() !== '') {
      this.logger.log(`Searching for instrument by ISIN: ${instrument.isin}`);
      const symbolFromIsin = await this.findSymbolByIsin(instrument.isin);
      if (symbolFromIsin) {
        return symbolFromIsin;
      }
      // Se la ricerca per ISIN fallisce, prova con il ticker
      this.logger.warn(`ISIN search failed for ${instrument.isin}, falling back to ticker search`);
    }

    // Fallback: cerca per ticker
    if (instrument.ticker) {
      // Se il ticker ha già un suffisso, usalo direttamente
      if (instrument.ticker.includes('.')) {
        return instrument.ticker;
      }

      // Altrimenti, per ETF europei comuni, prova prima con Xetra (.DE)
      if (instrument.type === 'ETF') {
        return `${instrument.ticker}.DE`;
      }

      // Per stock senza suffisso, assume US
      return instrument.ticker;
    }

    return null;
  }

  /**
   * Cerca simboli su Yahoo Finance per ISIN, ticker o nome
   * Restituisce una lista di risultati con ticker, nome, exchange, prezzo, ISIN
   */
  async searchSymbols(query: string): Promise<Array<{
    symbol: string;
    name: string;
    exchange: string;
    price?: number;
    currency?: string;
    isin?: string;
  }>> {
    try {
      this.logger.log(`Searching Yahoo Finance for: ${query}`);

      // Usa l'API di ricerca di Yahoo Finance
      const searchResults: any = await this.yahooFinance.search(query);

      if (!searchResults || !searchResults.quotes || searchResults.quotes.length === 0) {
        this.logger.warn(`No results found for: ${query}`);
        return [];
      }

      // Filtra i risultati base
      const baseResults = searchResults.quotes
        .filter((quote: any) => quote.symbol && quote.shortname)
        .slice(0, 10); // Limita a 10 risultati

      // Per ogni risultato, prova a ottenere l'ISIN facendo una chiamata quoteSummary
      const results = await Promise.all(
        baseResults.map(async (quote: any) => {
          let isin: string | undefined = undefined;

          try {
            // Prova prima con Yahoo Finance quoteSummary
            const detailedQuote: any = await this.yahooFinance.quoteSummary(quote.symbol, {
              modules: ['summaryDetail', 'price']
            });

            // L'ISIN potrebbe essere in diversi campi
            isin = detailedQuote?.price?.isin ||
                   detailedQuote?.summaryDetail?.isin ||
                   undefined;
          } catch (error) {
            this.logger.debug(`Could not fetch ISIN from Yahoo for ${quote.symbol}: ${error.message}`);
          }

          // Se Yahoo Finance non ha restituito l'ISIN, prova con Google Finance
          if (!isin) {
            try {
              this.logger.debug(`Trying Google Finance for ISIN of ${quote.symbol}`);
              isin = await this.googleFinanceService.findIsinBySymbol(quote.symbol) || undefined;

              if (isin) {
                this.logger.log(`✓ Found ISIN on Google Finance for ${quote.symbol}: ${isin}`);
              }
            } catch (error) {
              this.logger.debug(`Could not fetch ISIN from Google Finance for ${quote.symbol}: ${error.message}`);
            }
          }

          return {
            symbol: quote.symbol,
            name: quote.shortname || quote.longname || quote.symbol,
            exchange: quote.exchange || 'N/A',
            price: quote.regularMarketPrice,
            currency: quote.currency,
            isin,
          };
        })
      );

      this.logger.log(`Found ${results.length} results for: ${query}`);
      return results;
    } catch (error) {
      this.logger.error(`Error searching for ${query}:`, error);
      return [];
    }
  }

  /**
   * Cerca il simbolo Yahoo Finance corretto usando l'ISIN
   * L'ISIN è un codice univoco internazionale, Yahoo Finance lo riconosce direttamente
   */
  private async findSymbolByIsin(isin: string): Promise<string | null> {
    try {
      this.logger.log(`Trying ISIN directly: ${isin}`);
      const quote: any = await this.yahooFinance.quote(isin);

      if (quote && quote.regularMarketPrice) {
        this.logger.log(`✓ Found working ISIN: ${isin} with price: ${quote.regularMarketPrice as number}`);
        return isin;
      }
    } catch (error) {
      this.logger.log(`✗ ISIN ${isin} failed: ${error.message}`);
    }

    this.logger.warn(`No valid symbol found for ISIN: ${isin}`);
    return null;
  }

  /**
   * Prova diversi exchange per trovare quello con dati disponibili
   */
  async findBestExchangeForSymbol(
    baseTicker: string,
  ): Promise<string | null> {
    const exchanges = ['DE', 'MI', 'AS', 'PA', 'L'];

    for (const exchange of exchanges) {
      const symbol = `${baseTicker}.${exchange}`;
      try {
        this.logger.log(`Trying symbol: ${symbol}`);
        const quote: any = await this.yahooFinance.quote(symbol);

        if (quote && quote.regularMarketPrice) {
          this.logger.log(`✓ Found working symbol: ${symbol} with price: ${quote.regularMarketPrice as number}`);
          return symbol;
        }
      } catch (error) {
        this.logger.log(`✗ Symbol ${symbol} failed: ${error.message}`);
        continue;
      }
    }

    return null;
  }
}
