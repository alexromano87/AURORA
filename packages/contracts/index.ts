import { z } from 'zod';

// ==================== IPS Schemas ====================

export const IpsConfigSchema = z.object({
  version: z.string(),
  profile: z.enum(['conservativo', 'moderato', 'aggressivo']),
  phase: z.enum(['ETF-only', 'ETF-stocks']),
  horizon_years: z.number().int().positive(),
  pac_monthly_eur: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    default: z.number().positive(),
  }),
  targets: z.array(
    z.object({
      bucket: z.string(),
      weight: z.number().min(0).max(1),
      description: z.string().optional(),
    })
  ),
  rebalance: z.object({
    mode: z.enum(['contributi-only', 'full']),
    frequency: z.enum(['monthly', 'quarterly']),
    bands: z.object({
      asset_class_abs: z.number().min(0).max(1),
      instrument_abs: z.number().min(0).max(1),
    }),
    sell_threshold_multiplier: z.number().positive().optional(),
  }),
  constraints: z.object({
    min_instruments: z.number().int().positive(),
    max_instruments: z.number().int().positive(),
    max_single_instrument_weight: z.number().min(0).max(1),
    allowed_domiciles: z.array(z.string()).optional(),
    required_ucits: z.boolean().optional(),
  }),
});

export const CreateIpsSchema = z.object({
  userId: z.string(),
  initialVersion: IpsConfigSchema,
});

export const CreateIpsVersionSchema = z.object({
  config: IpsConfigSchema,
});

// ==================== Transaction Schemas ====================

export const CreateTransactionSchema = z.object({
  instrumentId: z.string().uuid(),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  priceEur: z.number().positive(),
  feeEur: z.number().min(0).optional().default(0),
  executedAt: z.string().datetime().optional(),
  note: z.string().optional(),
});

// ==================== Engine Job Schemas ====================

export const RunEngineSchema = z.object({
  type: z.enum(['ETF_SCORING', 'PORTFOLIO_PROPOSAL', 'MONTHLY_PAC']),
  portfolioId: z.string().uuid().optional(),
  params: z.record(z.any()),
});

// ==================== Alert Schemas ====================

export const AcknowledgeAlertSchema = z.object({
  alertId: z.string().uuid(),
});

// ==================== Instrument Schemas ====================

export const AddInstrumentSchema = z.object({
  isin: z.string().length(12).optional(),
  name: z.string().min(1),
  ticker: z.string().optional(),
  category: z.string(),
  yahooTicker: z.string().optional(),
  exchange: z.string().optional(),
});

// ==================== Portfolio Schemas ====================

export const CreatePortfolioSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['paper', 'real']).default('paper'),
  userId: z.string(),
});

// ==================== Personal Finance Schemas ====================

// Enums
export const CurrencyEnum = z.enum(['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD']);
export const BankAccountTypeEnum = z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT']);
export const PersonalTransactionTypeEnum = z.enum(['INCOME', 'EXPENSE', 'TRANSFER']);

// Bank Account Schemas
export const CreateBankAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: BankAccountTypeEnum,
  currency: CurrencyEnum.default('EUR'),
  initialBalance: z.number().default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional(),
  linkedPortfolioId: z.string().uuid().optional(),
});

export const UpdateBankAccountSchema = CreateBankAccountSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Personal Transaction Schemas
export const CreatePersonalTransactionSchema = z.object({
  accountId: z.string().uuid(),
  type: PersonalTransactionTypeEnum,
  amount: z.number().positive(),
  currency: CurrencyEnum.default('EUR'),
  categoryId: z.string().uuid().optional().nullable(),
  merchant: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  note: z.string().max(1000).optional(),
  transactionDate: z.string().datetime().optional(),
});

export const UpdatePersonalTransactionSchema = CreatePersonalTransactionSchema.partial();

export const CreateTransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().positive(),
  currency: CurrencyEnum.default('EUR'),
  description: z.string().max(500).optional(),
  transactionDate: z.string().datetime().optional(),
});

export const TransactionFiltersSchema = z.object({
  accountId: z.string().uuid().optional(),
  type: PersonalTransactionTypeEnum.optional(),
  categoryId: z.string().uuid().optional(),
  merchant: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  uncategorized: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(50),
});

