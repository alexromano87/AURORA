import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@aurora/db';
import { OpenAIService } from './openai.service';
import type { PurchaseAdvice, FinancialContext } from '@aurora/types';
import type { PurchaseEvaluationInput } from '@aurora/contracts';

@Injectable()
export class PurchaseAdvisorService {
  private readonly logger = new Logger(PurchaseAdvisorService.name);

  constructor(private readonly openai: OpenAIService) {}

  async evaluatePurchase(
    userId: string,
    input: PurchaseEvaluationInput,
  ): Promise<PurchaseAdvice> {
    // Get user's financial context
    const context = await this.getUserFinancialContext(userId);

    // Calculate basic metrics
    const monthlyDisposable = context.averageMonthlyIncome - context.averageMonthlyExpenses;
    const currentMonthRemaining = context.averageMonthlyExpenses - context.currentMonthExpenses;

    // If using installments, calculate monthly impact
    const monthlyImpact = input.installments
      ? input.amount / input.installments
      : input.amount;

    // Calculate affordability score (0-100)
    let affordabilityScore = 100;

    // Factor 1: Can they afford it from current balance?
    const balanceRatio = context.totalBalance / input.amount;
    if (balanceRatio < 0.5) {
      affordabilityScore -= 40;
    } else if (balanceRatio < 1) {
      affordabilityScore -= 25;
    } else if (balanceRatio < 2) {
      affordabilityScore -= 10;
    }

    // Factor 2: Impact on monthly budget
    const budgetImpactRatio = monthlyImpact / monthlyDisposable;
    if (budgetImpactRatio > 0.5) {
      affordabilityScore -= 30;
    } else if (budgetImpactRatio > 0.3) {
      affordabilityScore -= 20;
    } else if (budgetImpactRatio > 0.15) {
      affordabilityScore -= 10;
    }

    // Factor 3: Saving rate impact
    const newSavingRate = ((context.averageMonthlyIncome - context.averageMonthlyExpenses - monthlyImpact) / context.averageMonthlyIncome) * 100;
    if (newSavingRate < 0) {
      affordabilityScore -= 25;
    } else if (newSavingRate < 10) {
      affordabilityScore -= 15;
    }

    // Factor 4: Recent large expenses
    if (context.recentLargeExpenses.length > 2) {
      affordabilityScore -= 10;
    }

    affordabilityScore = Math.max(0, Math.min(100, affordabilityScore));

    // Determine recommendation
    let recommendation: 'proceed' | 'caution' | 'avoid' | 'delay';
    if (affordabilityScore >= 75) {
      recommendation = 'proceed';
    } else if (affordabilityScore >= 50) {
      recommendation = 'caution';
    } else if (affordabilityScore >= 30) {
      recommendation = 'delay';
    } else {
      recommendation = 'avoid';
    }

    // Generate reasoning with LLM or use template
    const reasoning = await this.generateReasoning(
      input,
      context,
      affordabilityScore,
      recommendation,
    );

    // Calculate impact metrics
    const monthsToRecover = monthlyDisposable > 0
      ? Math.ceil(input.amount / monthlyDisposable)
      : -1;

    const impact = {
      onSavingRate: newSavingRate - context.averageSavingRate,
      onMonthlyBudget: monthlyImpact,
      monthsToRecover,
    };

    // Generate warnings
    const warnings: string[] = [];
    if (context.totalBalance < input.amount) {
      warnings.push('Il saldo attuale non copre l\'intero importo');
    }
    if (newSavingRate < 0) {
      warnings.push('Questo acquisto porterebbe a un risparmio negativo questo mese');
    }
    if (input.isRecurring && budgetImpactRatio > 0.2) {
      warnings.push('Una spesa ricorrente di questo importo avrà un impatto significativo sul budget');
    }
    if (context.recentLargeExpenses.length > 0) {
      warnings.push(`Hai avuto ${context.recentLargeExpenses.length} spese importanti recentemente`);
    }

    // Generate alternatives if not recommended
    let alternatives;
    if (recommendation === 'delay' || recommendation === 'avoid') {
      alternatives = {
        suggestedAmount: monthlyDisposable * 2, // Amount they can comfortably afford
        suggestedInstallments: Math.ceil(input.amount / (monthlyDisposable * 0.3)),
        suggestedDelay: `${monthsToRecover} mesi`,
      };
    }

    return {
      canAfford: affordabilityScore >= 50,
      affordabilityScore,
      recommendation,
      reasoning,
      impact,
      alternatives,
      warnings,
    };
  }

