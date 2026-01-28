import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BankAccountsService } from './bank-accounts.service';
import type { CreateBankAccountInput, UpdateBankAccountInput } from '@aurora/contracts';

@ApiTags('bank-accounts')
@Controller('api/bank-accounts')
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List all bank accounts for a user' })
  async listAccounts(
    @Query('userId') userId: string = 'user_default',
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.bankAccountsService.listAccounts(
      userId,
      includeInactive === 'true',
    );
  }

  @Get('totals')
  @ApiOperation({ summary: 'Get total balance across all accounts' })
  async getTotals(
    @Query('userId') userId: string = 'user_default',
    @Query('currency') currency: string = 'EUR',
  ) {
    return this.bankAccountsService.getTotalBalance(userId, currency);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single bank account' })
  async getAccount(@Param('id') id: string) {
    return this.bankAccountsService.getAccount(id);
  }

  @Get(':id/balance-history')
  @ApiOperation({ summary: 'Get balance history for an account' })
  async getBalanceHistory(
    @Param('id') id: string,
    @Query('days') days: number = 30,
  ) {
    return this.bankAccountsService.getBalanceHistory(id, days);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new bank account' })
  async createAccount(
    @Body() body: CreateBankAccountInput & { userId?: string },
  ) {
    const userId = body.userId || 'user_default';
    return this.bankAccountsService.createAccount(userId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a bank account' })
  async updateAccount(
    @Param('id') id: string,
    @Body() body: UpdateBankAccountInput,
  ) {
    return this.bankAccountsService.updateAccount(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete (deactivate) a bank account' })
  async deleteAccount(@Param('id') id: string) {
    return this.bankAccountsService.deleteAccount(id);
  }

  @Post(':id/recalculate')
  @ApiOperation({ summary: 'Recalculate account balance from transactions' })
  async recalculateBalance(@Param('id') id: string) {
    return this.bankAccountsService.recalculateBalance(id);
  }

  @Post(':id/snapshot')
  @ApiOperation({ summary: 'Create a daily balance snapshot' })
  async createSnapshot(@Param('id') id: string) {
    return this.bankAccountsService.createDailySnapshot(id);
  }
}