// Category Schemas
export const CreateExpenseCategorySchema = z.object({
  name: z.string().min(1).max(50),
  nameIt: z.string().min(1).max(50),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  parentId: z.string().uuid().optional().nullable(),
});

export const UpdateExpenseCategorySchema = CreateExpenseCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Import Schemas
export const ImportMappingSchema = z.object({
  dateColumn: z.string(),
  amountColumn: z.string(),
  descriptionColumn: z.string().optional(),
  merchantColumn: z.string().optional(),
  categoryColumn: z.string().optional(),
  dateFormat: z.string().default('DD/MM/YYYY'),
  amountFormat: z.enum(['positive_negative', 'separate_columns', 'with_sign']),
  incomeColumn: z.string().optional(),
  expenseColumn: z.string().optional(),
  skipRows: z.number().int().min(0).default(0),
  encoding: z.string().default('utf-8'),
  delimiter: z.string().default(','),
});

export const ImportPreviewSchema = z.object({
  accountId: z.string().uuid(),
  mapping: ImportMappingSchema,
});

export const ImportExecuteSchema = z.object({
  accountId: z.string().uuid(),
  mapping: ImportMappingSchema,
  categorize: z.boolean().default(true),
});

// LLM Advisor Schemas
export const CategorizeSingleSchema = z.object({
  merchant: z.string().optional(),
  description: z.string().optional(),
  amount: z.number(),
});

export const CategorizeBatchSchema = z.object({
  transactions: z.array(z.object({
    id: z.string().uuid(),
    merchant: z.string().optional(),
    description: z.string().optional(),
    amount: z.number(),
  })),
});

export const PurchaseEvaluationSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  isRecurring: z.boolean().default(false),
  recurringMonths: z.number().int().positive().optional(),
  installments: z.number().int().positive().optional(),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const SpendingAnalysisRequestSchema = z.object({
  months: z.number().int().positive().max(12).default(3),
  includeRecommendations: z.boolean().default(true),
});

// Dashboard Schemas
export const DashboardKpisRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const BalanceTrendRequestSchema = z.object({
  days: z.number().int().positive().max(365).default(30),
});

export const CategoryBreakdownRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Export all types
export type IpsConfig = z.infer<typeof IpsConfigSchema>;
export type CreateIpsInput = z.infer<typeof CreateIpsSchema>;
export type CreateIpsVersionInput = z.infer<typeof CreateIpsVersionSchema>;
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type RunEngineInput = z.infer<typeof RunEngineSchema>;
export type AddInstrumentInput = z.infer<typeof AddInstrumentSchema>;
export type CreatePortfolioInput = z.infer<typeof CreatePortfolioSchema>;

// Personal Finance Types
export type Currency = z.infer<typeof CurrencyEnum>;
export type BankAccountType = z.infer<typeof BankAccountTypeEnum>;
export type PersonalTransactionType = z.infer<typeof PersonalTransactionTypeEnum>;
export type CreateBankAccountInput = z.infer<typeof CreateBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof UpdateBankAccountSchema>;
export type CreatePersonalTransactionInput = z.infer<typeof CreatePersonalTransactionSchema>;
export type UpdatePersonalTransactionInput = z.infer<typeof UpdatePersonalTransactionSchema>;
export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;
export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;
export type CreateExpenseCategoryInput = z.infer<typeof CreateExpenseCategorySchema>;
export type UpdateExpenseCategoryInput = z.infer<typeof UpdateExpenseCategorySchema>;
export type ImportMapping = z.infer<typeof ImportMappingSchema>;
export type ImportPreviewInput = z.infer<typeof ImportPreviewSchema>;
export type ImportExecuteInput = z.infer<typeof ImportExecuteSchema>;
export type CategorizeSingleInput = z.infer<typeof CategorizeSingleSchema>;
export type CategorizeBatchInput = z.infer<typeof CategorizeBatchSchema>;
export type PurchaseEvaluationInput = z.infer<typeof PurchaseEvaluationSchema>;
export type SpendingAnalysisRequest = z.infer<typeof SpendingAnalysisRequestSchema>;
export type DashboardKpisRequest = z.infer<typeof DashboardKpisRequestSchema>;
export type BalanceTrendRequest = z.infer<typeof BalanceTrendRequestSchema>;
export type CategoryBreakdownRequest = z.infer<typeof CategoryBreakdownRequestSchema>;
