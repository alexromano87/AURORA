import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@aurora/db';
import type { CreateExpenseCategoryInput, UpdateExpenseCategoryInput } from '@aurora/contracts';

@Injectable()
export class ExpenseCategoriesService {
  async listCategories(userId: string, includeInactive = false) {
    // Get both system categories and user's custom categories
    const categories = await prisma.expenseCategory.findMany({
      where: {
        OR: [
          { userId: null, isSystem: true }, // System categories
          { userId }, // User's custom categories
        ],
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        children: {
          where: includeInactive ? {} : { isActive: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { nameIt: 'asc' }],
    });

    // Return only top-level categories (parentId is null)
    return categories.filter(cat => !cat.parentId);
  }

  async getCategory(categoryId: string) {
    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId },
      include: {
        children: true,
        parent: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category not found: ${categoryId}`);
    }

    return category;
  }

  async createCategory(userId: string, input: CreateExpenseCategoryInput) {
    // Check if category name already exists for this user
    const existing = await prisma.expenseCategory.findFirst({
      where: {
        userId,
        name: input.name,
      },
    });

    if (existing) {
      throw new BadRequestException(`Category "${input.name}" already exists`);
    }

    // Verify parent exists if provided
    if (input.parentId) {
      await this.getCategory(input.parentId);
    }

    return prisma.expenseCategory.create({
      data: {
        userId,
        name: input.name,
        nameIt: input.nameIt,
        icon: input.icon,
        color: input.color,
        parentId: input.parentId,
        isSystem: false,
        isActive: true,
      },
    });
  }

  async updateCategory(categoryId: string, input: UpdateExpenseCategoryInput) {
    const category = await this.getCategory(categoryId);

    // Cannot modify system categories
    if (category.isSystem) {
      throw new BadRequestException('Cannot modify system categories');
    }

    return prisma.expenseCategory.update({
      where: { id: categoryId },
      data: {
        name: input.name ?? category.name,
        nameIt: input.nameIt ?? category.nameIt,
        icon: input.icon ?? category.icon,
        color: input.color ?? category.color,
        parentId: input.parentId,
        isActive: input.isActive ?? category.isActive,
      },
    });
  }

  async deleteCategory(categoryId: string) {
    const category = await this.getCategory(categoryId);

    // Cannot delete system categories
    if (category.isSystem) {
      throw new BadRequestException('Cannot delete system categories');
    }

    // Check if category has transactions
    const transactionCount = await prisma.personalTransaction.count({
      where: { categoryId },
    });

    if (transactionCount > 0) {
      // Soft delete - mark as inactive
      return prisma.expenseCategory.update({
        where: { id: categoryId },
        data: { isActive: false },
      });
    }

    // Hard delete if no transactions
    return prisma.expenseCategory.delete({
      where: { id: categoryId },
    });
  }

  async getCategoryByName(name: string, userId?: string) {
    return prisma.expenseCategory.findFirst({
      where: {
        name,
        OR: [
          { userId: null, isSystem: true },
          ...(userId ? [{ userId }] : []),
        ],
      },
    });
  }

  async getSystemCategories() {
    return prisma.expenseCategory.findMany({
      where: {
        isSystem: true,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { nameIt: 'asc' }],
    });
  }
}
