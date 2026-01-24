import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from './Dialog';
import { TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';

interface FetchPricesDialogProps {
  open: boolean;
  onClose: () => void;
  instrument: any;
}

export function FetchPricesDialog({ open, onClose, instrument }: FetchPricesDialogProps) {
  const queryClient = useQueryClient();

  const fetchMutation = useMutation({
    mutationFn: async () => {
      // Use Yahoo Finance for ETF and STOCK (better European market coverage)
      // Use Finnhub for CRYPTO
      if (instrument.type === 'CRYPTO') {
        return api.prices.fetchFromFinnhub(instrument.id);
      } else {
        return api.prices.fetchFromYahoo(instrument.id);
      }
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['instruments-prices'] });
      }, 2000);
      onClose();
    },
  });

  const handleFetch = () => {
    fetchMutation.mutate();
  };

  if (!instrument) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Aggiorna Prezzo</h2>
            <p className="text-sm text-muted-foreground">
              {instrument.ticker} - {instrument.name}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-sm text-blue-900">Prezzo in Tempo Reale</div>
                <div className="text-xs text-blue-700 mt-1">
                  {instrument.type === 'CRYPTO'
                    ? 'Fornito da Finnhub (60 richieste/minuto)'
                    : 'Fornito da Yahoo Finance (mercati europei e USA)'}
                </div>
                <div className="text-xs text-blue-600 mt-3 space-y-1">
                  <div>• Scarica il prezzo corrente dello strumento</div>
                  <div>• Il record verrà salvato per la data odierna</div>
                  <div>• Lo storico si costruirà progressivamente giorno per giorno</div>
                </div>
              </div>
            </div>
          </div>

          {fetchMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                Errore durante il download: {fetchMutation.error?.message || 'Errore sconosciuto'}
              </p>
            </div>
          )}

          {fetchMutation.isSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                Prezzo aggiornato con successo!
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={fetchMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleFetch}
            disabled={fetchMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {fetchMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Download in corso...</span>
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                <span>Aggiorna Prezzo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
