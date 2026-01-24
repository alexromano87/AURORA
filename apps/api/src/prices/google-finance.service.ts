import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GoogleFinanceService {
  private readonly logger = new Logger(GoogleFinanceService.name);

  constructor() {
    this.logger.log('Google Finance service initialized');
  }

  /**
   * Cerca l'ISIN su Google Finance usando web scraping
   * Google Finance spesso mostra l'ISIN nella pagina dei dettagli
   */
  async findIsinBySymbol(symbol: string): Promise<string | null> {
    try {
      this.logger.log(`Searching Google Finance for ISIN of: ${symbol}`);

      // Converti il simbolo nel formato Google Finance
      // Esempio: VWCE.DE -> VWCE:FRA, LDO.MI -> LDO:BIT
      const googleSymbol = this.convertToGoogleFinanceSymbol(symbol);

      // Costruisci l'URL di Google Finance
      const url = `https://www.google.com/finance/quote/${encodeURIComponent(googleSymbol)}`;

      this.logger.debug(`Trying Google Finance URL: ${url}`);

      // Fetch della pagina
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Google Finance returned status ${response.status} for ${symbol}`);
        return null;
      }

      const html = await response.text();

      // Cerca l'ISIN nel contenuto HTML
      // Google Finance mostra l'ISIN in diversi formati possibili
      const isinPatterns = [
        /ISIN[:\s]+([A-Z]{2}[A-Z0-9]{9}[0-9])/gi,
        /International Securities Identification Number[:\s]+([A-Z]{2}[A-Z0-9]{9}[0-9])/gi,
        /"isin":"([A-Z]{2}[A-Z0-9]{9}[0-9])"/gi,
        /data-isin="([A-Z]{2}[A-Z0-9]{9}[0-9])"/gi,
        // Pattern per trovare l'ISIN in qualsiasi parte del testo
        /\b([A-Z]{2}[A-Z0-9]{9}[0-9])\b/g,
      ];

      for (const pattern of isinPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          if (match && match[1]) {
            const isin = match[1].toUpperCase();

            // Valida che sia veramente un ISIN (formato corretto)
            if (this.isValidISIN(isin)) {
              this.logger.log(`✓ Found ISIN on Google Finance for ${symbol}: ${isin}`);
              return isin;
            }
          }
        }
      }

      this.logger.debug(`No ISIN found on Google Finance for ${symbol}`);
      return null;
    } catch (error) {
      this.logger.error(`Error fetching ISIN from Google Finance for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Converti il simbolo Yahoo Finance nel formato Google Finance
   * Esempi:
   * VWCE.DE -> VWCE:FRA (Frankfurt)
   * LDO.MI -> LDO:BIT (Borsa Italiana)
   * IWDA.L -> IWDA:LON (London)
   */
  private convertToGoogleFinanceSymbol(symbol: string): string {
    const exchangeMap: { [key: string]: string } = {
      'DE': 'FRA',  // Frankfurt/Xetra
      'MI': 'BIT',  // Milan/Borsa Italiana
      'L': 'LON',   // London
      'PA': 'EPA',  // Paris
      'AS': 'AMS',  // Amsterdam
      'BR': 'EBR',  // Brussels
      'SW': 'VTX',  // Swiss
      'VI': 'VIE',  // Vienna
    };

    // Se il simbolo contiene un punto, splitta e converti
    if (symbol.includes('.')) {
      const [ticker, exchange] = symbol.split('.');
      const googleExchange = exchangeMap[exchange];

      if (googleExchange) {
        return `${ticker}:${googleExchange}`;
      }
    }

    // Se non ha suffisso o non è mappato, ritorna così com'è
    return symbol;
  }

  /**
   * Valida che una stringa sia un ISIN valido
   */
  private isValidISIN(isin: string): boolean {
    // ISIN deve essere 12 caratteri: 2 lettere (paese) + 9 alfanumerici + 1 cifra di controllo
    return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin);
  }

  /**
   * Cerca ISIN per una lista di simboli
   * Utilizza Promise.allSettled per non bloccare se alcuni falliscono
   */
  async findIsinsForSymbols(
    symbols: string[],
  ): Promise<Map<string, string | null>> {
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => ({
        symbol,
        isin: await this.findIsinBySymbol(symbol),
      })),
    );

    const isinMap = new Map<string, string | null>();

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        isinMap.set(result.value.symbol, result.value.isin);
      }
    });

    return isinMap;
  }
}
