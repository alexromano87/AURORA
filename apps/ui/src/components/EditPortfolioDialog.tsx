import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from './Dialog';
import { api } from '@/lib/api';

interface EditPortfolioDialogProps {
  open: boolean;
  onClose: () => void;
  portfolio: any;
}

export function EditPortfolioDialog({ open, onClose, portfolio }: EditPortfolioDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    type: 'paper' as 'paper' | 'real',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (portfolio && open) {
      setFormData({
        name: portfolio.name,
        type: portfolio.type || 'paper',
      });
    }
  }, [portfolio, open]);

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      api.portfolios.update(portfolio.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Errore durante la modifica del portfolio');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Il nome è obbligatorio');
      return;
    }

    updateMutation.mutate({
      name: formData.name,
      type: formData.type,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Modifica Portfolio">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Nome Portfolio *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Es. Portfolio Principale"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={updateMutation.isPending}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Tipo Portfolio *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'paper' })}
              className={`px-4 py-2 border rounded-md font-medium ${
                formData.type === 'paper'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'hover:bg-gray-50'
              }`}
              disabled={updateMutation.isPending}
            >
              Paper Trading
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'real' })}
              className={`px-4 py-2 border rounded-md font-medium ${
                formData.type === 'real'
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'hover:bg-gray-50'
              }`}
              disabled={updateMutation.isPending}
            >
              Reale
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
