import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from './Dialog';
import { api } from '@/lib/api';
import { Search } from 'lucide-react';

interface CreateTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  portfolioId: string;
}

export function CreateTransactionDialog({ open, onClose, portfolioId }: CreateTransactionDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    instrumentId: '',
    side: 'BUY' as 'BUY' | 'SELL',
    quantity: '',
    priceEur: '',
    feeEur: '0',
    executedAt: new Date().toISOString().slice(0, 16),
    note: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showInstrumentSearch, setShowInstrumentSearch] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<any>(null);
  const [error, setError] = useState('');

  const { data: instruments } = useQuery({
    queryKey: ['instruments'],
    queryFn: () => api.instruments.list(undefined, 200),
  });

  const filteredInstruments = instruments?.filter((inst: any) =>
    inst.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.ticker?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.isin?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (data: any) => api.transactions.create(portfolioId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] });
      resetForm();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Errore durante la creazione della transazione');
    },
  });

  const resetForm = () => {
    setFormData({
      instrumentId: '',
      side: 'BUY',
      quantity: '',
      priceEur: '',
      feeEur: '0',
      executedAt: new Date().toISOString().slice(0, 16),
      note: '',
    });
    setSearchQuery('');
    setSelectedInstrument(null);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.instrumentId) {
      setError('Seleziona uno strumento');
      return;
    }

    const quantity = parseFloat(formData.quantity);
    const priceEur = parseFloat(formData.priceEur);
    const feeEur = parseFloat(formData.feeEur);

    if (isNaN(quantity) || quantity <= 0) {
      setError('La quantità deve essere un numero positivo');
      return;
    }

    if (isNaN(priceEur) || priceEur <= 0) {
      setError('Il prezzo deve essere un numero positivo');
      return;
    }

    if (isNaN(feeEur) || feeEur < 0) {
      setError('Le commissioni non possono essere negative');
      return;
    }

    const totalEur = formData.side === 'BUY'
      ? quantity * priceEur + feeEur
      : quantity * priceEur - feeEur;

    createMutation.mutate({
      instrumentId: formData.instrumentId,
      side: formData.side,
      quantity,
      priceEur,
      feeEur,
      totalEur,
      executedAt: new Date(formData.executedAt),
      note: formData.note || undefined,
    });
  };

  const selectInstrument = (instrument: any) => {
    setFormData({ ...formData, instrumentId: instrument.id });
    setSelectedInstrument(instrument);
    setShowInstrumentSearch(false);
    setSearchQuery('');
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  const totalAmount = formData.quantity && formData.priceEur
    ? parseFloat(formData.quantity) * parseFloat(formData.priceEur) +
      (formData.side === 'BUY' ? parseFloat(formData.feeEur || '0') : -parseFloat(formData.feeEur || '0'))
    : 0;

  return (
    <Dialog open={open} onClose={handleClose} title="Nuova Transazione" maxWidth="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Instrument Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Strumento *
          </label>
          {selectedInstrument ? (
            <div className="p-3 border rounded-md bg-gray-50 flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedInstrument.ticker}</p>
                <p className="text-sm text-muted-foreground">{selectedInstrument.name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedInstrument(null);
                  setFormData({ ...formData, instrumentId: '' });
                }}
                className="text-sm text-primary hover:underline"
              >
                Cambia
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowInstrumentSearch(true)}
                  placeholder="Cerca strumento per nome, ticker o ISIN..."
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={createMutation.isPending}
                />
              </div>
              {showInstrumentSearch && searchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredInstruments?.length ? (
                    filteredInstruments.map((inst: any) => (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => selectInstrument(inst)}
                        className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <p className="font-medium text-sm">{inst.ticker}</p>
                        <p className="text-xs text-muted-foreground">{inst.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{inst.isin}</p>
                      </button>
                    ))
                  ) : (
                    <p className="p-3 text-sm text-muted-foreground">Nessuno strumento trovato</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Tipo Operazione *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, side: 'BUY' })}
              className={`px-4 py-2 border rounded-md font-medium ${
                formData.side === 'BUY'
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'hover:bg-gray-50'
              }`}
              disabled={createMutation.isPending}
            >
              Acquisto
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, side: 'SELL' })}
              className={`px-4 py-2 border rounded-md font-medium ${
                formData.side === 'SELL'
                  ? 'bg-red-50 border-red-500 text-red-700'
                  : 'hover:bg-gray-50'
              }`}
              disabled={createMutation.isPending}
            >
              Vendita
            </button>
          </div>
        </div>

        {/* Quantity and Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Quantità *
            </label>
            <input
              type="number"
              step="0.000001"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={createMutation.isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Prezzo (EUR) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.priceEur}
              onChange={(e) => setFormData({ ...formData, priceEur: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={createMutation.isPending}
            />
          </div>
        </div>

        {/* Fee and Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Commissioni (EUR)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.feeEur}
              onChange={(e) => setFormData({ ...formData, feeEur: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={createMutation.isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Data e Ora *
            </label>
            <input
              type="datetime-local"
              value={formData.executedAt}
              onChange={(e) => setFormData({ ...formData, executedAt: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={createMutation.isPending}
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Note
          </label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Note opzionali..."
            rows={2}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={createMutation.isPending}
          />
        </div>

        {/* Total */}
        {totalAmount > 0 && (
          <div className="p-3 bg-gray-50 border rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Totale:</span>
              <span className="text-lg font-bold">
                €{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
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
            {createMutation.isPending ? 'Creazione...' : 'Crea Transazione'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
