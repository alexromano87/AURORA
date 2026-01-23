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
    date: new Date(s.date).toLocaleDateString('it-IT', {
      month: 'short',
      day: 'numeric',
    }),
    value: s.totalValue,
  })) || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{portfolio.name}</h1>
          <p className="text-muted-foreground">Dettaglio portfolio e posizioni</p>
        </div>
        <button
          onClick={() => setShowTransactionDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuova Transazione
        </button>
      </div>

      <CreateTransactionDialog
        open={showTransactionDialog}
        onClose={() => setShowTransactionDialog(false)}
        portfolioId={id!}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Valore Totale</p>
          <p className="mt-2 text-3xl font-bold">
            €{portfolio.totalValue?.toLocaleString('it-IT', {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Capitale Investito</p>
          <p className="mt-2 text-3xl font-bold">
            €{portfolio.totalInvested?.toLocaleString('it-IT', {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Rendimento</p>
            {portfolio.totalReturn >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <p
            className={`mt-2 text-3xl font-bold ${
              portfolio.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            €{portfolio.totalReturn?.toLocaleString('it-IT', {
              minimumFractionDigits: 2,
            })}
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
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Andamento Storico</h2>
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
      )}

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Posizioni</h2>
        <div className="space-y-3">
          {portfolio.positions?.map((position: any) => (
            <div
              key={position.id}
              className="flex items-center justify-between p-4 rounded-md bg-muted"
            >
              <div className="flex-1">
                <p className="font-medium">{position.instrument.name}</p>
                <p className="text-sm text-muted-foreground">
                  {position.instrument.ticker} • {position.quantity} unità
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  €{position.currentValue?.toLocaleString('it-IT', {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(position.weight * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
          {!portfolio.positions?.length && (
            <p className="text-sm text-muted-foreground">Nessuna posizione</p>
          )}
        </div>
      </div>
    </div>
  );
}
