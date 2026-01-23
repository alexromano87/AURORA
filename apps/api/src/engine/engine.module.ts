import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EngineController } from './engine.controller';
import { EngineService } from './engine.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'aurora-jobs',
    }),
  ],
  controllers: [EngineController],
  providers: [EngineService],
})
export class EngineModule {}
