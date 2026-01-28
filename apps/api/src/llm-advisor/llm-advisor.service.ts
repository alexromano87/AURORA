import { Injectable } from '@nestjs/common';
import { CategorizationService } from './categorization.service';
import { SpendingAnalysisService } from './spending-analysis.service';
import { PurchaseAdvisorService } from './purchase-advisor.service';
import { OpenAIService } from './openai.service';

@Injectable()
export class LlmAdvisorService {
  constructor(
    private readonly categorization: CategorizationService,
    private readonly spendingAnalysis: SpendingAnalysisService,
    private readonly purchaseAdvisor: PurchaseAdvisorService,
    private readonly openai: OpenAIService,
  ) {}

  isLlmAvailable(): boolean {
    return this.openai.isAvailable();
  }

  // Expose sub-services for controller
  getCategorizationService() {
    return this.categorization;
  }

  getSpendingAnalysisService() {
    return this.spendingAnalysis;
  }

  getPurchaseAdvisorService() {
    return this.purchaseAdvisor;
  }
}
