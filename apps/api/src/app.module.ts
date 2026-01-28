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
// Personal Finance modules
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { PersonalTransactionsModule } from './personal-transactions/personal-transactions.module';
import { CurrencyModule } from './currency/currency.module';
import { LlmAdvisorModule } from './llm-advisor/llm-advisor.module';
import { PersonalFinanceDashboardModule } from './personal-finance-dashboard/personal-finance-dashboard.module';

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
    // Personal Finance modules
    BankAccountsModule,
    ExpenseCategoriesModule,
    PersonalTransactionsModule,
    CurrencyModule,
    LlmAdvisorModule,
    PersonalFinanceDashboardModule,
  ],
})
export class AppModule {}
