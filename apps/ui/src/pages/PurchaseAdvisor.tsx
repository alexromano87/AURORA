import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import {
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Calculator,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface PurchaseFormData {
  description: string;
  amount: number;
  isRecurring: boolean;
  recurringMonths: number;
  installments: number;
  urgency: 'low' | 'medium' | 'high';
}

const RECOMMENDATION_CONFIG = {
  proceed: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800',
    label: 'Procedi',
    description: 'Questo acquisto è sostenibile per il tuo budget',
  },
  caution: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    label: 'Attenzione',
    description: 'Valuta attentamente questo acquisto',
  },
  delay: {
    icon: Clock,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    label: 'Rimanda',
    description: 'Ti consigliamo di attendere prima di procedere',
  },
  avoid: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'Evita',
    description: 'Questo acquisto non è consigliabile in questo momento',
  },
};

export function PurchaseAdvisorPage() {
  const userId = 'user_default';

  const [formData, setFormData] = useState<PurchaseFormData>({
    description: '',
    amount: 0,
    isRecurring: false,
    recurringMonths: 12,
    installments: 1,
    urgency: 'medium',
  });

  const [result, setResult] = useState<any>(null);
  const [installmentPlan, setInstallmentPlan] = useState<any>(null);

  const { data: financialContext, isLoading: contextLoading } = useQuery({
    queryKey: ['financial-context', userId],
    queryFn: () => api.llmAdvisor.getFinancialContext(userId),
  });

  const { data: insights } = useQuery({
    queryKey: ['llm-insights', userId],
    queryFn: () => api.llmAdvisor.getInsights(userId),
  });

  const evaluatePurchase = useMutation({
    mutationFn: (data: PurchaseFormData) =>
      api.llmAdvisor.evaluatePurchase({
        ...data,
        userId,
        installments: data.installments > 1 ? data.installments : undefined,
        recurringMonths: data.isRecurring ? data.recurringMonths : undefined,
      }),
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const suggestInstallments = useMutation({
    mutationFn: (amount: number) =>
      api.llmAdvisor.suggestInstallments(amount, 24, userId),
    onSuccess: (data) => {
      setInstallmentPlan(data);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount > 0 && formData.description) {
      evaluatePurchase.mutate(formData);
      if (formData.amount > 500) {
        suggestInstallments.mutate(formData.amount);
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const getAffordabilityColor = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Lightbulb className="h-8 w-8 text-yellow-500" />
          AI Purchase Advisor
        </h1>
        <p className="text-muted-foreground">
          Valuta i tuoi acquisti in base alla tua situazione finanziaria
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Financial Context */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">La Tua Situazione</h2>
            {contextLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ) : financialContext ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Totale</p>
                  <p className="text-xl font-bold">{formatCurrency(financialContext.totalBalance)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Entrate Medie</p>
                    <p className="text-lg font-semibold text-green-500">
                      {formatCurrency(financialContext.averageMonthlyIncome)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Spese Medie</p>
                    <p className="text-lg font-semibold text-red-500">
                      {formatCurrency(financialContext.averageMonthlyExpenses)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tasso di Risparmio</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${financialContext.averageSavingRate >= 20 ? 'bg-green-500' : financialContext.averageSavingRate >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, Math.max(0, financialContext.averageSavingRate))}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{financialContext.averageSavingRate.toFixed(1)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget Disponibile</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(financialContext.averageMonthlyIncome - financialContext.averageMonthlyExpenses)}
                    <span className="text-sm font-normal text-muted-foreground">/mese</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aggiungi transazioni per vedere la tua situazione finanziaria
              </p>
            )}
          </div>

          {/* Recent insights */}
          {insights?.savingOpportunities?.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                Suggerimenti
              </h2>
              <div className="space-y-3">
                {insights.savingOpportunities.slice(0, 3).map((opp: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">
                      Risparmia {formatCurrency(opp.potentialSaving)}/mese
                    </p>
                    <p className="text-xs text-muted-foreground">{opp.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Evaluation Form & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Form */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Valuta un Acquisto</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cosa vuoi acquistare?</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  placeholder="es. iPhone 15 Pro, Abbonamento palestra..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Importo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border rounded-lg bg-background"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Urgenza</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="aurora-select w-full"
                  >
                    <option value="low">Bassa - Posso aspettare</option>
                    <option value="medium">Media - Vorrei presto</option>
                    <option value="high">Alta - Ne ho bisogno ora</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Spesa ricorrente</span>
                </label>

                {formData.isRecurring && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">per</span>
                    <input
                      type="number"
                      min="1"
                      max="36"
                      value={formData.recurringMonths}
                      onChange={(e) => setFormData({ ...formData, recurringMonths: parseInt(e.target.value) || 12 })}
                      className="w-16 px-2 py-1 border rounded bg-background text-sm"
                    />
                    <span className="text-sm text-muted-foreground">mesi</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Rate (opzionale)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={formData.installments}
                    onChange={(e) => setFormData({ ...formData, installments: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-16 text-right">
                    {formData.installments === 1 ? 'Unica' : `${formData.installments} rate`}
                  </span>
                </div>
                {formData.installments > 1 && formData.amount > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(formData.amount / formData.installments)}/mese
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={evaluatePurchase.isPending || !formData.amount || !formData.description}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {evaluatePurchase.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Analizzando...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4" />
                    Valuta Acquisto
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Main recommendation */}
              <div className={`rounded-lg border p-6 ${RECOMMENDATION_CONFIG[result.recommendation as keyof typeof RECOMMENDATION_CONFIG].bgColor} ${RECOMMENDATION_CONFIG[result.recommendation as keyof typeof RECOMMENDATION_CONFIG].borderColor}`}>
                <div className="flex items-start gap-4">
                  {(() => {
                    const Icon = RECOMMENDATION_CONFIG[result.recommendation as keyof typeof RECOMMENDATION_CONFIG].icon;
                    return <Icon className={`h-8 w-8 ${RECOMMENDATION_CONFIG[result.recommendation as keyof typeof RECOMMENDATION_CONFIG].color}`} />;
                  })()}
                  <div className="flex-1">
                    <h3 className={`text-xl font-bold ${RECOMMENDATION_CONFIG[result.recommendation as keyof typeof RECOMMENDATION_CONFIG].color}`}>
                      {RECOMMENDATION_CONFIG[result.recommendation as keyof typeof RECOMMENDATION_CONFIG].label}
                    </h3>
                    <p className="text-sm mt-1">
                      {RECOMMENDATION_CONFIG[result.recommendation as keyof typeof RECOMMENDATION_CONFIG].description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Sostenibilità</p>
                    <p className="text-2xl font-bold">{result.affordabilityScore}/100</p>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full ${getAffordabilityColor(result.affordabilityScore)}`}
                        style={{ width: `${result.affordabilityScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-lg bg-white/50 dark:bg-black/20">
                  <p className="text-sm">{result.reasoning}</p>
                </div>
              </div>

              {/* Impact metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Impatto sul Risparmio</p>
                  <p className={`text-lg font-bold ${result.impact.onSavingRate < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {result.impact.onSavingRate >= 0 ? '+' : ''}{result.impact.onSavingRate.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Impatto Mensile</p>
                  <p className="text-lg font-bold text-red-500">
                    -{formatCurrency(result.impact.onMonthlyBudget)}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Tempo per Recuperare</p>
                  <p className="text-lg font-bold">
                    {result.impact.monthsToRecover > 0 ? `${result.impact.monthsToRecover} mesi` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Warnings */}
              {result.warnings?.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-4">
                  <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">Attenzione</h4>
                  <ul className="space-y-1">
                    {result.warnings.map((warning: string, i: number) => (
                      <li key={i} className="text-sm text-orange-700 dark:text-orange-300 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alternatives */}
              {result.alternatives && (
                <div className="rounded-lg border bg-card p-6">
                  <h4 className="font-semibold mb-4">Alternative Consigliate</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    {result.alternatives.suggestedAmount && (
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Importo Consigliato</p>
                        <p className="text-lg font-bold">{formatCurrency(result.alternatives.suggestedAmount)}</p>
                      </div>
                    )}
                    {result.alternatives.suggestedInstallments && (
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Rate Consigliate</p>
                        <p className="text-lg font-bold">{result.alternatives.suggestedInstallments} rate</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(formData.amount / result.alternatives.suggestedInstallments)}/mese
                        </p>
                      </div>
                    )}
                    {result.alternatives.suggestedDelay && (
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Attendi</p>
                        <p className="text-lg font-bold">{result.alternatives.suggestedDelay}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Installment plan */}
              {installmentPlan && (
                <div className="rounded-lg border bg-card p-6">
                  <h4 className="font-semibold mb-4">Piano Rate Suggerito</h4>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Rata Consigliata</p>
                        <p className="text-xl font-bold">{installmentPlan.recommended} rate</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Importo Mensile</p>
                        <p className="text-xl font-bold">{formatCurrency(installmentPlan.monthlyAmount)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {installmentPlan.options.map((option: any) => (
                      <div
                        key={option.months}
                        className={`p-3 rounded-lg text-center ${
                          option.months === installmentPlan.recommended
                            ? 'bg-primary/10 border-2 border-primary'
                            : 'bg-muted/50 border border-transparent'
                        }`}
                      >
                        <p className="text-lg font-bold">{option.months}</p>
                        <p className="text-xs text-muted-foreground">rate</p>
                        <p className="text-sm font-medium mt-1">{formatCurrency(option.monthlyAmount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          option.rating === 'Ottimo' ? 'bg-green-100 text-green-700' :
                          option.rating === 'Buono' ? 'bg-blue-100 text-blue-700' :
                          option.rating === 'Accettabile' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {option.rating}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
