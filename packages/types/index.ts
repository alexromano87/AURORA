// AURORA Shared Types

// ==================== IPS Types ====================

export interface IpsConfig {
  version: string;
  profile: 'conservativo' | 'moderato' | 'aggressivo';
  phase: 'ETF-only' | 'ETF-stocks';
  horizon_years: number;
  pac_monthly_eur: {
    min: number;
    max: number;
    default: number;
  };
  targets: Array<{
    bucket: string;
    weight: number;
    description?: string;
  }>;
  rebalance: {
    mode: 'contributi-only' | 'full';
    frequency: 'monthly' | 'quarterly';
    bands: {
      asset_class_abs: number;
      instrument_abs: number;
    };
    sell_threshold_multiplier?: number;
  };
  constraints: {
    min_instruments: number;
    max_instruments: number;
    max_single_instrument_weight: number;
    allowed_domiciles?: string[];
    required_ucits?: boolean;
  };
}

// ==================== Portfolio Types ====================

export interface Position {
  instrumentId: string;
  instrumentName: string;
  isin: string | null;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPct: number;
  weight: number;
}

export interface PortfolioSummary {
  id: string;
  portfolioId: string;
  name: string;
  type: string;
  userId: string;
  totalValue: number;
  totalInvested: number;
  totalReturn: number;
  totalReturnPct: number;
  positions: Position[];
}

// ==================== Transaction Types ====================

export interface TransactionInput {
  instrumentId: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  priceEur: number;
  feeEur?: number;
  executedAt?: Date;
  note?: string;
}

// ==================== Engine Types ====================

export type EngineJobType = 'ETF_SCORING' | 'PORTFOLIO_PROPOSAL' | 'MONTHLY_PAC';

export interface EngineJobPayload {
  runId: string;
  type: EngineJobType;
  dataAsof: string;
  ipsVersionId?: string;
  params: Record<string, any>;
}

export interface EngineJobResult {
  runId: string;
  type: EngineJobType;
  status: 'success' | 'error';
  data?: any;
  error?: string;
  durationMs?: number;
}

// ==================== Scoring Types ====================

export interface EtfScoringBreakdown {
  costs: number;
  tracking: number;
  liquidity: number;
  robustness: number;
  preferences: number;
}

export interface EtfScoringResult {
  rank: number;
  instrumentId: string;
  isin: string;
  name: string;
  ticker: string;
  score: number;
  breakdown: EtfScoringBreakdown;
  fundamentals: {
    ter: number | null;
    aum: number | null;
    trackingDifference: number | null;
    provider: string | null;
    replicationMethod: string | null;
  };
  redFlags: string[];
}

export interface EtfScoringOutput {
  runId: string;
  bucket: string;
  dataAsof: string;
  candidatesEvaluated: number;
  candidatesPassed: number;
  top3: EtfScoringResult[];
}

// ==================== PAC Types ====================

export interface DriftItem {
  instrumentId: string;
  instrumentName: string;
  targetWeight: number;
  currentWeight: number;
  drift: number;
  driftPct: number;
}

export interface PacProposal {
  runId: string;
  type: 'MONTHLY_PAC';
  dataAsof: string;
  tradeList: Array<{
    instrumentId: string;
    instrumentName: string;
    side: 'BUY' | 'SELL';
    amountEur: number;
  }>;
  rationale: {
    totalValuePreTrade: number;
    contribution: number;
    driftSnapshot: DriftItem[];
    selectedInstrument: string;
    selectedDrift: number;
    constraintsPassed: boolean;
    violations?: Array<{
      type: string;
      message: string;
      data: Record<string, any>;
    }>;
  };
}

// ==================== Alert Types ====================

export type AlertPriority = 'high' | 'medium' | 'low';

export type AlertType =
  | 'drift_breach'
  | 'concentration'
  | 'ips_change'
  | 'data_quality'
  | 'better_etf_available';

export interface Alert {
  id: string;
  priority: AlertPriority;
  type: AlertType;
  title: string;
  message: string;
  data?: Record<string, any>;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  createdAt: Date;
}

