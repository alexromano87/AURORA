import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PricesService } from './prices.service';

@Processor('prices')
export class PricesProcessor extends WorkerHost {
  private readonly logger = new Logger(PricesProcessor.name);

  constructor(private readonly pricesService: PricesService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Processing price update job: ${job.name}`);

    switch (job.name) {
      case 'update-all-prices':
        return this.handleUpdateAllPrices(job);
      case 'update-instrument-prices':
        return this.handleUpdateInstrumentPrices(job);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return null;
    }
  }

  private async handleUpdateAllPrices(job: Job) {
    const { days = 365 } = job.data;

    this.logger.log('Starting scheduled price update for all instruments...');

    try {
      const result = await this.pricesService.updateAllPrices(days);

      this.logger.log(
        `Scheduled price update completed: ${result.success}/${result.total} successful`,
      );

      return result;
    } catch (error) {
      this.logger.error('Error in scheduled price update:', error);
      throw error;
    }
  }

  private async handleUpdateInstrumentPrices(job: Job) {
    const { instrumentId, days = 365 } = job.data;

    this.logger.log(`Updating prices for instrument: ${instrumentId}`);

    try {
      const result = await this.pricesService.fetchPricesForInstrument(
        instrumentId,
        days,
      );

      this.logger.log(
        `Price update for ${instrumentId}: ${result.success ? 'success' : 'failed'}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error updating prices for ${instrumentId}:`, error);
      throw error;
    }
  }
}
