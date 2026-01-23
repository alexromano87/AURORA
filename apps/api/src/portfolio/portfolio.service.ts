import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@aurora/db';
import type { PortfolioSummary, Position } from '@aurora/types';

@Injectable()
export class PortfolioService {
  /**
   * Get all portfolios for user
   */
  async listPortfolios(userId: string) {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      include: {
        positions: {
          include: {
            instrument: true,
          },
        },
        _count: {
          select: {
            transactions: true,
            positions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return portfolios;
  }

  /**
   * Get portfolio by ID with full details
   */
  async getPortfolio(portfolioId: string): Promise<PortfolioSummary> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        positions: {
          include: {
            instrument: {
              include: {
                priceHistory: {
                  orderBy: { date: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        transactions: {
          orderBy: { executedAt: 'desc' },
        },
      },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }

    // Calculate summary
    let totalValue = 0;
    let totalInvested = 0;

    const positions: Position[] = portfolio.positions.map((pos) => {
      const currentPrice =
        pos.instrument.priceHistory[0]?.close || pos.avgCostEur;
      const currentValue = pos.quantity * currentPrice;
      totalValue += currentValue;

      const totalCost = pos.quantity * pos.avgCostEur;
      const totalReturn = currentValue - totalCost;
      const totalReturnPct = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

      return {
        instrumentId: pos.instrumentId,
        instrumentName: pos.instrument.name,
        isin: pos.instrument.isin,
        quantity: pos.quantity,
        avgCost: pos.avgCostEur,
        currentPrice,
        currentValue,
        totalReturn,
        totalReturnPct,
        weight: 0, // Will be calculated after totalValue is known
      };
    });

    // Calculate weights
    positions.forEach((pos) => {
      pos.weight = totalValue > 0 ? pos.currentValue / totalValue : 0;
    });

    // Calculate total invested from transactions
    portfolio.transactions.forEach((tx) => {
      if (tx.side === 'BUY') {
        totalInvested += tx.totalEur;
      } else {
        totalInvested -= tx.totalEur;
      }
    });

    const totalReturn = totalValue - totalInvested;
    const totalReturnPct =
      totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    return {
      portfolioId: portfolio.id,
      totalValue,
      totalInvested,
      totalReturn,
      totalReturnPct,
      positions,
    };
  }

  /**
   * Create new portfolio
   */
  async createPortfolio(userId: string, name: string, type: string = 'paper') {
    const portfolio = await prisma.portfolio.create({
      data: {
        name,
        type,
        userId,
      },
    });

    return portfolio;
  }

  /**
   * Get snapshots for portfolio
   */
  async getSnapshots(portfolioId: string, limit: number = 30) {
    const snapshots = await prisma.positionSnapshot.findMany({
      where: { portfolioId },
      orderBy: { snapshotDate: 'desc' },
      take: limit,
    });

    return snapshots;
  }

  /**
   * Create snapshot (monthly)
   */
  async createSnapshot(portfolioId: string) {
    const summary = await this.getPortfolio(portfolioId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await prisma.positionSnapshot.create({
      data: {
        portfolioId,
        snapshotDate: today,
        totalValueEur: summary.totalValue,
        items: JSON.parse(JSON.stringify(summary.positions)) as any,
      },
    });

    return snapshot;
  }
}