  async suggestInstallmentPlan(
    userId: string,
    amount: number,
    maxMonths: number,
  ): Promise<{
    recommended: number;
    monthlyAmount: number;
    options: Array<{ months: number; monthlyAmount: number; rating: string }>;
  }> {
    const context = await this.getUserFinancialContext(userId);
    const monthlyDisposable = context.averageMonthlyIncome - context.averageMonthlyExpenses;

    // Calculate comfortable monthly payment (max 30% of disposable income)
    const comfortablePayment = monthlyDisposable * 0.3;

    // Generate options
    const options: Array<{ months: number; monthlyAmount: number; rating: string }> = [];

    for (const months of [3, 6, 12, 24]) {
      if (months <= maxMonths) {
        const monthlyAmount = amount / months;
        let rating: string;

        if (monthlyAmount <= comfortablePayment * 0.5) {
          rating = 'Ottimo';
        } else if (monthlyAmount <= comfortablePayment) {
          rating = 'Buono';
        } else if (monthlyAmount <= comfortablePayment * 1.5) {
          rating = 'Accettabile';
        } else {
          rating = 'Difficile';
        }

        options.push({ months, monthlyAmount, rating });
      }
    }

    // Find recommended option (first "Buono" or "Ottimo")
    const recommended = options.find(o => o.rating === 'Buono' || o.rating === 'Ottimo')
      || options[options.length - 1];

    return {
      recommended: recommended?.months || maxMonths,
      monthlyAmount: recommended?.monthlyAmount || amount / maxMonths,
      options,
    };
  }

  async getUserFinancialContext(userId: string): Promise<FinancialContext> {
    // Get all accounts
    const accounts = await prisma.bankAccount.findMany({
      where: { userId, isActive: true },
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    // Get transactions from last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const transactions = await prisma.personalTransaction.findMany({
      where: {
        userId,
        transactionDate: { gte: threeMonthsAgo },
      },
    });

    // Calculate averages
    const incomeTransactions = transactions.filter(t => t.type === 'INCOME');
    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amountEur, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amountEur, 0);

    const averageMonthlyIncome = totalIncome / 3;
    const averageMonthlyExpenses = totalExpenses / 3;
    const averageSavingRate = averageMonthlyIncome > 0
      ? ((averageMonthlyIncome - averageMonthlyExpenses) / averageMonthlyIncome) * 100
      : 0;

    // Current month expenses
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const currentMonthExpenses = expenseTransactions
      .filter(t => t.transactionDate >= startOfMonth)
      .reduce((sum, t) => sum + t.amountEur, 0);

    // Recent large expenses (> €200 in last month)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentLargeExpenses = expenseTransactions
      .filter(t => t.transactionDate >= oneMonthAgo && t.amountEur > 200)
      .map(t => ({
        amount: t.amountEur,
        description: t.description || t.merchant || 'Spesa',
        date: t.transactionDate,
      }));

    return {
      totalBalance,
      averageMonthlyIncome,
      averageMonthlyExpenses,
      averageSavingRate,
      currentMonthExpenses,
      recentLargeExpenses,
    };
  }

  private async generateReasoning(
    input: PurchaseEvaluationInput,
    context: FinancialContext,
    affordabilityScore: number,
    recommendation: string,
  ): Promise<string> {
    if (!this.openai.isAvailable()) {
      return this.generateTemplateReasoning(input, context, affordabilityScore, recommendation);
    }

    const systemPrompt = `Sei un consulente finanziario personale italiano.
Genera una breve spiegazione (2-3 frasi) sulla sostenibilità di un acquisto.
Sii diretto, pratico e usa un tono amichevole.
Rispondi in italiano, senza usare markdown.`;

    const userPrompt = `Valuta questo acquisto:
- Descrizione: ${input.description}
- Importo: €${input.amount}
- Rate: ${input.installments || 'Nessuna'}

Situazione finanziaria:
- Saldo totale: €${context.totalBalance.toFixed(2)}
- Reddito medio mensile: €${context.averageMonthlyIncome.toFixed(2)}
- Spese medie mensili: €${context.averageMonthlyExpenses.toFixed(2)}
- Tasso di risparmio: ${context.averageSavingRate.toFixed(1)}%

Punteggio sostenibilità: ${affordabilityScore}/100
Raccomandazione: ${recommendation}`;

    try {
      const response = await this.openai.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.5, maxTokens: 200 },
      );

      return response;
    } catch (error) {
      this.logger.error('Failed to generate reasoning:', error.message);
      return this.generateTemplateReasoning(input, context, affordabilityScore, recommendation);
    }
  }

  private generateTemplateReasoning(
    input: PurchaseEvaluationInput,
    context: FinancialContext,
    affordabilityScore: number,
    recommendation: string,
  ): string {
    const monthlyDisposable = context.averageMonthlyIncome - context.averageMonthlyExpenses;
    const percentOfBalance = (input.amount / context.totalBalance) * 100;

    if (recommendation === 'proceed') {
      return `Questo acquisto di €${input.amount} è sostenibile per il tuo budget. Rappresenta il ${percentOfBalance.toFixed(0)}% del tuo saldo e non compromette significativamente il tuo tasso di risparmio.`;
    } else if (recommendation === 'caution') {
      return `Puoi permetterti questo acquisto, ma con cautela. Valuta se è davvero necessario, dato che impatterà sul tuo budget mensile di circa €${(input.amount / (input.installments || 1)).toFixed(0)}.`;
    } else if (recommendation === 'delay') {
      return `Ti consiglio di rimandare questo acquisto. Con un risparmio mensile di €${monthlyDisposable.toFixed(0)}, potresti accumulare l'importo in ${Math.ceil(input.amount / monthlyDisposable)} mesi senza stressare il budget.`;
    } else {
      return `Questo acquisto non è sostenibile in questo momento. Rappresenta una quota troppo alta del tuo saldo e comprometterebbe la tua stabilità finanziaria.`;
    }
  }
}