// ==================== API Response Types ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==================== Personal Finance Types ====================

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY' | 'CAD' | 'AUD';
export type BankAccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT';
export type PersonalTransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface BankAccount {
  id: string;
  userId: string;
  name: string;
  type: BankAccountType;
  currency: Currency;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
  color?: string;
  icon?: string;
  linkedPortfolioId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountBalanceHistory {
  id: string;
  accountId: string;
  date: Date;
  balance: number;
}

export interface ExpenseCategory {
  id: string;
  userId?: string;
  name: string;
  nameIt: string;
  icon: string;
  color: string;
  parentId?: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  children?: ExpenseCategory[];
}

export interface PersonalTransaction {
  id: string;
  userId: string;
  accountId: string;
  type: PersonalTransactionType;
  amount: number;
  currency: Currency;
  amountEur: number;
  categoryId?: string;
  category?: ExpenseCategory;
  merchant?: string;
  description?: string;
  note?: string;
  transferToAccountId?: string;
  transferFromAccountId?: string;
  linkedTransferId?: string;
  llmCategorized: boolean;
  llmConfidence?: number;
  llmSuggestedCategory?: string;
  importBatchId?: string;
  importSource?: string;
  externalId?: string;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportBatch {
  id: string;
  userId: string;
  accountId: string;
  filename: string;
  source: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  importedRows: number;
  duplicateRows: number;
  errorRows: number;
  errors?: any[];
  mapping?: any;
  createdAt: Date;
  completedAt?: Date;
}

export interface ParsedTransaction {
  transactionDate: Date;
  amount: number;
  type: PersonalTransactionType;
  description?: string;
  merchant?: string;
  externalId?: string;
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  sampleTransactions: ParsedTransaction[];
  errors: Array<{ row: number; message: string }>;
}

// ==================== LLM Advisor Types ====================

export interface CategorizationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning?: string;
}

export interface SpendingAnomaly {
  transactionId: string;
  transaction: PersonalTransaction;
  reason: string;
  severity: 'info' | 'warning' | 'critical';
  expectedAmount?: number;
  deviation?: number;
}

export interface SavingOpportunity {
  categoryId: string;
  category: ExpenseCategory;
  currentMonthlySpend: number;
  suggestedMonthlySpend: number;
  potentialSaving: number;
  suggestion: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SpendingAnalysis {
  period: { start: Date; end: Date };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    savingRate: number;
  };
  topCategories: Array<{
    category: ExpenseCategory;
    amount: number;
    percentage: number;
    transactionCount: number;
    vsLastPeriod: number;
  }>;
  insights: string[];
  savingOpportunities: SavingOpportunity[];
  anomalies: SpendingAnomaly[];
}

export interface PurchaseAdvice {
  canAfford: boolean;
  affordabilityScore: number; // 0-100
  recommendation: 'proceed' | 'caution' | 'avoid' | 'delay';
  reasoning: string;
  impact: {
    onSavingRate: number;
    onMonthlyBudget: number;
    monthsToRecover: number;
  };
  alternatives?: {
    suggestedAmount?: number;
    suggestedInstallments?: number;
    suggestedDelay?: string;
  };
  warnings: string[];
}

export interface FinancialContext {
  totalBalance: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageSavingRate: number;
  currentMonthExpenses: number;
  recentLargeExpenses: Array<{
    amount: number;
    description: string;
    date: Date;
  }>;
}

// ==================== Dashboard Types ====================

export interface FinanceKPIs {
  totalBalance: number;
  totalBalanceChange: number;
  totalBalanceChangePct: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingRate: number;
  averageDailyExpense: number;
  largestExpenseCategory?: {
    category: ExpenseCategory;
    amount: number;
    percentage: number;
  };
  accountsCount: number;
  uncategorizedCount: number;
}

export interface BalanceTrendPoint {
  date: string;
  balance: number;
  income: number;
  expenses: number;
}

export interface CategoryBreakdown {
  categories: Array<{
    category: ExpenseCategory;
    amount: number;
    percentage: number;
    transactionCount: number;
    trend: number;
  }>;
  uncategorized: {
    amount: number;
    percentage: number;
    transactionCount: number;
  };
  total: number;
}

export interface IncomeExpenseData {
  months: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
    savingRate: number;
  }>;
}

// ==================== Spending Alert Types ====================

export type SpendingAlertType = 'anomaly' | 'budget_exceeded' | 'unusual_merchant' | 'recurring_change';
export type SpendingAlertSeverity = 'info' | 'warning' | 'critical';

export interface SpendingAlert {
  id: string;
  userId: string;
  type: SpendingAlertType;
  severity: SpendingAlertSeverity;
  title: string;
  message: string;
  data?: Record<string, any>;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  createdAt: Date;
}
