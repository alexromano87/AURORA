import { Module } from '@nestjs/common';
import { LlmAdvisorController } from './llm-advisor.controller';
import { LlmAdvisorService } from './llm-advisor.service';
import { OpenAIService } from './openai.service';
import { CategorizationService } from './categorization.service';
import { SpendingAnalysisService } from './spending-analysis.service';
import { PurchaseAdvisorService } from './purchase-advisor.service';
import { ExpenseCategoriesModule } from '../expense-categories/expense-categories.module';

@Module({
  imports: [ExpenseCategoriesModule],
  controllers: [LlmAdvisorController],
  providers: [
    LlmAdvisorService,
    OpenAIService,
    CategorizationService,
    SpendingAnalysisService,
    PurchaseAdvisorService,
  ],
  exports: [LlmAdvisorService, CategorizationService],
})
export class LlmAdvisorModule {}
