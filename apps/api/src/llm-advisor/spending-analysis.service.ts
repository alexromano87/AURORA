import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@aurora/db';
import { OpenAIService } from './openai.service';
import type { SpendingAnalysis, SavingOpportunity, SpendingAnomaly, ExpenseCategory } from '@aurora/types';

@Injectable()
export class SpendingAnalysisService {
  private readonly logger = new Logger(SpendingAnalysisService.name);

  constructor(private readonly openai: OpenAIService) {}

  async analyzeMonthlySpending(userId: string, months = 3): Promise<SpendingAnalysis> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get all transactions in the period
    const transactions = await prisma.personalTransaction.findMany({
      where: {
        userId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
      },
      orderBy: { transactionDate: 'desc' },
    });

    // Calculate summary
    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amountEur, 0);

    const expenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amountEur, 0);

    const netSavings = income - expenses;
    const savingRate = income > 0 ? (netSavings / income) * 100 : 0;

    // Group by category
    const categoryTotals = new Map<string, {
      category: ExpenseCategory | null;
      amount: number;
      count: number;
    }>();

    for (const tx of transactions.filter(t => t.type === 'EXPENSE')) {
      const key = tx.categoryId || 'uncategorized';
      const existing = categoryTotals.get(key) || {
        category: tx.category,
        amount: 0,
        count: 0,
      };
      existing.amount += tx.amountEur;
      existing.count++;
      categoryTotals.set(key, existing);
    }

    // Sort by amount and get top categories
    const sortedCategories = Array.from(categoryTotals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const topCategories = sortedCategories
      .filter(c => c.category)
      .map(c => ({
        category: c.category!,
        amount: c.amount,
        percentage: expenses > 0 ? (c.amount / expenses) * 100 : 0,
        transactionCount: c.count,
        vsLastPeriod: 0, // TODO: Compare with previous period
      }));

    // Generate insights using LLM
    const insights = await this.generateInsights(userId, {
      income,
      expenses,
      savingRate,
      topCategories,
      transactions,
    });

    // Identify saving opportunities
    const savingOpportunities = await this.identifySavingOpportunities(
      userId,
      topCategories,
    );

    // Detect anomalies
    const anomalies = await this.detectAnomalies(userId, transactions);

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalIncome: income,
        totalExpenses: expenses,
        netSavings,
        savingRate,
      },
      topCategories,
      insights,
      savingOpportunities,
      anomalies,
    };
  }

  private async generateInsights(
    userId: string,
    data: {
      income: number;
      expenses: number;
      savingRate: number;
      topCategories: Array<{
        category: ExpenseCategory;
        amount: number;
        percentage: number;
      }>;
      transactions: any[];
    },
  ): Promise<string[]> {
    if (!this.openai.isAvailable()) {
      return this.generateBasicInsights(data);
    }

    const systemPrompt = `Sei un consulente finanziario personale italiano.
Analizza i dati di spesa forniti e genera 3-5 insights brevi e actionable.
Ogni insight deve essere una frase concisa in italiano.
Rispondi in formato JSON: { "insights": ["insight1", "insight2", ...] }`;

    const userPrompt = `Dati finanziari dell'utente:
- Entrate totali: €${data.income.toFixed(2)}
- Spese totali: €${data.expenses.toFixed(2)}
- Tasso di risparmio: ${data.savingRate.toFixed(1)}%

Categorie principali:
${data.topCategories.slice(0, 5).map(c =>
  `- ${c.category.nameIt}: €${c.amount.toFixed(2)} (${c.percentage.toFixed(1)}%)`
).join('\n')}

Numero transazioni: ${data.transactions.length}`;

    try {
      const result = await this.openai.chatWithJSON<{ insights: string[] }>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.5 },
      );

      return result.insights || this.generateBasicInsights(data);
    } catch (error) {
      this.logger.error('Failed to generate insights:', error.message);
      return this.generateBasicInsights(data);
    }
  }

  private generateBasicInsights(data: {
    income: number;
    expenses: number;
    savingRate: number;
    topCategories: Array<{
      category: ExpenseCategory;
      amount: number;
      percentage: number;
    }>;
  }): string[] {
    const insights: string[] = [];

    if (data.savingRate >= 20) {
      insights.push(`Ottimo tasso di risparmio del ${data.savingRate.toFixed(0)}%! Stai gestendo bene le tue finanze.`);
    } else if (data.savingRate >= 10) {
      insights.push(`Tasso di risparmio del ${data.savingRate.toFixed(0)}%: buono, ma c'è margine di miglioramento.`);
    } else if (data.savingRate > 0) {
      insights.push(`Tasso di risparmio del ${data.savingRate.toFixed(0)}%: considera di ridurre alcune spese.`);
    } else {
      insights.push(`Stai spendendo più di quanto guadagni. È importante rivedere le spese.`);
    }

    if (data.topCategories.length > 0) {
      const top = data.topCategories[0];
      insights.push(`La categoria "${top.category.nameIt}" rappresenta il ${top.percentage.toFixed(0)}% delle tue spese.`);
    }

    return insights;
  }

  async identifySavingOpportunities(
    userId: string,
    topCategories: Array<{
      category: ExpenseCategory;
      amount: number;
      percentage: number;
      transactionCount: number;
    }>,
  ): Promise<SavingOpportunity[]> {
    const opportunities: SavingOpportunity[] = [];

    // Categories where savings are typically possible
    const savingTargets: Record<string, { suggestion: string; targetReduction: number; difficulty: 'easy' | 'medium' | 'hard' }> = {
      restaurants: {
        suggestion: 'Considera di cucinare più spesso a casa',
        targetReduction: 0.3,
        difficulty: 'easy',
      },
      entertainment: {
        suggestion: 'Cerca alternative gratuite o più economiche per lo svago',
        targetReduction: 0.25,
        difficulty: 'easy',
      },
      subscriptions: {
        suggestion: 'Rivedi gli abbonamenti attivi e cancella quelli non utilizzati',
        targetReduction: 0.4,
        difficulty: 'easy',
      },
      shopping: {
        suggestion: 'Aspetta 24 ore prima di acquisti non essenziali',
        targetReduction: 0.2,
        difficulty: 'medium',
      },
      fuel: {
        suggestion: 'Considera carpooling o mezzi pubblici quando possibile',
        targetReduction: 0.15,
        difficulty: 'medium',
      },
    };

    for (const cat of topCategories) {
      const target = savingTargets[cat.category.name];
      if (target && cat.amount > 50) {
        const potentialSaving = cat.amount * target.targetReduction;
        opportunities.push({
          categoryId: cat.category.id,
          category: cat.category,
          currentMonthlySpend: cat.amount,
          suggestedMonthlySpend: cat.amount - potentialSaving,
          potentialSaving,
          suggestion: target.suggestion,
          difficulty: target.difficulty,
        });
      }
    }

    return opportunities.slice(0, 5);
  }

  async detectAnomalies(
    userId: string,
    transactions: Array<{
      id: string;
      amountEur: number;
      type: string;
      categoryId: string | null;
      merchant: string | null;
      description: string | null;
      transactionDate: Date;
      category: ExpenseCategory | null;
    }>,
  ): Promise<SpendingAnomaly[]> {
    const anomalies: SpendingAnomaly[] = [];
    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');

    if (expenseTransactions.length < 5) {
      return anomalies;
    }

    // Calculate statistics per category
    const categoryStats = new Map<string, { amounts: number[]; mean: number; stdDev: number }>();

    for (const tx of expenseTransactions) {
      const key = tx.categoryId || 'uncategorized';
      const stats = categoryStats.get(key) || { amounts: [], mean: 0, stdDev: 0 };
      stats.amounts.push(tx.amountEur);
      categoryStats.set(key, stats);
    }

    // Calculate mean and standard deviation
    for (const [key, stats] of categoryStats) {
      if (stats.amounts.length >= 3) {
        stats.mean = stats.amounts.reduce((a, b) => a + b, 0) / stats.amounts.length;
        const squaredDiffs = stats.amounts.map(a => Math.pow(a - stats.mean, 2));
        stats.stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / stats.amounts.length);
      }
    }

    // Find anomalies (transactions > 2 standard deviations from mean)
    for (const tx of expenseTransactions) {
      const key = tx.categoryId || 'uncategorized';
      const stats = categoryStats.get(key);

      if (stats && stats.stdDev > 0 && stats.amounts.length >= 3) {
        const zScore = (tx.amountEur - stats.mean) / stats.stdDev;

        if (zScore > 2) {
          anomalies.push({
            transactionId: tx.id,
            transaction: tx as any,
            reason: `Importo significativamente superiore alla media per questa categoria`,
            severity: zScore > 3 ? 'critical' : 'warning',
            expectedAmount: stats.mean,
            deviation: zScore,
          });
        }
      }
    }

    // Also flag very large transactions (> €500)
    for (const tx of expenseTransactions) {
      if (tx.amountEur > 500 && !anomalies.find(a => a.transactionId === tx.id)) {
        anomalies.push({
          transactionId: tx.id,
          transaction: tx as any,
          reason: 'Transazione di importo elevato',
          severity: tx.amountEur > 1000 ? 'warning' : 'info',
        });
      }
    }

    return anomalies.slice(0, 10);
  }
}
