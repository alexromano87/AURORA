import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, AlertCircle, Briefcase } from 'lucide-react';
import {
  LineChart,
  Line,
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
import { useMemo } from 'react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

export function DashboardPage() {
  const userId = 'user_default';

  const { data: portfolios } = useQuery({
    queryKey: ['portfolios', userId],
    queryFn: () => api.portfolios.list(userId),
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts', userId, false],
    queryFn: () => api.alerts.list(userId, false),
  });

  const { data: ipsPolicy } = useQuery({
    queryKey: ['ips', userId],
    queryFn: () => api.ips.getPolicy(userId),
  });

  // Fetch snapshots for all portfolios
  const snapshotQueries = useQuery({
    queryKey: ['all-snapshots', portfolios?.map((p: any) => p.id)],
    queryFn: async () => {
      if (!portfolios?.length) return [];

      const allSnapshots = await Promise.all(
        portfolios.map((p: any) => api.portfolios.getSnapshots(p.id, 90))
      );

      return allSnapshots;
    },
    enabled: !!portfolios?.length,
  });

  // Fetch detailed portfolio data for asset distribution
  const detailedPortfolios = useQuery({
    queryKey: ['detailed-portfolios', portfolios?.map((p: any) => p.id)],
    queryFn: async () => {
      if (!portfolios?.length) return [];

      const details = await Promise.all(
        portfolios.map((p: any) => api.portfolios.get(p.id))
      );

      return details;
    },
    enabled: !!portfolios?.length,
  });

  const totalValue = portfolios?.reduce((sum: number, p: any) => sum + (p.totalValue || 0), 0) || 0;
  const totalReturn = portfolios?.reduce((sum: number, p: any) => sum + (p.totalReturn || 0), 0) || 0;
  const totalReturnPct = totalValue > 0 ? (totalReturn / (totalValue - totalReturn)) * 100 : 0;

  // Process historical data for line chart
  const historicalData = useMemo(() => {
    if (!snapshotQueries.data?.length) return [];

    // Aggregate snapshots by date
    const dateMap = new Map<string, number>();

    snapshotQueries.data.forEach((portfolioSnapshots: any[]) => {
      portfolioSnapshots.forEach((snapshot: any) => {
        const date = new Date(snapshot.snapshotDate).toLocaleDateString('it-IT', {
          month: 'short',
          day: 'numeric',
        });
        const currentValue = dateMap.get(date) || 0;
        dateMap.set(date, currentValue + snapshot.totalValueEur);
      });
    });

    // Convert to array and sort by date
    const data = Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });

    return data;
  }, [snapshotQueries.data]);

  // Process asset distribution for pie chart
  const assetDistribution = useMemo(() => {
    if (!detailedPortfolios.data?.length) return [];

    const assetMap = new Map<string, { name: string; value: number; isin: string }>();

    detailedPortfolios.data.forEach((portfolio: any) => {
      portfolio.positions?.forEach((position: any) => {
        const key = position.instrumentId;
        const current = assetMap.get(key);

        if (current) {
          current.value += position.currentValue;
        } else {
          assetMap.set(key, {
            name: position.instrumentName,
            value: position.currentValue,
            isin: position.isin,
          });
        }
      });
    });

    return Array.from(assetMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 assets
  }, [detailedPortfolios.data]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="section-subtitle">Panoramica strategica</p>
          <h1 className="section-title">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="chip">Aggressive profile</span>
          <span className="chip">ETF-only</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="stat-title">Patrimonio totale</p>
            <Briefcase className="h-4 w-4 text-foreground/40" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            €{totalValue.toFixed(2)}
          </p>
          <p className="mt-2 text-sm text-foreground/60">Portafogli consolidati</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="stat-title">Rendimento totale</p>
            {totalReturn >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )}
          </div>
          <p className={`mt-3 text-2xl font-semibold ${totalReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            €{totalReturn.toFixed(2)}
          </p>
          <p className={`text-sm ${totalReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totalReturnPct >= 0 ? '+' : ''}
            {totalReturnPct.toFixed(2)}%
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="stat-title">Portfolios attivi</p>
            <Briefcase className="h-4 w-4 text-foreground/40" />
          </div>
          <p className="mt-3 text-2xl font-semibold">{portfolios?.length || 0}</p>
          <p className="mt-2 text-sm text-foreground/60">Strategie separate</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="stat-title">Alerts in coda</p>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </div>
          <p className="mt-3 text-2xl font-semibold">{alerts?.length || 0}</p>
          <p className="mt-2 text-sm text-foreground/60">Solo segnali rilevanti</p>
        </div>
      </div>

      {historicalData.length > 0 && (
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Andamento patrimonio</h2>
              <p className="text-sm text-foreground/60">Ultimi 90 giorni consolidati</p>
            </div>
            <span className="chip">Auto refresh</span>
          </div>
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `€${value.toFixed(2)}`}
                  labelStyle={{ color: '#000' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {assetDistribution.length > 0 && (
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Distribuzione asset</h2>
                <p className="text-sm text-foreground/60">Top strumenti per valore</p>
              </div>
              <span className="chip">Top 8</span>
            </div>
            <div className="mt-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={assetDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {assetDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `€${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Portfolios recenti</h2>
              <p className="text-sm text-foreground/60">Ultimi 5 aggiornati</p>
            </div>
            <span className="chip">Realtime</span>
          </div>
          <div className="mt-6 space-y-3">
            {portfolios?.slice(0, 5).map((portfolio: any) => (
              <div key={portfolio.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{portfolio.name}</p>
                  <p className="text-xs text-foreground/60">{portfolio.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    €{(portfolio.totalValue || 0).toFixed(2)}
                  </p>
                  <p className={`text-xs ${(portfolio.totalReturnPct || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {(portfolio.totalReturnPct || 0) >= 0 ? '+' : ''}
                    {(portfolio.totalReturnPct || 0).toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
            {!portfolios?.length && (
              <p className="text-sm text-foreground/60">Nessun portfolio disponibile</p>
            )}
          </div>
        </div>

        {ipsPolicy?.versions?.find((v: any) => v.isActive) && (
          <div className="glass-panel p-6 md:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">IPS attivo</h2>
                <p className="text-sm text-foreground/60">Vincoli strategici correnti</p>
              </div>
              <span className="chip">
                v{ipsPolicy.versions.find((v: any) => v.isActive)?.version || '1'}
              </span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div>
                <p className="stat-title">Orizzonte temporale</p>
                <p className="text-lg font-medium capitalize">
                  {ipsPolicy.versions.find((v: any) => v.isActive)?.config?.timeHorizon || 'N/A'}
                </p>
              </div>
              <div>
                <p className="stat-title">Profilo rischio</p>
                <p className="text-lg font-medium capitalize">
                  {ipsPolicy.versions.find((v: any) => v.isActive)?.config?.riskProfile || 'N/A'}
                </p>
              </div>
              <div>
                <p className="stat-title">Allocazione target</p>
                <p className="text-lg font-medium">
                  {ipsPolicy.versions.find((v: any) => v.isActive)?.config?.assetAllocation ? 'Multi-asset' : 'Core ETF'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Alerts recenti</h2>
            <p className="text-sm text-foreground/60">Solo gli ultimi 5 segnali</p>
          </div>
          <span className="chip">Focus</span>
        </div>
        <div className="mt-6 space-y-3">
          {alerts?.slice(0, 5).map((alert: any) => (
            <div key={alert.id} className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4">
              <AlertCircle className={`h-4 w-4 mt-0.5 ${
                alert.severity === 'CRITICAL' ? 'text-rose-500' :
                alert.severity === 'HIGH' ? 'text-orange-500' :
                alert.severity === 'MEDIUM' ? 'text-yellow-500' : 'text-blue-500'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs text-foreground/60">{alert.message}</p>
              </div>
            </div>
          ))}
          {!alerts?.length && (
            <p className="text-sm text-foreground/60">Nessun alert attivo</p>
          )}
        </div>
      </div>
    </div>
  );
}
