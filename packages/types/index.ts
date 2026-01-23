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
  isin: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPct: number;
  weight: number;
}

export interface PortfolioSummary {
  portfolioId: string;
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
