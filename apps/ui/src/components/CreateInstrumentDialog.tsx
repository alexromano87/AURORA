import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from './Dialog';
import { api } from '@/lib/api';

interface CreateInstrumentDialogProps {
  open: boolean;
  onClose: () => void;
}

interface YahooSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  price?: number;
  currency?: string;
  isin?: string;
}

export function CreateInstrumentDialog({ open, onClose }: CreateInstrumentDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    ticker: '',
    name: '',
    isin: '',
    type: 'ETF' as 'ETF' | 'STOCK' | 'BOND' | 'CRYPTO' | 'CASH',
    currency: 'EUR',
  });
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YahooSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<YahooSearchResult | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.instruments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      resetForm();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Errore durante la creazione dello strumento');
    },
  });

  const resetForm = () => {
    setFormData({
      ticker: '',
      name: '',
      isin: '',
      type: 'ETF',
      currency: 'EUR',
    });
    setError('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Inserisci un ISIN o ticker da cercare');
      return;
    }

    setIsSearching(true);
    setError('');
    setSearchResults([]);
    setSelectedResult(null);

    try {
      const results = await api.prices.searchYahooSymbols(searchQuery.trim());

      if (results.length === 0) {
        setError('Nessun risultato trovato. Prova con un altro ISIN o ticker.');
      } else {
        setSearchResults(results);
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante la ricerca');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: YahooSearchResult) => {
    setSelectedResult(result);
    setFormData({
      ...formData,
      ticker: result.symbol,
      name: result.name,
      currency: result.currency || 'EUR', // Salva la valuta ma non la mostra all'utente
      isin: result.isin || '',
    });
    setSearchResults([]);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ticker.trim() || !formData.name.trim()) {
      setError('Ticker e nome sono obbligatori');
      return;
    }

    // ISIN validation only for non-crypto instruments
    if (formData.type !== 'CRYPTO' && formData.isin && !isValidISIN(formData.isin)) {
      setError('ISIN non valido (deve essere 12 caratteri alfanumerici)');
      return;
    }

    // Clear ISIN for crypto
    const dataToSubmit = {
      ...formData,
      isin: formData.type === 'CRYPTO' ? '' : formData.isin,
    };

    createMutation.mutate(dataToSubmit);
  };

  const isValidISIN = (isin: string): boolean => {
    return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin);
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  const handleTypeChange = (newType: string) => {
    setFormData({ ...formData, type: newType as any });
    // Reset search when switching to/from CRYPTO
    if (newType === 'CRYPTO' || formData.type === 'CRYPTO') {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedResult(null);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Nuovo Strumento" maxWidth="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Tipo *
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={createMutation.isPending}
          >
            <option value="ETF">ETF</option>
            <option value="STOCK">Azione</option>
            <option value="BOND">Obbligazione</option>
            <option value="CRYPTO">Crypto</option>
            <option value="CASH">Cash</option>
          </select>
        </div>

        {formData.type !== 'CRYPTO' && (
          <>
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">
                Cerca su Yahoo Finance
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                  placeholder="es. IE00BK5BQT80, VWCE o Vanguard"
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSearching}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? 'Ricerca...' : 'Cerca'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cerca per ISIN (12 caratteri), ticker o nome dello strumento
              </p>
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-md max-h-64 overflow-y-auto">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <p className="text-sm font-medium">Risultati trovati ({searchResults.length})</p>
                </div>
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectResult(result)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono text-sm">{result.symbol}</span>
                          {result.isin && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              ISIN
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 mt-1">{result.name}</div>
                        <div className="text-xs text-gray-500 mt-1 space-x-3">
                          <span>Exchange: {result.exchange}</span>
                          {result.isin && (
                            <span className="font-mono">{result.isin}</span>
                          )}
                        </div>
                      </div>
                      {result.price && (
                        <div className="text-right ml-4">
                          <div className="text-sm font-medium">
                            {result.price.toLocaleString('it-IT', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-xs text-gray-500">{result.currency}</div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedResult && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✓ Selezionato: <span className="font-mono font-medium">{selectedResult.symbol}</span> - {selectedResult.name}
                </p>
                {!selectedResult.isin && (
                  <p className="text-xs text-green-700 mt-1">
                    ℹ ISIN non disponibile da Yahoo Finance - inseriscilo manualmente se disponibile
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div className="border-t pt-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">
            {formData.type === 'CRYPTO'
              ? 'Inserisci i dati manualmente'
              : 'Verifica i dati (compilati automaticamente dalla ricerca o inserisci manualmente)'}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Ticker *
              </label>
              <input
                type="text"
                value={formData.ticker}
                onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                placeholder={formData.type === 'CRYPTO' ? 'es. BTC' : 'es. VWCE.DE'}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                disabled={createMutation.isPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.type === 'CRYPTO'
                  ? 'Solo il simbolo (BTC, ETH, SOL, etc.)'
                  : 'Ticker completo con suffisso exchange (VWCE.DE, EIMI.MI, etc.)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                ISIN
              </label>
              <input
                type="text"
                value={formData.isin}
                onChange={(e) => setFormData({ ...formData, isin: e.target.value.toUpperCase() })}
                placeholder={formData.type === 'CRYPTO' ? 'N/A per Crypto' : 'es. IE00BK5BQT80'}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={createMutation.isPending || formData.type === 'CRYPTO'}
                maxLength={12}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.type === 'CRYPTO'
                  ? 'ISIN non applicabile per criptovalute'
                  : '12 caratteri (2 lettere paese + 9 alfanumerici + 1 cifra)'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={formData.type === 'CRYPTO'
                ? 'es. Bitcoin'
                : 'es. Vanguard FTSE All-World UCITS ETF'}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={createMutation.isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">
              La valuta verrà rilevata automaticamente quando scarichi i prezzi
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creazione...' : 'Crea Strumento'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
