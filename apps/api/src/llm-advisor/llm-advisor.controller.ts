import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LlmAdvisorService } from './llm-advisor.service';
import { CategorizationService } from './categorization.service';
import { SpendingAnalysisService } from './spending-analysis.service';
import { PurchaseAdvisorService } from './purchase-advisor.service';
import type {
  CategorizeSingleInput,
  CategorizeBatchInput,
  PurchaseEvaluationInput,
} from '@aurora/contracts';

@ApiTags('llm-advisor')
@Controller('api/llm-advisor')
export class LlmAdvisorController {
  constructor(
    private readonly llmService: LlmAdvisorService,
    private readonly categorization: CategorizationService,
    private readonly spendingAnalysis: SpendingAnalysisService,
    private readonly purchaseAdvisor: PurchaseAdvisorService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Check if LLM is available' })
  async getStatus() {
    return {
      available: this.llmService.isLlmAvailable(),
      message: this.llmService.isLlmAvailable()
        ? 'LLM service is ready'
        : 'LLM service unavailable - using rule-based fallbacks',
    };
  }

  @Post('categorize')
  @ApiOperation({ summary: 'Categorize a single transaction' })
  async categorizeSingle(
    @Body() body: CategorizeSingleInput & { userId?: string },
  ) {
    const userId = body.userId || 'user_default';
    return this.categorization.categorizeTransaction(userId, {
      merchant: body.merchant,
      description: body.description,
      amount: body.amount ?? 0,
    });
  }

  @Post('categorize-batch')
  @ApiOperation({ summary: 'Categorize multiple transactions' })
  async categorizeBatch(
    @Body() body: CategorizeBatchInput & { userId?: string },
  ) {
    const userId = body.userId || 'user_default';
    const transactions = body.transactions.map(tx => ({
      id: tx.id,
      merchant: tx.merchant,
      description: tx.description,
      amount: tx.amount ?? 0,
    }));
    const results = await this.categorization.batchCategorize(
      userId,
      transactions,
    );

    // Convert Map to array for JSON response
    return Array.from(results.entries()).map(([id, result]) => ({
      transactionId: id,
      ...result,
    }));
  }

  @Post('analyze-spending')
  @ApiOperation({ summary: 'Analyze spending patterns' })
  async analyzeSpending(
    @Body() body: { userId?: string; months?: number },
  ) {
    const userId = body.userId || 'user_default';
    const months = body.months || 3;
    return this.spendingAnalysis.analyzeMonthlySpending(userId, months);
  }

  @Get('saving-opportunities')
  @ApiOperation({ summary: 'Get saving opportunities' })
  async getSavingOpportunities(
    @Query('userId') userId: string = 'user_default',
  ) {
    const analysis = await this.spendingAnalysis.analyzeMonthlySpending(userId, 3);
    return analysis.savingOpportunities;
  }

  @Post('evaluate-purchase')
  @ApiOperation({ summary: 'Evaluate a potential purchase' })
  async evaluatePurchase(
    @Body() body: PurchaseEvaluationInput & { userId?: string },
  ) {
    const userId = body.userId || 'user_default';
    return this.purchaseAdvisor.evaluatePurchase(userId, body);
  }

  @Post('suggest-installments')
  @ApiOperation({ summary: 'Suggest installment plan for a purchase' })
  async suggestInstallments(
    @Body() body: { userId?: string; amount: number; maxMonths?: number },
  ) {
    const userId = body.userId || 'user_default';
    const maxMonths = body.maxMonths || 24;
    return this.purchaseAdvisor.suggestInstallmentPlan(userId, body.amount, maxMonths);
  }

  @Get('financial-context')
  @ApiOperation({ summary: 'Get user financial context' })
  async getFinancialContext(
    @Query('userId') userId: string = 'user_default',
  ) {
    return this.purchaseAdvisor.getUserFinancialContext(userId);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI-generated insights' })
  async getInsights(
    @Query('userId') userId: string = 'user_default',
  ) {
    const analysis = await this.spendingAnalysis.analyzeMonthlySpending(userId, 3);
    return {
      insights: analysis.insights,
      savingOpportunities: analysis.savingOpportunities,
      anomalies: analysis.anomalies,
    };
  }
}
