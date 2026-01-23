import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';
import { PricesProcessor } from './prices.processor';
import { PricesSchedulerService } from './prices-scheduler.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'prices',
    }),
  ],
  controllers: [PricesController],
  providers: [PricesService, PricesProcessor, PricesSchedulerService],
  exports: [PricesService, PricesSchedulerService],
})
export class PricesModule {}
