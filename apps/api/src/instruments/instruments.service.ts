import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@aurora/db';

const prisma = new PrismaClient();

@Injectable()
export class InstrumentsService {
  async listInstruments(
    type?: 'ETF' | 'STOCK' | 'BOND' | 'CRYPTO' | 'CASH',
    limit?: number,
  ) {
    const where: any = {};
    if (type) {
      where.type = type;
    }

    return prisma.instrument.findMany({
      where,
      take: limit || 100,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            positions: true,
          } as any,
        },
      },
    });
  }

  async getInstrument(instrumentId: string) {
    return prisma.instrument.findUnique({
      where: { id: instrumentId },
      include: {
        priceHistory: {
          orderBy: { date: 'desc' },
          take: 365,
        },
      } as any,
    });
  }

  async searchInstruments(query: string, type?: string) {
    const where: any = {
      OR: [
        { ticker: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { isin: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (type) {
      where.type = type;
    }

    return prisma.instrument.findMany({
      where,
      take: 20,
      orderBy: { name: 'asc' },
    });
  }

  async createInstrument(data: {
    ticker: string;
    name: string;
    type: 'ETF' | 'STOCK' | 'BOND' | 'CRYPTO' | 'CASH';
    isin?: string;
    currency?: string;
  }) {
    // For CRYPTO, ISIN is not applicable, always use empty string
    const isin = data.type === 'CRYPTO' ? '' : (data.isin || '');

    return prisma.instrument.create({
      data: {
        ticker: data.ticker,
        name: data.name,
        type: data.type,
        isin,
        currency: data.currency || 'EUR',
      } as any,
    });
  }

  async updatePriceHistory(
    instrumentId: string,
    prices: Array<{
      date: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>,
  ) {
    const operations = prices.map((price) =>
      prisma.priceHistory.upsert({
        where: {
          instrumentId_date: {
            instrumentId,
            date: price.date,
          },
        },
        create: {
          instrumentId,
          ...price,
        },
        update: price,
      }),
    );

    return prisma.$transaction(operations);
  }

  async updateInstrument(
    instrumentId: string,
    data: {
      ticker: string;
      name: string;
      type: 'ETF' | 'STOCK' | 'BOND' | 'CRYPTO' | 'CASH';
      isin?: string;
      currency?: string;
    },
  ) {
    // For CRYPTO, ISIN is not applicable, always use empty string
    const isin = data.type === 'CRYPTO' ? '' : (data.isin || '');

    return prisma.instrument.update({
      where: { id: instrumentId },
      data: {
        ticker: data.ticker,
        name: data.name,
        type: data.type,
        isin,
        currency: data.currency || 'EUR',
      } as any,
    });
  }

  async deleteInstrument(instrumentId: string) {
    return prisma.instrument.delete({
      where: { id: instrumentId },
    });
  }
}
