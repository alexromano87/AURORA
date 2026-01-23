import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { HealthModule } from './health/health.module';
import { IpsModule } from './ips/ips.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { TransactionsModule } from './transactions/transactions.module';
import { EngineModule } from './engine/engine.module';
import { AlertsModule } from './alerts/alerts.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { PricesModule } from './prices/prices.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env.local',
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    HealthModule,
    IpsModule,
    PortfolioModule,
    TransactionsModule,
    EngineModule,
    AlertsModule,
    InstrumentsModule,
    PricesModule,
  ],
})
export class AppModule {}
