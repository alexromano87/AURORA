import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CreditCard,
  Receipt,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useMemo, useState } from 'react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'];

export function PersonalFinancePage() {
  const userId = 'user_default';
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['personal-finance-kpis', userId],
    queryFn: () => api.personalFinance.getKpis(userId),
  });

  const { data: balanceTrend } = useQuery({
    queryKey: ['balance-trend', userId, selectedPeriod],
    queryFn: () => api.personalFinance.getBalanceTrend(userId, parseInt(selectedPeriod)),
  });

  const { data: categoryBreakdown } = useQuery({
    queryKey: ['category-breakdown', userId],
    queryFn: () => api.personalFinance.getCategoryBreakdown(userId),
  });

  const { data: incomeVsExpenses } = useQuery({
    queryKey: ['income-vs-expenses', userId],
    queryFn: () => api.personalFinance.getIncomeVsExpenses(userId, 6),
  });

  const { data: accounts } = useQuery({
    queryKey: ['bank-accounts', userId],
    queryFn: () => api.bankAccounts.list(userId),
  });

  const { data: alerts } = useQuery({
    queryKey: ['spending-alerts', userId],
    queryFn: () => api.personalFinance.getAlerts(userId),
  });

  const { data: insights } = useQuery({
    queryKey: ['llm-insights', userId],
    queryFn: () => api.llmAdvisor.getInsights(userId),
  });

  const { data: uncategorized } = useQuery({
    queryKey: ['uncategorized-count', userId],
    queryFn: () => api.personalTransactions.getUncategorizedCount(userId),
  });

  const acknowledgeAlert = useMutation({
    mutationFn: (alertId: string) => api.personalFinance.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spending-alerts'] });
    },
  });

  const pieData = useMemo(() => {
    if (!categoryBreakdown?.categories) return [];
    return categoryBreakdown.categories.slice(0, 8).map((cat: any) => ({
      name: cat.category?.nameIt || 'Altro',
      value: cat.amount,
      color: cat.category?.color || '#9CA3AF',
    }));
  }, [categoryBreakdown]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  if (kpisLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Finanza Personale</h1>
          <p className="text-muted-foreground">
            Monitora le tue spese, entrate e risparmi
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/bank-accounts"
            className="inline-flex items-center px-4 py-2 rounded-lg border hover:bg-accent"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Conti
          </Link>
          <Link
            to="/personal-transactions"
            className="inline-flex items-center px-4 py-2 rounded-lg border hover:bg-accent"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Transazioni
          </Link>
          <Link
            to="/purchase-advisor"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Advisor
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Saldo Totale</p>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(kpis?.totalBalance || 0)}
          </p>
          {kpis?.totalBalanceChangePct !== 0 && (
            <p className={`text-xs flex items-center gap-1 ${kpis?.totalBalanceChangePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {kpis?.totalBalanceChangePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {kpis?.totalBalanceChangePct >= 0 ? '+' : ''}{kpis?.totalBalanceChangePct?.toFixed(1)}% vs mese scorso
            </p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Entrate Mensili</p>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-green-500">
            {formatCurrency(kpis?.monthlyIncome || 0)}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Spese Mensili</p>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-500">
            {formatCurrency(kpis?.monthlyExpenses || 0)}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Tasso di Risparmio</p>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={`mt-2 text-2xl font-bold ${(kpis?.savingRate || 0) >= 20 ? 'text-green-500' : (kpis?.savingRate || 0) >= 10 ? 'text-yellow-500' : 'text-red-500'}`}>
            {(kpis?.savingRate || 0).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Alerts */}
      {(alerts?.length > 0 || uncategorized?.count > 0) && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-orange-800 dark:text-orange-200">Attenzione</p>
              <ul className="mt-1 text-sm text-orange-700 dark:text-orange-300 space-y-1">
                {uncategorized?.count > 0 && (
                  <li>
                    Hai {uncategorized.count} transazioni non categorizzate.{' '}
                    <Link to="/personal-transactions?uncategorized=true" className="underline">
                      Categorizza ora
                    </Link>
                  </li>
                )}
                {alerts?.slice(0, 3).map((alert: any) => (
                  <li key={alert.id} className="flex items-center justify-between">
                    <span>{alert.message}</span>
                    <button
                      onClick={() => acknowledgeAlert.mutate(alert.id)}
                      className="text-xs underline ml-2"
                    >
                      Ignora
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Balance Trend */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Andamento Saldo</h2>
            <div className="flex gap-1">
              {(['7', '30', '90'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 text-xs rounded ${
                    selectedPeriod === period
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {period}g
                </button>
              ))}
            </div>
          </div>
          {balanceTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={balanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('it-IT')}
                />
                <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              Nessun dato disponibile
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Spese per Categoria</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              Nessun dato disponibile
            </div>
          )}
        </div>
      </div>

      {/* Income vs Expenses */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Entrate vs Uscite</h2>
        {incomeVsExpenses?.months?.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={incomeVsExpenses.months}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="income" name="Entrate" fill="#22C55E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Uscite" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nessun dato disponibile
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Accounts Summary */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">I tuoi Conti</h2>
            <Link to="/bank-accounts" className="text-sm text-primary hover:underline flex items-center">
              Vedi tutti <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {accounts?.slice(0, 5).map((account: any) => (
              <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: account.color || '#6366F1' }}
                  >
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">{account.type}</p>
                  </div>
                </div>
                <p className={`font-semibold ${account.currentBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(account.currentBalance)}
                </p>
              </div>
            ))}
            {!accounts?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nessun conto configurato.{' '}
                <Link to="/bank-accounts" className="text-primary hover:underline">
                  Aggiungi un conto
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">Suggerimenti AI</h2>
          </div>
          <div className="space-y-3">
            {insights?.insights?.slice(0, 4).map((insight: string, index: number) => (
              <div key={index} className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm">{insight}</p>
              </div>
            ))}
            {insights?.savingOpportunities?.slice(0, 2).map((opp: any, index: number) => (
              <div key={`opp-${index}`} className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Risparmia {formatCurrency(opp.potentialSaving)}/mese
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">{opp.suggestion}</p>
              </div>
            ))}
            {!insights?.insights?.length && !insights?.savingOpportunities?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aggiungi transazioni per ricevere suggerimenti personalizzati
              </p>
            )}
          </div>
          <Link
            to="/purchase-advisor"
            className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 rounded-lg border hover:bg-accent text-sm"
          >
            Valuta un acquisto
          </Link>
        </div>
      </div>
    </div>
  );
}
