import { useMutation, useQueryClient } from '@tantml:react-query';
import { Dialog } from './Dialog';
import { AlertTriangle } from 'lucide-react';

interface DeleteInstrumentDialogProps {
  open: boolean;
  onClose: () => void;
  instrument: any;
}

export function DeleteInstrumentDialog({ open, onClose, instrument }: DeleteInstrumentDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/instruments/${instrument.id}`, {
        method: 'DELETE',
      }).then(res => {
        if (!res.ok) throw new Error('Failed to delete instrument');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      queryClient.invalidateQueries({ queryKey: ['instruments-prices'] });
      onClose();
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Elimina Strumento" maxWidth="md">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">
              Attenzione: questa azione è irreversibile
            </p>
            <p className="text-sm text-red-700 mt-1">
              Tutti i dati associati a questo strumento (prezzi storici, posizioni, transazioni) verranno eliminati.
            </p>
          </div>
        </div>

        {instrument && (
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-muted-foreground">Stai per eliminare:</p>
            <p className="font-medium mt-1">{instrument.ticker} - {instrument.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tipo: {instrument.type} • ISIN: {instrument.isin || 'N/A'}
            </p>
          </div>
        )}

        {deleteMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              Errore durante l'eliminazione. Verifica che non ci siano posizioni attive su questo strumento.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina Definitivamente'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
