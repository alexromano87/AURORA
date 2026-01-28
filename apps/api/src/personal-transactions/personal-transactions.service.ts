import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@aurora/db';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import { CurrencyService } from '../currency/currency.service';
import type {
  CreatePersonalTransactionInput,
  UpdatePersonalTransactionInput,
  CreateTransferInput,
  TransactionFilters
} from '@aurora/contracts';

@Injectable()
export class PersonalTransactionsService {
  constructor(
    private readonly bankAccountsService: BankAccountsService,
    private readonly currencyService: CurrencyService,
  ) {}

  async listTransactions(userId: string, filters: Partial<TransactionFilters> = {}) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where: any = { userId };

    if (filters.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.uncategorized) {
      where.categoryId = null;
    }

    if (filters.merchant) {
      where.merchant = { contains: filters.merchant, mode: 'insensitive' };
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where.amountEur = {};
      if (filters.minAmount !== undefined) {
        where.amountEur.gte = filters.minAmount;
      }
      if (filters.maxAmount !== undefined) {
        where.amountEur.lte = filters.maxAmount;
      }
    }

    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) {
        where.transactionDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.transactionDate.lte = new Date(filters.endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.personalTransaction.findMany({
        where,
        include: {
          category: true,
          account: true,
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.personalTransaction.count({ where }),
    ]);

    return {
      items: transactions,
      total,
      page,
      pageSize,
      hasMore: skip + transactions.length < total,
    };
  }

  async getTransaction(transactionId: string) {
    const transaction = await prisma.personalTransaction.findUnique({
      where: { id: transactionId },
      include: {
        category: true,
        account: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction not found: ${transactionId}`);
    }

    return transaction;
  }

  async createTransaction(userId: string, input: CreatePersonalTransactionInput) {
    // Verify account exists
    const account = await this.bankAccountsService.getAccount(input.accountId);

    // Convert amount to EUR
    const currency = input.currency || 'EUR';
    const amountEur = this.currencyService.convertToEur(input.amount, currency);

    const transaction = await prisma.personalTransaction.create({
      data: {
        userId,
        accountId: input.accountId,
        type: input.type,
        amount: input.amount,
        currency,
        amountEur,
        categoryId: input.categoryId,
        merchant: input.merchant,
        description: input.description,
        note: input.note,
        transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
        importSource: 'manual',
      },
      include: {
        category: true,
        account: true,
      },
    });

    // Update account balance
    if (input.type === 'INCOME') {
      await this.bankAccountsService.updateBalance(input.accountId, amountEur, 'INCOME');
    } else if (input.type === 'EXPENSE') {
      await this.bankAccountsService.updateBalance(input.accountId, amountEur, 'EXPENSE');
    }

    return transaction;
  }

  async updateTransaction(transactionId: string, input: UpdatePersonalTransactionInput) {
    const existing = await this.getTransaction(transactionId);

    // If amount/type changed, we need to recalculate account balance
    const needsBalanceUpdate =
      input.amount !== undefined ||
      input.type !== undefined ||
      input.accountId !== undefined;

    const currency = input.currency || existing.currency;
    const amountEur = input.amount
      ? this.currencyService.convertToEur(input.amount, currency)
      : existing.amountEur;

    const updated = await prisma.personalTransaction.update({
      where: { id: transactionId },
      data: {
        accountId: input.accountId ?? existing.accountId,
        type: input.type ?? existing.type,
        amount: input.amount ?? existing.amount,
        currency,
        amountEur,
        categoryId: input.categoryId,
        merchant: input.merchant ?? existing.merchant,
        description: input.description ?? existing.description,
        note: input.note ?? existing.note,
        transactionDate: input.transactionDate
          ? new Date(input.transactionDate)
          : existing.transactionDate,
      },
      include: {
        category: true,
        account: true,
      },
    });

    // Recalculate affected account balances
    if (needsBalanceUpdate) {
      await this.bankAccountsService.recalculateBalance(existing.accountId);
      if (input.accountId && input.accountId !== existing.accountId) {
        await this.bankAccountsService.recalculateBalance(input.accountId);
      }
    }

    return updated;
  }

  async deleteTransaction(transactionId: string) {
    const transaction = await this.getTransaction(transactionId);

    await prisma.personalTransaction.delete({
      where: { id: transactionId },
    });

    // Recalculate account balance
    await this.bankAccountsService.recalculateBalance(transaction.accountId);

    return { success: true };
  }

  async createTransfer(userId: string, input: CreateTransferInput) {
    // Verify both accounts exist
    await this.bankAccountsService.getAccount(input.fromAccountId);
    await this.bankAccountsService.getAccount(input.toAccountId);

    if (input.fromAccountId === input.toAccountId) {
      throw new BadRequestException('Cannot transfer to the same account');
    }

    const currency = input.currency || 'EUR';
    const amountEur = this.currencyService.convertToEur(input.amount, currency);
    const linkedTransferId = crypto.randomUUID();

    // Create outgoing transaction
    const outgoing = await prisma.personalTransaction.create({
      data: {
        userId,
        accountId: input.fromAccountId,
        type: 'TRANSFER',
        amount: input.amount,
        currency,
        amountEur,
        transferToAccountId: input.toAccountId,
        linkedTransferId,
        description: input.description || 'Trasferimento in uscita',
        transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
        importSource: 'manual',
      },
    });

    // Create incoming transaction
    const incoming = await prisma.personalTransaction.create({
      data: {
        userId,
        accountId: input.toAccountId,
        type: 'TRANSFER',
        amount: input.amount,
        currency,
        amountEur,
        transferFromAccountId: input.fromAccountId,
        linkedTransferId,
        description: input.description || 'Trasferimento in entrata',
        transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
        importSource: 'manual',
      },
    });

    // Update both account balances
    await this.bankAccountsService.updateBalance(input.fromAccountId, amountEur, 'TRANSFER_OUT');
    await this.bankAccountsService.updateBalance(input.toAccountId, amountEur, 'TRANSFER_IN');

    return { outgoing, incoming };
  }

  async bulkCategorize(transactionIds: string[], categoryId: string) {
    const updated = await prisma.personalTransaction.updateMany({
      where: { id: { in: transactionIds } },
      data: { categoryId },
    });

    return { updated: updated.count };
  }

  async bulkDelete(transactionIds: string[]) {
    // Get accounts that need balance recalculation
    const transactions = await prisma.personalTransaction.findMany({
      where: { id: { in: transactionIds } },
      select: { accountId: true },
    });

    const accountIds = [...new Set(transactions.map(t => t.accountId))];

    await prisma.personalTransaction.deleteMany({
      where: { id: { in: transactionIds } },
    });

    // Recalculate all affected account balances
    for (const accountId of accountIds) {
      await this.bankAccountsService.recalculateBalance(accountId);
    }

    return { deleted: transactionIds.length };
  }

  async getUncategorizedCount(userId: string): Promise<number> {
    return prisma.personalTransaction.count({
      where: { userId, categoryId: null },
    });
  }
}
