import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from './Dialog';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface CreatePortfolioDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreatePortfolioDialog({ open, onClose }: CreatePortfolioDialogProps) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState<'paper' | 'real'>('paper');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: { userId: string; name: string; type: string }) =>
      api.portfolios.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setName('');
      setType('paper');
      setError('');
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Errore durante la creazione del portfolio');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Il nome è obbligatorio');
      return;
    }

    createMutation.mutate({ userId, name: name.trim(), type });
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      setName('');
      setType('paper');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Nuovo Portfolio">
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="es. Portfolio Principale"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={createMutation.isPending}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Tipo Portfolio *
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'paper' | 'real')}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={createMutation.isPending}
          >
            <option value="paper">Paper (Simulazione)</option>
            <option value="real">Real (Reale)</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            I portfolio "paper" sono simulazioni per testare strategie
          </p>
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
            {createMutation.isPending ? 'Creazione...' : 'Crea Portfolio'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
