import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@aurora/db';
import type { CreateBankAccountInput, UpdateBankAccountInput } from '@aurora/contracts';

@Injectable()
export class BankAccountsService {
  async listAccounts(userId: string, includeInactive = false) {
    return prisma.bankAccount.findMany({
      where: {
        userId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAccount(accountId: string) {
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Bank account not found: ${accountId}`);
    }

    return account;
  }

  async createAccount(userId: string, input: CreateBankAccountInput) {
    return prisma.bankAccount.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        currency: input.currency || 'EUR',
        initialBalance: input.initialBalance || 0,
        currentBalance: input.initialBalance || 0,
        color: input.color,
        icon: input.icon,
        linkedPortfolioId: input.linkedPortfolioId,
      },
    });
  }

  async updateAccount(accountId: string, input: UpdateBankAccountInput) {
    const account = await this.getAccount(accountId);

    return prisma.bankAccount.update({
      where: { id: accountId },
      data: {
        name: input.name ?? account.name,
        type: input.type ?? account.type,
        currency: input.currency ?? account.currency,
        color: input.color,
        icon: input.icon,
        isActive: input.isActive ?? account.isActive,
        linkedPortfolioId: input.linkedPortfolioId,
      },
    });
  }

  async deleteAccount(accountId: string) {
    await this.getAccount(accountId);

    // Soft delete - mark as inactive
    return prisma.bankAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });
  }

  async recalculateBalance(accountId: string) {
    const account = await this.getAccount(accountId);

    // Get all transactions for this account
    const transactions = await prisma.personalTransaction.findMany({
      where: { accountId },
    });

    let balance = account.initialBalance;

    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        balance += tx.amountEur;
      } else if (tx.type === 'EXPENSE') {
        balance -= tx.amountEur;
      } else if (tx.type === 'TRANSFER') {
        // If this is the source account
        if (tx.transferFromAccountId === accountId) {
          balance -= tx.amountEur;
        }
        // If this is the destination account
        if (tx.transferToAccountId === accountId) {
          balance += tx.amountEur;
        }
      }
    }

    return prisma.bankAccount.update({
      where: { id: accountId },
      data: { currentBalance: balance },
    });
  }

  async getBalanceHistory(accountId: string, days = 30) {
    await this.getAccount(accountId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return prisma.accountBalanceHistory.findMany({
      where: {
        accountId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });
  }

  async createDailySnapshot(accountId: string) {
    const account = await this.getAccount(accountId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.accountBalanceHistory.upsert({
      where: {
        accountId_date: {
          accountId,
          date: today,
        },
      },
      create: {
        accountId,
        date: today,
        balance: account.currentBalance,
      },
      update: {
        balance: account.currentBalance,
      },
    });
  }

  async getTotalBalance(userId: string, currency = 'EUR') {
    const accounts = await prisma.bankAccount.findMany({
      where: { userId, isActive: true },
    });

    // TODO: Implement currency conversion
    const total = accounts.reduce((sum, acc) => {
      if (acc.currency === currency) {
        return sum + acc.currentBalance;
      }
      // For now, assume EUR for all
      return sum + acc.currentBalance;
    }, 0);

    return {
      totalBalance: total,
      currency,
      accountsCount: accounts.length,
    };
  }

  async updateBalance(accountId: string, amountChange: number, type: 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT') {
    const account = await this.getAccount(accountId);

    let newBalance = account.currentBalance;

    switch (type) {
      case 'INCOME':
      case 'TRANSFER_IN':
        newBalance += amountChange;
        break;
      case 'EXPENSE':
      case 'TRANSFER_OUT':
        newBalance -= amountChange;
        break;
    }

    return prisma.bankAccount.update({
      where: { id: accountId },
      data: { currentBalance: newBalance },
    });
  }
}
