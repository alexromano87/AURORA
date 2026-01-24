import { Injectable, Logger } from '@nestjs/common';
import { YahooFinanceService } from './yahoo.service';

interface QueueItem {
  instrumentId: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

@Injectable()
export class PriceQueueService {
  private readonly logger = new Logger(PriceQueueService.name);
  private queue: QueueItem[] = [];
  private processing = false;
  private readonly DELAY_BETWEEN_REQUESTS = 1000; // 1 secondo tra le richieste

  constructor(private readonly yahooService: YahooFinanceService) {}

  /**
   * Aggiunge una richiesta alla coda
   */
  async queuePriceFetch(instrumentId: string): Promise<any> {
    this.logger.log(`Adding instrument ${instrumentId} to price fetch queue`);

    return new Promise((resolve, reject) => {
      this.queue.push({
        instrumentId,
        resolve,
        reject,
      });

      // Avvia il processamento se non è già in corso
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Processa la coda uno alla volta con delay
   */
  private async processQueue() {
    if (this.processing) {
      return;
    }

    this.processing = true;
    this.logger.log(`Starting queue processing. Queue length: ${this.queue.length}`);

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      try {
        this.logger.log(`Processing price fetch for instrument ${item.instrumentId}`);
        const result = await this.yahooService.fetchCurrentPriceForInstrument(
          item.instrumentId,
        );
        item.resolve(result);
        this.logger.log(`Successfully fetched price for instrument ${item.instrumentId}`);
      } catch (error) {
        this.logger.error(
          `Failed to fetch price for instrument ${item.instrumentId}: ${error.message}`,
        );
        item.reject(error);
      }

      // Aspetta prima della prossima richiesta (solo se ci sono altre richieste in coda)
      if (this.queue.length > 0) {
        this.logger.debug(`Waiting ${this.DELAY_BETWEEN_REQUESTS}ms before next request`);
        await this.sleep(this.DELAY_BETWEEN_REQUESTS);
      }
    }

    this.processing = false;
    this.logger.log('Queue processing completed');
  }

  /**
   * Ritorna lo stato della coda
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
