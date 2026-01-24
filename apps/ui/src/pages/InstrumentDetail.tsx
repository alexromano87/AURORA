import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { ArrowLeft, TrendingUp, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export function InstrumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: instrument, isLoading: instrumentLoading } = useQuery({
    queryKey: ['instrument', id],
    queryFn: () => api.instruments.get(id!),
    enabled: !!id,
  });

  const { data: latestPrice } = useQuery({
    queryKey: ['instrument-price', id],
    queryFn: () => api.prices.getLatestPrice(id!),
    enabled: !!id,
  });

  const { data: priceHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['instrument-history', id],
    queryFn: async () => {
      // Qui dovremmo avere un endpoint per recuperare lo storico prezzi
      // Per ora usiamo un placeholder
      return [];
    },
    enabled: !!id,
  });

  if (instrumentLoading) {
    return <div className="p-8">Caricamento...</div>;
  }

  if (!instrument) {
    return <div className="p-8">Strumento non trovato</div>;
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ETF':
        return 'bg-blue-100 text-blue-800';
      case 'STOCK':
        return 'bg-green-100 text-green-800';
      case 'BOND':
        return 'bg-purple-100 text-purple-800';
      case 'CRYPTO':
        return 'bg-orange-100 text-orange-800';
      case 'CASH':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Dati di esempio per il grafico (da sostituire con dati reali)
  const chartData = priceHistory?.length > 0 ? priceHistory : [
    { date: '2024-01-01', price: 100 },
    { date: '2024-02-01', price: 105 },
    { date: '2024-03-01', price: 103 },
    { date: '2024-04-01', price: 108 },
    { date: '2024-05-01', price: 112 },
    { date: '2024-06-01', price: 115 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/instruments')}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{instrument.ticker}</h1>
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getTypeColor(
                instrument.type
              )}`}
            >
              {instrument.type}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">{instrument.name}</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span>Ultimo Prezzo</span>
          </div>
          {latestPrice ? (
            <div>
              <p className="text-2xl font-bold">
                {latestPrice.priceOriginal !== null
                  ? `${formatPrice(latestPrice.priceOriginal)} ${latestPrice.currency}`
                  : `${formatPrice(latestPrice.priceEur)} ${instrument.currency}`}
              </p>
              {latestPrice.priceOriginal !== null && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formatPrice(latestPrice.priceEur)} EUR
                </p>
              )}
            </div>
          ) : (
            <p className="text-2xl font-bold text-muted-foreground">-</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-1">ISIN</p>
          <p className="text-lg font-mono font-medium">
            {instrument.isin || '-'}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-1">Valuta</p>
          <p className="text-lg font-medium">{instrument.currency}</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-1">Posizioni</p>
          <p className="text-lg font-medium">
            {instrument._count?.positions || 0}
          </p>
        </div>
      </div>

      {/* Grafico */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Andamento Prezzi</h2>
        </div>

        {historyLoading ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Caricamento grafico...</p>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatPrice(value)}
              />
              <Tooltip
                formatter={(value: number) => [formatPrice(value), 'Prezzo']}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('it-IT');
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Prezzo (EUR)"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">
              Nessun dato storico disponibile. Scarica i prezzi per visualizzare il grafico.
            </p>
          </div>
        )}
      </div>

      {/* Dettagli aggiuntivi */}
      {instrument.type === 'ETF' && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Dettagli ETF</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Categoria</p>
              <p className="font-medium">{instrument.category || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Domicilio</p>
              <p className="font-medium">{instrument.domicile || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Provider</p>
              <p className="font-medium">{instrument.provider || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">UCITS</p>
              <p className="font-medium">{instrument.isUcits ? 'Sì' : 'No'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
