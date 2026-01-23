import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import type { TransactionInput } from '@aurora/types';

@ApiTags('transactions')
@Controller('api/portfolios/:portfolioId/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions' })
  async listTransactions(
    @Param('portfolioId') portfolioId: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.transactionsService.listTransactions(portfolioId, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Create transaction' })
  async createTransaction(
    @Param('portfolioId') portfolioId: string,
    @Body() input: TransactionInput,
  ) {
    return this.transactionsService.createTransaction(portfolioId, input);
  }
}
