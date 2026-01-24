import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Database, Search, Download, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CreateInstrumentDialog } from '@/components/CreateInstrumentDialog';
import { EditInstrumentDialog } from '@/components/EditInstrumentDialog';
import { DeleteInstrumentDialog } from '@/components/DeleteInstrumentDialog';
import { FetchPricesDialog } from '@/components/FetchPricesDialog';

export function InstrumentsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<any>(null);
  const [deletingInstrument, setDeletingInstrument] = useState<any>(null);
  const [fetchingPricesFor, setFetchingPricesFor] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const itemsPerPage = 10;

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
        api.prices.getLatestPrice(inst.id).catch(() => null)
      );
      const prices = await Promise.all(pricesPromises);
      const map: Record<string, { priceEur: number; priceOriginal: number | null; currency: string } | null> = {};
      instruments.forEach((inst: any, idx: number) => {
        map[inst.id] = prices[idx];
      });
      return map;
    },
    enabled: !!instruments,
  });

  const filteredInstruments = instruments?.filter((inst: any) => {
    const matchesSearch = inst.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.ticker?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.isin?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter ? inst.type === typeFilter : true;

    return matchesSearch && matchesType;
  });

  // Calcola paginazione
  const totalPages = Math.ceil((filteredInstruments?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInstruments = filteredInstruments?.slice(startIndex, endIndex);

  // Reset alla pagina 1 quando cambia il filtro
  const handleTypeFilterChange = (type: string | null) => {
    setTypeFilter(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

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
            onChange={(e) => handleSearchChange(e.target.value)}
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

      <FetchPricesDialog
        open={!!fetchingPricesFor}
        onClose={() => setFetchingPricesFor(null)}
        instrument={fetchingPricesFor}
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
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                  Ultimo Prezzo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                  Prezzo Euro
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
              {paginatedInstruments?.map((instrument: any) => {
                const price = pricesMap?.[instrument.id];

                return (
                  <tr
                    key={instrument.id}
                    onClick={() => navigate(`/instruments/${instrument.id}`)}
                    className="hover:bg-muted/50 cursor-pointer"
                  >
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
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {price !== null && price !== undefined ? (
                        <span className="text-sm font-medium">
                          {price.priceOriginal !== null
                            ? `${formatPrice(price.priceOriginal)} ${price.currency}`
                            : `${formatPrice(price.priceEur)} ${instrument.currency}`}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {price !== null && price !== undefined ? (
                        <span className="text-sm font-medium">
                          {formatPrice(price.priceEur)}
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
                        {instrument.type !== 'CASH' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFetchingPricesFor(instrument);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Scarica prezzi"
                          >
                            <Download className="h-3 w-3" />
                            <span>Prezzi</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingInstrument(instrument);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                          title="Modifica strumento"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Modifica</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingInstrument(instrument);
                          }}
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

        {!paginatedInstruments?.length && (
          <div className="text-center py-12">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || typeFilter
                ? 'Nessun strumento trovato'
                : 'Nessuno strumento disponibile'}
            </p>
          </div>
        )}
      </div>

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Precedente
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 border rounded-md ${
                currentPage === page
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Successivo
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        <button
          onClick={() => handleTypeFilterChange(null)}
          className={`rounded-lg border bg-card p-4 text-left hover:bg-muted/50 transition-colors ${
            typeFilter === null ? 'ring-2 ring-primary' : ''
          }`}
        >
          <p className="text-sm text-muted-foreground">TUTTI</p>
          <p className="text-2xl font-bold mt-1">{instruments?.length || 0}</p>
        </button>
        {['ETF', 'STOCK', 'BOND', 'CRYPTO'].map((type) => {
          const count = instruments?.filter((i: any) => i.type === type).length || 0;
          return (
            <button
              key={type}
              onClick={() => handleTypeFilterChange(type)}
              className={`rounded-lg border bg-card p-4 text-left hover:bg-muted/50 transition-colors ${
                typeFilter === type ? 'ring-2 ring-primary' : ''
              }`}
            >
              <p className="text-sm text-muted-foreground">{type}</p>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
