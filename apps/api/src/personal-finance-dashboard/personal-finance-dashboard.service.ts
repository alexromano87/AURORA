import { Injectable } from '@nestjs/common';
import { prisma } from '@aurora/db';
import type {
  FinanceKPIs,
  BalanceTrendPoint,
  CategoryBreakdown,
  IncomeExpenseData,
  ExpenseCategory,
} from '@aurora/types';

@Injectable()
export class PersonalFinanceDashboardService {
  async getKPIs(userId: string, startDate?: Date, endDate?: Date): Promise<FinanceKPIs> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getFullYear(), end.getMonth(), 1);

    // Get all active accounts
    const accounts = await prisma.bankAccount.findMany({
      where: { userId, isActive: true },
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    // Get transactions for the period
    const transactions = await prisma.personalTransaction.findMany({
      where: {
        userId,
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        category: true,
      },
    });

    const monthlyIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amountEur, 0);

    const monthlyExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amountEur, 0);

    const savingRate = monthlyIncome > 0
      ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
      : 0;

    // Calculate daily average expense
    const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    const averageDailyExpense = monthlyExpenses / daysInPeriod;

    // Get balance change (compare with start of period)
    const previousMonthStart = new Date(start);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);

    const previousTransactions = await prisma.personalTransaction.findMany({
      where: {
        userId,
        transactionDate: {
          gte: previousMonthStart,
          lt: start,
        },
      },
    });

    const previousBalance = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0)
      + previousTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amountEur, 0)
      - previousTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amountEur, 0);

    const totalBalanceChange = totalBalance - previousBalance;
    const totalBalanceChangePct = previousBalance > 0
      ? (totalBalanceChange / previousBalance) * 100
      : 0;

    // Find largest expense category
    const categoryExpenses = new Map<string, { category: ExpenseCategory; amount: number }>();
    for (const tx of transactions.filter(t => t.type === 'EXPENSE' && t.category)) {
      const key = tx.categoryId!;
      const existing = categoryExpenses.get(key);
      if (existing) {
        existing.amount += tx.amountEur;
      } else {
        categoryExpenses.set(key, { category: tx.category!, amount: tx.amountEur });
      }
    }

    let largestExpenseCategory;
    if (categoryExpenses.size > 0) {
      const sorted = Array.from(categoryExpenses.values()).sort((a, b) => b.amount - a.amount);
      const largest = sorted[0];
      largestExpenseCategory = {
        category: largest.category,
        amount: largest.amount,
        percentage: monthlyExpenses > 0 ? (largest.amount / monthlyExpenses) * 100 : 0,
      };
    }

    // Count uncategorized transactions
    const uncategorizedCount = await prisma.personalTransaction.count({
      where: { userId, categoryId: null, type: 'EXPENSE' },
    });

    return {
      totalBalance,
      totalBalanceChange,
      totalBalanceChangePct,
      monthlyIncome,
      monthlyExpenses,
      savingRate,
      averageDailyExpense,
      largestExpenseCategory,
      accountsCount: accounts.length,
      uncategorizedCount,
    };
  }

  async getBalanceTrend(userId: string, days = 30): Promise<BalanceTrendPoint[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all transactions in period
    const transactions = await prisma.personalTransaction.findMany({
      where: {
        userId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { transactionDate: 'asc' },
    });

    // Get starting balance from accounts
    const accounts = await prisma.bankAccount.findMany({
      where: { userId, isActive: true },
    });

    // Calculate balance before start date
    const priorTransactions = await prisma.personalTransaction.findMany({
      where: {
        userId,
        transactionDate: { lt: startDate },
      },
    });

    let runningBalance = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
    for (const tx of priorTransactions) {
      if (tx.type === 'INCOME') {
        runningBalance += tx.amountEur;
      } else if (tx.type === 'EXPENSE') {
        runningBalance -= tx.amountEur;
      }
    }

    // Group transactions by day
    const dailyData = new Map<string, { balance: number; income: number; expenses: number }>();

    // Initialize all days
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyData.set(dateStr, { balance: runningBalance, income: 0, expenses: 0 });
    }

    // Apply transactions
    for (const tx of transactions) {
      const dateStr = tx.transactionDate.toISOString().split('T')[0];
      const dayData = dailyData.get(dateStr);

      if (dayData) {
        if (tx.type === 'INCOME') {
          runningBalance += tx.amountEur;
          dayData.income += tx.amountEur;
        } else if (tx.type === 'EXPENSE') {
          runningBalance -= tx.amountEur;
          dayData.expenses += tx.amountEur;
        }
        dayData.balance = runningBalance;
      }
    }

    // Update subsequent days with running balance
    let lastBalance = runningBalance;
    const sortedDates = Array.from(dailyData.keys()).sort();
    for (const date of sortedDates) {
      const data = dailyData.get(date)!;
      if (data.income > 0 || data.expenses > 0) {
        lastBalance = data.balance;
      } else {
        data.balance = lastBalance;
      }
    }

    return Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      balance: data.balance,
      income: data.income,
      expenses: data.expenses,
    }));
  }

  async getCategoryBreakdown(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CategoryBreakdown> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getFullYear(), end.getMonth(), 1);

    // Get previous period for trend calculation
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - periodDays);

    const [currentTransactions, previousTransactions] = await Promise.all([
      prisma.personalTransaction.findMany({
        where: {
          userId,
          type: 'EXPENSE',
          transactionDate: { gte: start, lte: end },
        },
        include: { category: true },
      }),
      prisma.personalTransaction.findMany({
        where: {
          userId,
          type: 'EXPENSE',
          transactionDate: { gte: previousStart, lt: start },
        },
        include: { category: true },
      }),
    ]);

    // Calculate totals by category
    const categoryTotals = new Map<string, {
      category: ExpenseCategory;
      amount: number;
      count: number;
    }>();

    const previousTotals = new Map<string, number>();

    for (const tx of currentTransactions) {
      if (tx.category) {
        const key = tx.categoryId!;
        const existing = categoryTotals.get(key) || {
          category: tx.category,
          amount: 0,
          count: 0,
        };
        existing.amount += tx.amountEur;
        existing.count++;
        categoryTotals.set(key, existing);
      }
    }

    for (const tx of previousTransactions) {
      if (tx.categoryId) {
        previousTotals.set(
          tx.categoryId,
          (previousTotals.get(tx.categoryId) || 0) + tx.amountEur,
        );
      }
    }

    const totalExpenses = currentTransactions.reduce((sum, t) => sum + t.amountEur, 0);

    const categories = Array.from(categoryTotals.values())
      .sort((a, b) => b.amount - a.amount)
      .map(cat => {
        const previousAmount = previousTotals.get(cat.category.id) || 0;
        const trend = previousAmount > 0
          ? ((cat.amount - previousAmount) / previousAmount) * 100
          : 0;

        return {
          category: cat.category,
          amount: cat.amount,
          percentage: totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0,
          transactionCount: cat.count,
          trend,
        };
      });

    // Calculate uncategorized
    const uncategorizedTxs = currentTransactions.filter(t => !t.categoryId);
    const uncategorizedAmount = uncategorizedTxs.reduce((sum, t) => sum + t.amountEur, 0);

    return {
      categories,
      uncategorized: {
        amount: uncategorizedAmount,
        percentage: totalExpenses > 0 ? (uncategorizedAmount / totalExpenses) * 100 : 0,
        transactionCount: uncategorizedTxs.length,
      },
      total: totalExpenses,
    };
  }

  async getIncomeVsExpenses(userId: string, months = 6): Promise<IncomeExpenseData> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);

    const transactions = await prisma.personalTransaction.findMany({
      where: {
        userId,
        transactionDate: { gte: startDate, lte: endDate },
      },
    });

    // Group by month
    const monthlyData = new Map<string, {
      income: number;
      expenses: number;
    }>();

    // Initialize all months
    for (let m = 0; m < months; m++) {
      const d = new Date(endDate);
      d.setMonth(d.getMonth() - m);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(key, { income: 0, expenses: 0 });
    }

    // Aggregate transactions
    for (const tx of transactions) {
      const d = tx.transactionDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const data = monthlyData.get(key);

      if (data) {
        if (tx.type === 'INCOME') {
          data.income += tx.amountEur;
        } else if (tx.type === 'EXPENSE') {
          data.expenses += tx.amountEur;
        }
      }
    }

    // Convert to array
    const monthsArray = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        savings: data.income - data.expenses,
        savingRate: data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0,
      }));

    return { months: monthsArray };
  }

  async getActiveAlerts(userId: string) {
    return prisma.spendingAlert.findMany({
      where: {
        userId,
        acknowledged: false,
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });
  }

  async acknowledgeAlert(alertId: string) {
    return prisma.spendingAlert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
      },
    });
  }
}
