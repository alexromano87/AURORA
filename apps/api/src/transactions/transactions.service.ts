import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@aurora/db';
import type { TransactionInput } from '@aurora/types';

@Injectable()
export class TransactionsService {
  /**
   * Create transaction and update position
   */
  async createTransaction(portfolioId: string, input: TransactionInput) {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }

    const totalEur = input.quantity * input.priceEur + (input.feeEur || 0);

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        portfolioId,
        instrumentId: input.instrumentId,
        side: input.side,
        quantity: input.quantity,
        priceEur: input.priceEur,
        feeEur: input.feeEur || 0,
        totalEur,
        executedAt: input.executedAt || new Date(),
        note: input.note,
      },
    });

    // Update position
    await this.updatePosition(portfolioId, input.instrumentId);

    return transaction;
  }

  /**
   * Update position based on transactions
   */
  private async updatePosition(portfolioId: string, instrumentId: string) {
    const transactions = await prisma.transaction.findMany({
      where: {
        portfolioId,
        instrumentId,
      },
      orderBy: { executedAt: 'asc' },
    });

    let totalQuantity = 0;
    let totalCost = 0;

    transactions.forEach((tx) => {
      if (tx.side === 'BUY') {
        totalQuantity += tx.quantity;
        totalCost += tx.totalEur;
      } else {
        // SELL
        totalQuantity -= tx.quantity;
        // Adjust cost proportionally
        const avgCost = totalCost / (totalQuantity + tx.quantity);
        totalCost -= avgCost * tx.quantity;
      }
    });

    const avgCostEur = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    if (totalQuantity > 0) {
      await prisma.position.upsert({
        where: {
          portfolioId_instrumentId: {
            portfolioId,
            instrumentId,
          },
        },
        create: {
          portfolioId,
          instrumentId,
          quantity: totalQuantity,
          avgCostEur,
        },
        update: {
          quantity: totalQuantity,
          avgCostEur,
        },
      });
    } else {
      // Remove position if quantity is 0
      await prisma.position.deleteMany({
        where: {
          portfolioId,
          instrumentId,
        },
      });
    }
  }

  /**
   * List transactions for portfolio
   */
  async listTransactions(portfolioId: string, limit: number = 50) {
    return prisma.transaction.findMany({
      where: { portfolioId },
      include: {
        instrument: true,
      },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }
}
