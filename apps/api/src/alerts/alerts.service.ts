import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@aurora/db';

const prisma = new PrismaClient();

@Injectable()
export class AlertsService {
  async listAlerts(userId: string, acknowledged?: boolean) {
    // First get all portfolio IDs for this user
    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      select: { id: true },
    });

    const portfolioIds = portfolios.map(p => p.id);

    const where: any = {
      portfolioId: { in: portfolioIds },
    };

    if (acknowledged !== undefined) {
      where.acknowledged = acknowledged;
    }

    return (prisma.alert.findMany as any)({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        portfolio: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getAlert(alertId: string) {
    return (prisma.alert.findUnique as any)({
      where: { id: alertId },
      include: {
        portfolio: true,
      },
    });
  }

  async dismissAlert(alertId: string) {
    return prisma.alert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
      } as any,
    });
  }

  async resolveAlert(alertId: string) {
    return prisma.alert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
      } as any,
    });
  }

  async createAlert(
    userId: string,
    portfolioId: string,
    type: string,
    priority: string,
    title: string,
    message: string,
    data?: any,
  ) {
    return prisma.alert.create({
      data: {
        portfolioId,
        type,
        priority,
        title,
        message,
        data: data || {},
        acknowledged: false,
      } as any,
    });
  }
}
