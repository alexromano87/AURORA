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
  isin: z.string().length(12),
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

// Export all types
export type IpsConfig = z.infer<typeof IpsConfigSchema>;
export type CreateIpsInput = z.infer<typeof CreateIpsSchema>;
export type CreateIpsVersionInput = z.infer<typeof CreateIpsVersionSchema>;
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type RunEngineInput = z.infer<typeof RunEngineSchema>;
export type AddInstrumentInput = z.infer<typeof AddInstrumentSchema>;
export type CreatePortfolioInput = z.infer<typeof CreatePortfolioSchema>;
