import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Database, Search, Download, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CreateInstrumentDialog } from '@/components/CreateInstrumentDialog';
import { EditInstrumentDialog } from '@/components/EditInstrumentDialog';
import { DeleteInstrumentDialog } from '@/components/DeleteInstrumentDialog';

export function InstrumentsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [fetchingPriceFor, setFetchingPriceFor] = useState<string | null>(null);
  const [editingInstrument, setEditingInstrument] = useState<any>(null);
  const [deletingInstrument, setDeletingInstrument] = useState<any>(null);

  const { data: instruments, isLoading } = useQuery({
    queryKey: ['instruments'],
    queryFn: () => api.instruments.list(undefined, 200),
  });

  // Query per i prezzi di ogni strumento
  const { data: pricesMap } = useQuery({
    queryKey: ['instruments-prices'],
    queryFn: async () => {
      if (!instruments) return {};
      const pricesPromises = instruments.map((inst: any) =>
        api.prices.getLatestPrice(inst.id).catch(() => ({ price: null }))
      );
      const prices = await Promise.all(pricesPromises);
      const map: Record<string, number | null> = {};
      instruments.forEach((inst: any, idx: number) => {
        map[inst.id] = prices[idx].price;
      });
      return map;
    },
    enabled: !!instruments,
  });

  const fetchPricesMutation = useMutation({
    mutationFn: (instrumentId: string) => api.prices.queueForInstrument(instrumentId, 365),
    onSuccess: (_, instrumentId) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['instruments-prices'] });
        setFetchingPriceFor(null);
      }, 3000); // Attendi 3 secondi prima di aggiornare
    },
  });

  const handleFetchPrice = (instrumentId: string) => {
    setFetchingPriceFor(instrumentId);
    fetchPricesMutation.mutate(instrumentId);
  };

  const filteredInstruments = instruments?.filter((inst: any) =>
    inst.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.ticker?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.isin?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div>Caricamento...</div>;
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Strumenti</h1>
        <p className="text-muted-foreground">
          Universo degli strumenti finanziari disponibili
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cerca per nome, ticker o ISIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 whitespace-nowrap"
        >
          Nuovo Strumento
        </button>
      </div>

      <CreateInstrumentDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      <EditInstrumentDialog
        open={!!editingInstrument}
        onClose={() => setEditingInstrument(null)}
        instrument={editingInstrument}
      />

      <DeleteInstrumentDialog
        open={!!deletingInstrument}
        onClose={() => setDeletingInstrument(null)}
        instrument={deletingInstrument}
      />

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Ticker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  ISIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Valuta
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                  Ultimo Prezzo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                  Posizioni
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredInstruments?.map((instrument: any) => {
                const price = pricesMap?.[instrument.id];
                const isFetching = fetchingPriceFor === instrument.id;

                return (
                  <tr key={instrument.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-medium">
                        {instrument.ticker}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{instrument.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getTypeColor(
                          instrument.type
                        )}`}
                      >
                        {instrument.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-muted-foreground font-mono">
                        {instrument.isin || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm">{instrument.currency}</span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {price !== null && price !== undefined ? (
                        <span className="text-sm font-medium">
                          {instrument.currency} {price.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className="text-sm">
                        {instrument._count?.positions || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {instrument.type !== 'CASH' && instrument.type !== 'BOND' && (
                          <button
                            onClick={() => handleFetchPrice(instrument.id)}
                            disabled={isFetching}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded disabled:opacity-50"
                            title="Scarica prezzi da Yahoo Finance"
                          >
                            {isFetching ? (
                              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            <span>{isFetching ? 'Scarico...' : 'Prezzi'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => setEditingInstrument(instrument)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                          title="Modifica strumento"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Modifica</span>
                        </button>
                        <button
                          onClick={() => setDeletingInstrument(instrument)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          title="Elimina strumento"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Elimina</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!filteredInstruments?.length && (
          <div className="text-center py-12">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery
                ? 'Nessun strumento trovato'
                : 'Nessuno strumento disponibile'}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {['ETF', 'STOCK', 'BOND', 'CRYPTO', 'CASH'].map((type) => {
          const count = instruments?.filter((i: any) => i.type === type).length || 0;
          return (
            <div key={type} className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{type}</p>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
