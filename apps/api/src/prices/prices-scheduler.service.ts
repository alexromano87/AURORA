import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PricesSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(PricesSchedulerService.name);

  constructor(
    @InjectQueue('prices') private readonly pricesQueue: Queue,
  ) {}

  async onModuleInit() {
    // Schedula l'aggiornamento automatico dei prezzi ogni notte alle 2:00 AM
    await this.scheduleDailyPriceUpdate();
    this.logger.log('Price update scheduler initialized');
  }

  /**
   * Schedula l'aggiornamento giornaliero dei prezzi
   */
  async scheduleDailyPriceUpdate() {
    // Rimuovi job esistenti con lo stesso nome
    await this.pricesQueue.removeRepeatableByKey(
      'prices:::update-all-prices:::0 2 * * *',
    );

    // Aggiungi job ripetibile: ogni giorno alle 2:00 AM
    await this.pricesQueue.add(
      'update-all-prices',
      { days: 7 }, // Aggiorna ultimi 7 giorni
      {
        repeat: {
          pattern: '0 2 * * *', // Cron: 2:00 AM ogni giorno
        },
        removeOnComplete: {
          count: 10, // Mantieni solo gli ultimi 10 job completati
        },
        removeOnFail: {
          count: 20, // Mantieni gli ultimi 20 job falliti per debug
        },
      },
    );

    this.logger.log('Daily price update scheduled for 2:00 AM');
  }

  /**
   * Accoda manualmente l'aggiornamento di tutti i prezzi
   */
  async queueAllPricesUpdate(days: number = 365) {
    const job = await this.pricesQueue.add('update-all-prices', { days });
    this.logger.log(`Queued manual price update job: ${job.id}`);
    return { jobId: job.id };
  }

  /**
   * Accoda l'aggiornamento dei prezzi per uno strumento specifico
   */
  async queueInstrumentPricesUpdate(instrumentId: string, days: number = 365) {
    const job = await this.pricesQueue.add('update-instrument-prices', {
      instrumentId,
      days,
    });
    this.logger.log(
      `Queued price update for instrument ${instrumentId}: ${job.id}`,
    );
    return { jobId: job.id };
  }

  /**
   * Ottieni lo stato dei job di aggiornamento prezzi
   */
  async getJobsStatus() {
    const [active, waiting, completed, failed] = await Promise.all([
      this.pricesQueue.getActive(),
      this.pricesQueue.getWaiting(),
      this.pricesQueue.getCompleted(),
      this.pricesQueue.getFailed(),
    ]);

    return {
      active: active.length,
      waiting: waiting.length,
      completed: completed.length,
      failed: failed.length,
      jobs: {
        active: active.map((j) => ({ id: j.id, name: j.name, data: j.data })),
        waiting: waiting.map((j) => ({ id: j.id, name: j.name, data: j.data })),
        failed: failed.map((j) => ({
          id: j.id,
          name: j.name,
          data: j.data,
          error: j.failedReason,
        })),
      },
    };
  }
}
