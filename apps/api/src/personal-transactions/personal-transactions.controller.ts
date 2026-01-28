import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PersonalTransactionsService } from './personal-transactions.service';
import { ImportService } from './import.service';
import type {
  CreatePersonalTransactionInput,
  UpdatePersonalTransactionInput,
  CreateTransferInput,
  TransactionFilters,
  ImportMapping,
} from '@aurora/contracts';

@ApiTags('personal-transactions')
@Controller('api/personal-transactions')
export class PersonalTransactionsController {
  constructor(
    private readonly transactionsService: PersonalTransactionsService,
    private readonly importService: ImportService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List personal transactions with filters' })
  async listTransactions(
    @Query('userId') userId: string = 'user_default',
    @Query('accountId') accountId?: string,
    @Query('type') type?: 'INCOME' | 'EXPENSE' | 'TRANSFER',
    @Query('categoryId') categoryId?: string,
    @Query('merchant') merchant?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('uncategorized') uncategorized?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '50',
  ) {
    const filters: Partial<TransactionFilters> = {
      accountId,
      type,
      categoryId,
      merchant,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      startDate,
      endDate,
      uncategorized: uncategorized === 'true',
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    };

    return this.transactionsService.listTransactions(userId, filters);
  }

  @Get('uncategorized-count')
  @ApiOperation({ summary: 'Get count of uncategorized transactions' })
  async getUncategorizedCount(
    @Query('userId') userId: string = 'user_default',
  ) {
    const count = await this.transactionsService.getUncategorizedCount(userId);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single transaction' })
  async getTransaction(@Param('id') id: string) {
    return this.transactionsService.getTransaction(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  async createTransaction(
    @Body() body: CreatePersonalTransactionInput & { userId?: string },
  ) {
    const userId = body.userId || 'user_default';
    return this.transactionsService.createTransaction(userId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  async updateTransaction(
    @Param('id') id: string,
    @Body() body: UpdatePersonalTransactionInput,
  ) {
    return this.transactionsService.updateTransaction(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  async deleteTransaction(@Param('id') id: string) {
    return this.transactionsService.deleteTransaction(id);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Create a transfer between accounts' })
  async createTransfer(
    @Body() body: CreateTransferInput & { userId?: string },
  ) {
    const userId = body.userId || 'user_default';
    return this.transactionsService.createTransfer(userId, body);
  }

  @Post('bulk-categorize')
  @ApiOperation({ summary: 'Categorize multiple transactions' })
  async bulkCategorize(
    @Body() body: { transactionIds: string[]; categoryId: string },
  ) {
    return this.transactionsService.bulkCategorize(
      body.transactionIds,
      body.categoryId,
    );
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Delete multiple transactions' })
  async bulkDelete(@Body() body: { transactionIds: string[] }) {
    return this.transactionsService.bulkDelete(body.transactionIds);
  }

  // Import endpoints
  @Post('import/detect-columns')
  @ApiOperation({ summary: 'Detect columns from CSV content' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async detectColumns(@UploadedFile() file: Express.Multer.File) {
    const content = file.buffer.toString('utf-8');
    return this.importService.detectColumns(content);
  }

  @Post('import/preview')
  @ApiOperation({ summary: 'Preview import results' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async previewImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('accountId') accountId: string,
    @Body('mapping') mappingStr: string,
  ) {
    const content = file.buffer.toString('utf-8');
    const mapping: ImportMapping = JSON.parse(mappingStr);
    return this.importService.previewImport(accountId, content, mapping);
  }

  @Post('import/execute')
  @ApiOperation({ summary: 'Execute import' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async executeImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string = 'user_default',
    @Body('accountId') accountId: string,
    @Body('mapping') mappingStr: string,
  ) {
    const content = file.buffer.toString('utf-8');
    const mapping: ImportMapping = JSON.parse(mappingStr);
    return this.importService.executeImport(userId, accountId, content, mapping);
  }

  @Get('import/history')
  @ApiOperation({ summary: 'Get import history' })
  async getImportHistory(@Query('userId') userId: string = 'user_default') {
    return this.importService.getImportHistory(userId);
  }
}
