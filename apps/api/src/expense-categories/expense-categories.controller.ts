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
import { ExpenseCategoriesService } from './expense-categories.service';
import type { CreateExpenseCategoryInput, UpdateExpenseCategoryInput } from '@aurora/contracts';

@ApiTags('expense-categories')
@Controller('api/expense-categories')
export class ExpenseCategoriesController {
  constructor(private readonly categoriesService: ExpenseCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all expense categories' })
  async listCategories(
    @Query('userId') userId: string = 'user_default',
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.categoriesService.listCategories(
      userId,
      includeInactive === 'true',
    );
  }

  @Get('system')
  @ApiOperation({ summary: 'List system default categories' })
  async getSystemCategories() {
    return this.categoriesService.getSystemCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single category' })
  async getCategory(@Param('id') id: string) {
    return this.categoriesService.getCategory(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom category' })
  async createCategory(
    @Body() body: CreateExpenseCategoryInput & { userId?: string },
  ) {
    const userId = body.userId || 'user_default';
    return this.categoriesService.createCategory(userId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateExpenseCategoryInput,
  ) {
    return this.categoriesService.updateCategory(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a custom category' })
  async deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}
