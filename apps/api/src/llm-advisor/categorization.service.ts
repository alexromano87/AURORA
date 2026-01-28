import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@aurora/db';
import { OpenAIService } from './openai.service';
import { ExpenseCategoriesService } from '../expense-categories/expense-categories.service';
import type { CategorizationResult } from '@aurora/types';
import * as crypto from 'crypto';

interface TransactionToCategorize {
  id?: string;
  merchant?: string;
  description?: string;
  amount: number;
}

@Injectable()
export class CategorizationService {
  private readonly logger = new Logger(CategorizationService.name);

  constructor(
    private readonly openai: OpenAIService,
    private readonly categoriesService: ExpenseCategoriesService,
  ) {}

  async categorizeTransaction(
    userId: string,
    transaction: TransactionToCategorize,
  ): Promise<CategorizationResult> {
    // Check cache first
    const cached = await this.getCachedResult(userId, transaction);
    if (cached) {
      return cached;
    }

    // Get available categories
    const categories = await this.categoriesService.getSystemCategories();

    // If OpenAI is not available, use rule-based fallback
    if (!this.openai.isAvailable()) {
      return this.ruleBasedCategorization(transaction, categories);
    }

    const systemPrompt = `Sei un assistente finanziario esperto in categorizzazione delle spese personali italiane.
Analizza la transazione fornita e assegna la categoria più appropriata dalla lista disponibile.

Rispondi SEMPRE in formato JSON con questa struttura:
{
  "categoryId": "uuid della categoria",
  "categoryName": "nome della categoria in italiano",
  "confidence": 0.0-1.0,
  "reasoning": "breve spiegazione"
}

Linee guida:
- Considera il merchant come indicatore principale
- Se la descrizione contiene parole chiave specifiche, usale
- Per transazioni ambigue, usa "other_expense" con confidence bassa
- Non inventare categorie non presenti nella lista`;

    const userPrompt = `Categorizza questa transazione:
- Merchant: ${transaction.merchant || 'Non specificato'}
- Descrizione: ${transaction.description || 'Nessuna descrizione'}
- Importo: €${transaction.amount.toFixed(2)}

Categorie disponibili:
${categories.map(c => `- ${c.id}: ${c.nameIt} (${c.name})`).join('\n')}`;

    try {
      const result = await this.openai.chatWithJSON<{
        categoryId: string;
        categoryName: string;
        confidence: number;
        reasoning: string;
      }>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.2 },
      );

      // Validate category exists
      const category = categories.find(c => c.id === result.categoryId);
      if (!category) {
        // Fallback to rule-based if LLM returns invalid category
        return this.ruleBasedCategorization(transaction, categories);
      }

      const categorizationResult: CategorizationResult = {
        categoryId: result.categoryId,
        categoryName: result.categoryName,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };

      // Cache the result
      await this.cacheResult(userId, transaction, categorizationResult);

