import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from './Dialog';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Zap, Target, TrendingUp } from 'lucide-react';

interface RunEngineDialogProps {
  open: boolean;
  onClose: () => void;
}

export function RunEngineDialog({ open, onClose }: RunEngineDialogProps) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<'scoring' | 'pac' | 'full'>('scoring');
  const [error, setError] = useState('');

  const runMutation = useMutation({
    mutationFn: (data: { userId: string; type: 'scoring' | 'pac' | 'full' }) =>
      api.engine.enqueueRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engine-runs'] });
      setError('');
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Errore durante l\'avvio dell\'engine');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runMutation.mutate({ userId, type: selectedType });
  };

  const handleClose = () => {
    if (!runMutation.isPending) {
      setSelectedType('scoring');
      setError('');
      onClose();
    }
  };

  const runTypes = [
    {
      type: 'scoring' as const,
      icon: Target,
      title: 'ETF Scoring',
      description: 'Analizza e valuta gli ETF disponibili secondo i criteri IPS',
      color: 'blue',
    },
    {
      type: 'pac' as const,
      icon: TrendingUp,
      title: 'PAC Proposal',
      description: 'Genera proposta di Piano di Accumulo Capitale mensile',
      color: 'green',
    },
    {
      type: 'full' as const,
      icon: Zap,
      title: 'Analisi Completa',
      description: 'Esegue scoring ETF e genera proposta PAC',
      color: 'purple',
    },
  ];

  return (
    <Dialog open={open} onClose={handleClose} title="Avvia Engine" maxWidth="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-3">
            Seleziona tipo di analisi *
          </label>
          <div className="space-y-3">
            {runTypes.map((runType) => {
              const Icon = runType.icon;
              const isSelected = selectedType === runType.type;

              return (
                <button
                  key={runType.type}
                  type="button"
                  onClick={() => setSelectedType(runType.type)}
                  disabled={runMutation.isPending}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? `border-${runType.color}-500 bg-${runType.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected
                        ? `bg-${runType.color}-100`
                        : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        isSelected
                          ? `text-${runType.color}-600`
                          : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{runType.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {runType.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className={`w-5 h-5 rounded-full bg-${runType.color}-500 flex items-center justify-center`}>
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-800">
            <strong>Nota:</strong> L'analisi verrà eseguita in background e potrebbe richiedere alcuni minuti.
            Puoi monitorare lo stato nella pagina Engine.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={runMutation.isPending}
            className="px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={runMutation.isPending}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {runMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Avvio in corso...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Avvia Analisi
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
