import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { CreateTransactionDialog } from '@/components/CreateTransactionDialog';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function PortfolioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio', id],
    queryFn: () => api.portfolios.get(id!),
  });

  const { data: snapshots } = useQuery({
    queryKey: ['portfolio-snapshots', id],
    queryFn: () => api.portfolios.getSnapshots(id!, 90),
  });

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  if (!portfolio) {
    return <div>Portfolio non trovato</div>;
  }

  const chartData = snapshots?.map((s: any) => ({
    date: new Date(s.snapshotDate).toLocaleDateString('it-IT', {
      month: 'short',
      day: 'numeric',
    }),
    value: s.totalValueEur,
  })) || [];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="section-subtitle">Portfolio intelligence</p>
          <h1 className="section-title">{portfolio.name}</h1>
        </div>
        <button
          onClick={() => setShowTransactionDialog(true)}
          className="cta-button inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuova transazione
        </button>
      </div>

      <CreateTransactionDialog
        open={showTransactionDialog}
        onClose={() => setShowTransactionDialog(false)}
        portfolioId={id!}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="stat-card">
          <p className="stat-title">Valore totale</p>
          <p className="mt-3 text-3xl font-semibold">
            €{portfolio.totalValue?.toFixed(2)}
          </p>
        </div>

        <div className="stat-card">
          <p className="stat-title">Capitale investito</p>
          <p className="mt-3 text-3xl font-semibold">
            €{portfolio.totalInvested?.toFixed(2)}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="stat-title">Rendimento</p>
            {portfolio.totalReturn >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <p
            className={`mt-3 text-3xl font-semibold ${
              portfolio.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            €{portfolio.totalReturn?.toFixed(2)}
          </p>
          <p
            className={`text-sm ${
              portfolio.totalReturnPct >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {portfolio.totalReturnPct >= 0 ? '+' : ''}
            {portfolio.totalReturnPct?.toFixed(2)}%
          </p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Andamento storico</h2>
              <p className="text-sm text-foreground/60">Ultimi 90 giorni</p>
            </div>
            <span className="chip">Snapshot</span>
          </div>
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass-panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Posizioni</h2>
            <p className="text-sm text-foreground/60">Composizione attuale</p>
          </div>
          <span className="chip">{portfolio.positions?.length || 0} strumenti</span>
        </div>
        <div className="mt-6 space-y-3">
          {portfolio.positions?.map((position: any, index: number) => (
            <div
              key={position.instrumentId || index}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/70 p-4"
            >
              <div className="flex-1">
                <p className="font-medium">{position.instrumentName}</p>
                <p className="text-sm text-foreground/60">
                  {position.isin} • {position.quantity} unità
                </p>
                <p className="text-xs text-foreground/60 mt-1">
                  Prezzo medio: €{position.avgCost?.toFixed(2)} • Prezzo attuale: €{position.currentPrice?.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  €{position.currentValue?.toFixed(2)}
                </p>
                <p className="text-sm text-foreground/60">
                  {(position.weight * 100).toFixed(1)}%
                </p>
                <p className={`text-xs mt-1 ${
                  position.totalReturnPct >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {position.totalReturnPct >= 0 ? '+' : ''}
                  {position.totalReturnPct?.toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
          {!portfolio.positions?.length && (
            <p className="text-sm text-foreground/60">Nessuna posizione</p>
          )}
        </div>
      </div>
    </div>
  );
}
