import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';
import { FinnhubService } from './finnhub.service';
import { YahooFinanceService } from './yahoo.service';
import { GoogleFinanceService } from './google-finance.service';
import { CurrencyConverterService } from './currency-converter.service';
import { PricesProcessor } from './prices.processor';
import { PricesSchedulerService } from './prices-scheduler.service';
import { PriceQueueService } from './price-queue.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'prices',
    }),
  ],
  controllers: [PricesController],
  providers: [
    PricesService,
    FinnhubService,
    YahooFinanceService,
    GoogleFinanceService,
    CurrencyConverterService,
    PricesProcessor,
    PricesSchedulerService,
    PriceQueueService,
  ],
  exports: [
    PricesService,
    FinnhubService,
    YahooFinanceService,
    GoogleFinanceService,
    CurrencyConverterService,
    PricesSchedulerService,
    PriceQueueService,
  ],
})
export class PricesModule {}
