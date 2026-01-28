import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Database, Search, Download, Edit, Trash2, RefreshCw } from 'lucide-react';
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
  const [isFetchingAllPrices, setIsFetchingAllPrices] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });
  const [fetchErrors, setFetchErrors] = useState<string[]>([]);
  const itemsPerPage = 10;
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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

  const sortedInstruments = filteredInstruments
    ? [...filteredInstruments].sort((a: any, b: any) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        const aVal = a?.[sortKey];
        const bVal = b?.[sortKey];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1 * dir;
        if (bVal == null) return -1 * dir;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * dir;
        }

        return String(aVal).localeCompare(String(bVal), 'it', { numeric: true }) * dir;
      })
    : [];

  // Calcola paginazione
  const totalPages = Math.ceil((sortedInstruments?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInstruments = sortedInstruments?.slice(startIndex, endIndex);

  // Reset alla pagina 1 quando cambia il filtro
  const handleTypeFilterChange = (type: string | null) => {
    setTypeFilter(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIndicator = (key: string) =>
    sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : '';

  const handleFetchAllPrices = async () => {
    try {
      console.log('[FetchAllPrices] Starting...');

      if (!instruments || instruments.length === 0) {
        console.log('[FetchAllPrices] No instruments found');
        return;
      }

      // Filtra solo gli strumenti che non sono CASH
      const instrumentsToFetch = instruments.filter((inst: any) => inst.type !== 'CASH');
      console.log('[FetchAllPrices] Instruments to fetch:', instrumentsToFetch.length);

      if (instrumentsToFetch.length === 0) {
        alert('Nessun strumento disponibile per il recupero dei prezzi');
        return;
      }

      const confirmed = confirm(
        `Vuoi recuperare i prezzi per tutti i ${instrumentsToFetch.length} strumenti?\n\nQuesta operazione potrebbe richiedere alcuni minuti.`
      );

      if (!confirmed) {
        console.log('[FetchAllPrices] User cancelled');
        return;
      }

      console.log('[FetchAllPrices] User confirmed, starting fetch...');
      setIsFetchingAllPrices(true);
      setFetchProgress({ current: 0, total: instrumentsToFetch.length });
      setFetchErrors([]);

      const errors: string[] = [];

      for (let i = 0; i < instrumentsToFetch.length; i++) {
        const instrument = instrumentsToFetch[i];
        console.log(`[FetchAllPrices] Processing ${i + 1}/${instrumentsToFetch.length}: ${instrument.ticker}`);
        setFetchProgress({ current: i + 1, total: instrumentsToFetch.length });

        try {
          // Prova prima con Yahoo Finance
          console.log(`[FetchAllPrices] Trying Yahoo for ${instrument.ticker}...`);
          await api.prices.fetchFromYahoo(instrument.id);
          console.log(`[FetchAllPrices] Yahoo success for ${instrument.ticker}`);
        } catch (error: any) {
          console.log(`[FetchAllPrices] Yahoo failed for ${instrument.ticker}, trying Finnhub...`);
          // Se Yahoo fallisce, prova con Finnhub
          try {
            await api.prices.fetchFromFinnhub(instrument.id);
            console.log(`[FetchAllPrices] Finnhub success for ${instrument.ticker}`);
          } catch (finnhubError: any) {
            console.error(`[FetchAllPrices] Both failed for ${instrument.ticker}:`, finnhubError);
            errors.push(`${instrument.ticker} (${instrument.name}): Errore nel recupero prezzi`);
          }
        }

        // Piccola pausa tra una richiesta e l'altra per non sovraccaricare le API
        if (i < instrumentsToFetch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('[FetchAllPrices] Finished. Errors:', errors.length);
      setFetchErrors(errors);
      setIsFetchingAllPrices(false);

      // Invalida la cache dei prezzi per ricaricare i dati aggiornati
      queryClient.invalidateQueries({ queryKey: ['instruments-prices'] });

      if (errors.length === 0) {
        alert(`Prezzi recuperati con successo per tutti i ${instrumentsToFetch.length} strumenti!`);
      } else {
        alert(
          `Completato con ${errors.length} errori su ${instrumentsToFetch.length} strumenti.\n\nVerifica i dettagli sopra la tabella.`
        );
      }
    } catch (error: any) {
      console.error('[FetchAllPrices] Unexpected error:', error);
      setIsFetchingAllPrices(false);
      alert(`Errore imprevisto: ${error.message || 'Errore sconosciuto'}`);
    }
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
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="section-subtitle">Universe control</p>
          <h1 className="section-title">Strumenti</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="chip">ETF focus</span>
          <span className="chip">200 max</span>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <input
              type="text"
              placeholder="Cerca per nome, ticker o ISIN..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-full border border-white/70 bg-white/80 px-11 py-2.5 text-sm text-foreground/80 placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={handleFetchAllPrices}
            disabled={isFetchingAllPrices}
            className="cta-button inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isFetchingAllPrices ? 'animate-spin' : ''}`} />
            {isFetchingAllPrices ? 'Recupero...' : 'Aggiorna prezzi'}
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-5 py-2.5 text-sm font-semibold text-foreground shadow-[0_12px_30px_rgba(31,43,77,0.15)] hover:shadow-[0_16px_40px_rgba(31,43,77,0.2)]"
          >
            <Database className="h-4 w-4" />
            Nuovo strumento
          </button>
        </div>
      </div>

      {/* Progress indicator */}
      {isFetchingAllPrices && (
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Recupero prezzi in corso...
            </span>
            <span className="text-sm text-foreground/60">
              {fetchProgress.current} / {fetchProgress.total}
            </span>
          </div>
          <div className="w-full bg-white/70 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(fetchProgress.current / fetchProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Error messages */}
      {fetchErrors.length > 0 && !isFetchingAllPrices && (
        <div className="glass-panel p-4 border border-rose-200 bg-rose-50/80">
          <h3 className="text-sm font-semibold text-rose-700 mb-2">
            Errori durante il recupero prezzi ({fetchErrors.length}):
          </h3>
          <div className="max-h-40 overflow-y-auto">
            <ul className="text-sm text-rose-700 space-y-1">
              {fetchErrors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => setFetchErrors([])}
            className="mt-2 text-xs text-rose-600 hover:text-rose-800 underline"
          >
            Chiudi
          </button>
        </div>
      )}

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

      <div className="glass-panel p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/60">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/50 uppercase">
                  Ticker
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/50 uppercase">
                  <button
                    onClick={() => handleSort('ticker')}
                    className="inline-flex items-center gap-2 hover:text-foreground"
                  >
                    Ticker <span className="text-[10px]">{sortIndicator('ticker')}</span>
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/50 uppercase">
                  <button
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-2 hover:text-foreground"
                  >
                    Nome <span className="text-[10px]">{sortIndicator('name')}</span>
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/50 uppercase">
                  <button
                    onClick={() => handleSort('type')}
                    className="inline-flex items-center gap-2 hover:text-foreground"
                  >
                    Tipo <span className="text-[10px]">{sortIndicator('type')}</span>
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/50 uppercase">
                  <button
                    onClick={() => handleSort('isin')}
                    className="inline-flex items-center gap-2 hover:text-foreground"
                  >
                    ISIN <span className="text-[10px]">{sortIndicator('isin')}</span>
                  </button>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-foreground/50 uppercase">
                  Ultimo Prezzo
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-foreground/50 uppercase">
                  Prezzo Euro
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-foreground/50 uppercase">
                  Posizioni
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-foreground/50 uppercase">
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
                    className="hover:bg-white/70 cursor-pointer transition-colors"
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
                      <span className="text-sm text-foreground/50 font-mono">
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
                        <span className="text-sm text-foreground/50">-</span>
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
                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
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
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-foreground/70 hover:bg-white/70"
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
                          className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
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
            <Database className="h-12 w-12 mx-auto text-foreground/30 mb-4" />
            <p className="text-foreground/60">
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
            className="rounded-full border border-white/70 bg-white/70 px-4 py-1.5 text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Precedente
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`rounded-full border border-white/70 px-4 py-1.5 text-sm ${
                currentPage === page
                  ? 'bg-foreground text-white'
                  : 'bg-white/70 hover:bg-white'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="rounded-full border border-white/70 bg-white/70 px-4 py-1.5 text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Successivo
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        <button
          onClick={() => handleTypeFilterChange(null)}
          className={`rounded-2xl border border-white/70 bg-white/70 p-4 text-left shadow-[0_12px_30px_rgba(31,43,77,0.12)] transition-all hover:bg-white ${
            typeFilter === null ? 'ring-2 ring-primary' : ''
          }`}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Tutti</p>
          <p className="text-2xl font-bold mt-1">{instruments?.length || 0}</p>
        </button>
        {['ETF', 'STOCK', 'BOND', 'CRYPTO'].map((type) => {
          const count = instruments?.filter((i: any) => i.type === type).length || 0;
          return (
            <button
              key={type}
              onClick={() => handleTypeFilterChange(type)}
              className={`rounded-2xl border border-white/70 bg-white/70 p-4 text-left shadow-[0_12px_30px_rgba(31,43,77,0.12)] transition-all hover:bg-white ${
                typeFilter === type ? 'ring-2 ring-primary' : ''
              }`}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{type}</p>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
