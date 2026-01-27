import { useQuery } from '@tanstack/react-query';
import { Dialog } from './Dialog';
import { api } from '@/lib/api';
import { CheckCircle, XCircle, Clock, Loader2, TrendingUp, Target, AlertCircle } from 'lucide-react';

interface EngineRunDetailDialogProps {
  open: boolean;
  onClose: () => void;
  run: any;
}

export function EngineRunDetailDialog({ open, onClose, run }: EngineRunDetailDialogProps) {
  const { data: runDetails, isLoading } = useQuery({
    queryKey: ['engine-run', run?.id],
    queryFn: () => api.engine.getRunStatus(run.id),
    enabled: !!run?.id && open,
    refetchInterval: (query) => {
      // Auto-refresh se il run è ancora in esecuzione
      const data = query.state.data as any;
      return data?.status === 'RUNNING' || data?.status === 'QUEUED' ? 3000 : false;
    },
  });

  if (!run) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'RUNNING':
        return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'QUEUED':
        return <Clock className="h-6 w-6 text-orange-500" />;
      default:
        return <Clock className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'FAILED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'RUNNING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'QUEUED':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTypeTitle = (type: string) => {
    switch (type) {
      case 'scoring':
        return 'ETF Scoring';
      case 'pac':
        return 'PAC Proposal';
      case 'full':
        return 'Analisi Completa';
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Dettagli Elaborazione" maxWidth="2xl">
      <div className="p-6 space-y-6">
        {/* Header con stato */}
        <div className="flex items-start gap-4">
          {getStatusIcon(runDetails?.status || run.status)}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">{getTypeTitle(run.type)}</h3>
              <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(runDetails?.status || run.status)}`}>
                {runDetails?.status || run.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {run.id}
            </p>
          </div>
        </div>

        {/* Info temporali */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground">Avviato</p>
            <p className="text-sm mt-1">{new Date(run.createdAt).toLocaleString('it-IT')}</p>
          </div>
          {runDetails?.completedAt && (
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground">Completato</p>
              <p className="text-sm mt-1">{new Date(runDetails.completedAt).toLocaleString('it-IT')}</p>
            </div>
          )}
        </div>

        {/* Errore se presente */}
        {runDetails?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Errore durante l'elaborazione</p>
                <p className="text-sm text-red-700 mt-1">{runDetails.error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Caricamento dettagli...</p>
          </div>
        )}

        {/* Risultati Scoring */}
        {runDetails?.scoringResults && runDetails.scoringResults.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-primary" />
              <h4 className="font-semibold">Risultati Scoring ({runDetails.scoringResults.length})</h4>
            </div>
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">ETF</th>
                      <th className="px-4 py-2 text-right font-medium">Score Totale</th>
                      <th className="px-4 py-2 text-right font-medium">Rendimento</th>
                      <th className="px-4 py-2 text-right font-medium">Volatilità</th>
                      <th className="px-4 py-2 text-right font-medium">TER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {runDetails.scoringResults.map((result: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/50">
                        <td className="px-4 py-2">
                          <div>
                            <p className="font-medium">{result.instrument?.ticker}</p>
                            <p className="text-xs text-muted-foreground">{result.instrument?.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="font-semibold text-primary">{result.totalScore?.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-2 text-right">{result.returnScore?.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{result.volatilityScore?.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{result.costScore?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Proposte PAC */}
        {runDetails?.pacProposals && runDetails.pacProposals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold">Proposte PAC ({runDetails.pacProposals.length})</h4>
            </div>
            <div className="space-y-3">
              {runDetails.pacProposals.map((proposal: any, idx: number) => (
                <div key={idx} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{proposal.portfolio?.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Contributo mensile: €{proposal.monthlyAmount?.toFixed(2)}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      €{proposal.totalAmount?.toFixed(2)}
                    </span>
                  </div>
                  {proposal.allocations && proposal.allocations.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Allocazioni:</p>
                      {proposal.allocations.map((alloc: any, allocIdx: number) => (
                        <div key={allocIdx} className="flex items-center justify-between text-sm">
                          <span>{alloc.instrument?.ticker}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{(alloc.percentage * 100).toFixed(1)}%</span>
                            <span className="font-medium">€{alloc.amount?.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nessun risultato */}
        {runDetails && !isLoading &&
         (!runDetails.scoringResults || runDetails.scoringResults.length === 0) &&
         (!runDetails.pacProposals || runDetails.pacProposals.length === 0) &&
         runDetails.status === 'COMPLETED' && (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Elaborazione completata ma nessun risultato disponibile
            </p>
          </div>
        )}

        {/* Pulsante chiudi */}
        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Chiudi
          </button>
        </div>
      </div>
    </Dialog>
  );
}
