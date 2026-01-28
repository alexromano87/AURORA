import { Module } from '@nestjs/common';
import { PersonalTransactionsController } from './personal-transactions.controller';
import { PersonalTransactionsService } from './personal-transactions.service';
import { ImportService } from './import.service';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [BankAccountsModule, CurrencyModule],
  controllers: [PersonalTransactionsController],
  providers: [PersonalTransactionsService, ImportService],
  exports: [PersonalTransactionsService, ImportService],
})
export class PersonalTransactionsModule {}
