import { Module } from '@nestjs/common';
import { PersonalFinanceDashboardController } from './personal-finance-dashboard.controller';
import { PersonalFinanceDashboardService } from './personal-finance-dashboard.service';

@Module({
  controllers: [PersonalFinanceDashboardController],
  providers: [PersonalFinanceDashboardService],
  exports: [PersonalFinanceDashboardService],
})
export class PersonalFinanceDashboardModule {}