      return categorizationResult;
    } catch (error) {
      this.logger.error('LLM categorization failed:', error.message);
      return this.ruleBasedCategorization(transaction, categories);
    }
  }

  async batchCategorize(
    userId: string,
    transactions: TransactionToCategorize[],
  ): Promise<Map<string, CategorizationResult>> {
    const results = new Map<string, CategorizationResult>();

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const promises = batch.map(async tx => {
        const result = await this.categorizeTransaction(userId, tx);
        if (tx.id) {
          results.set(tx.id, result);
        }
        return result;
      });

      await Promise.all(promises);

      // Small delay between batches
      if (i + batchSize < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  private ruleBasedCategorization(
    transaction: TransactionToCategorize,
    categories: Array<{ id: string; name: string; nameIt: string }>,
  ): CategorizationResult {
    const text = `${transaction.merchant || ''} ${transaction.description || ''}`.toLowerCase();

    // Rule-based patterns
    const patterns: Array<{ keywords: string[]; categoryName: string }> = [
      { keywords: ['esselunga', 'coop', 'conad', 'lidl', 'carrefour', 'supermercato', 'alimentari'], categoryName: 'groceries' },
      { keywords: ['ristorante', 'pizzeria', 'bar', 'mcdonald', 'burger', 'sushi', 'trattoria'], categoryName: 'restaurants' },
      { keywords: ['benzina', 'eni', 'q8', 'ip', 'carburante', 'diesel'], categoryName: 'fuel' },
      { keywords: ['trenitalia', 'italo', 'atm', 'metro', 'autobus', 'taxi', 'uber', 'bolt'], categoryName: 'transport' },
      { keywords: ['enel', 'eni gas', 'a2a', 'luce', 'gas', 'acqua', 'bolletta'], categoryName: 'utilities' },
      { keywords: ['affitto', 'rent', 'locazione'], categoryName: 'rent' },
      { keywords: ['mutuo', 'mortgage'], categoryName: 'mortgage' },
      { keywords: ['farmacia', 'ospedale', 'medico', 'dottore', 'visita'], categoryName: 'healthcare' },
      { keywords: ['netflix', 'spotify', 'amazon prime', 'disney', 'abbonamento'], categoryName: 'subscriptions' },
      { keywords: ['amazon', 'zalando', 'ebay', 'shopping'], categoryName: 'shopping' },
      { keywords: ['stipendio', 'salary', 'paga'], categoryName: 'salary' },
      { keywords: ['cinema', 'teatro', 'concerto', 'svago'], categoryName: 'entertainment' },
      { keywords: ['volo', 'hotel', 'booking', 'airbnb', 'viaggio'], categoryName: 'travel' },
      { keywords: ['assicurazione', 'polizza', 'insurance'], categoryName: 'insurance' },
      { keywords: ['tim', 'vodafone', 'wind', 'iliad', 'telefono', 'internet'], categoryName: 'phone_internet' },
    ];

    for (const pattern of patterns) {
      if (pattern.keywords.some(kw => text.includes(kw))) {
        const category = categories.find(c => c.name === pattern.categoryName);
        if (category) {
          return {
            categoryId: category.id,
            categoryName: category.nameIt,
            confidence: 0.7,
            reasoning: `Matched keyword pattern for ${pattern.categoryName}`,
          };
        }
      }
    }

    // Default to other_expense
    const otherCategory = categories.find(c => c.name === 'other_expense');
    return {
      categoryId: otherCategory?.id || '',
      categoryName: otherCategory?.nameIt || 'Altre Spese',
      confidence: 0.3,
      reasoning: 'No matching pattern found',
    };
  }

  private async getCachedResult(
    userId: string,
    transaction: TransactionToCategorize,
  ): Promise<CategorizationResult | null> {
    const inputHash = this.hashInput(transaction);

    const cached = await prisma.llmAnalysisCache.findUnique({
      where: {
        userId_type_inputHash: {
          userId,
          type: 'categorization',
          inputHash,
        },
      },
    });

    if (cached && cached.expiresAt > new Date()) {
      return cached.response as unknown as CategorizationResult;
    }

    return null;
  }

  private async cacheResult(
    userId: string,
    transaction: TransactionToCategorize,
    result: CategorizationResult,
  ): Promise<void> {
    const inputHash = this.hashInput(transaction);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.llmAnalysisCache.upsert({
      where: {
        userId_type_inputHash: {
          userId,
          type: 'categorization',
          inputHash,
        },
      },
      create: {
        userId,
        type: 'categorization',
        inputHash,
        prompt: JSON.stringify(transaction),
        response: result as any,
        expiresAt,
      },
      update: {
        response: result as any,
        expiresAt,
      },
    });
  }

  private hashInput(transaction: TransactionToCategorize): string {
    const input = `${transaction.merchant}|${transaction.description}|${transaction.amount}`;
    return crypto.createHash('sha256').update(input).digest('hex');
  }
}
