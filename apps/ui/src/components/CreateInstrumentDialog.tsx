import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from './Dialog';
import { api } from '@/lib/api';

interface CreateInstrumentDialogProps {
  open: boolean;
  onClose: () => void;
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ticker.trim() || !formData.name.trim()) {
      setError('Ticker e nome sono obbligatori');
      return;
    }

    if (formData.isin && !isValidISIN(formData.isin)) {
      setError('ISIN non valido (deve essere 12 caratteri alfanumerici)');
      return;
    }

    createMutation.mutate(formData);
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

  return (
    <Dialog open={open} onClose={handleClose} title="Nuovo Strumento" maxWidth="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Ticker *
            </label>
            <input
              type="text"
              value={formData.ticker}
              onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
              placeholder="es. VWCE"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              disabled={createMutation.isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              ISIN
            </label>
            <input
              type="text"
              value={formData.isin}
              onChange={(e) => setFormData({ ...formData, isin: e.target.value.toUpperCase() })}
              placeholder="es. IE00BK5BQT80"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              disabled={createMutation.isPending}
              maxLength={12}
            />
            <p className="text-xs text-muted-foreground mt-1">
              12 caratteri (2 lettere paese + 9 alfanumerici + 1 cifra)
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
            placeholder="es. Vanguard FTSE All-World UCITS ETF"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={createMutation.isPending}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tipo *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
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

          <div>
            <label className="block text-sm font-medium mb-1">
              Valuta *
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={createMutation.isPending}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="CHF">CHF</option>
            </select>
          </div>
        </div>

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
            {createMutation.isPending ? 'Creazione...' : 'Crea Strumento'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
