import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Play, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { RunEngineDialog } from '@/components/RunEngineDialog';

export function EnginePage() {
  const userId = 'user_default';
  const [showRunDialog, setShowRunDialog] = useState(false);

  const { data: runs, isLoading } = useQuery({
    queryKey: ['engine-runs', userId],
    queryFn: () => api.engine.listRuns(userId, 50),
  });

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'RUNNING':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'QUEUED':
        return <Clock className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Engine Analytics</h1>
          <p className="text-muted-foreground">
            Gestisci le elaborazioni di scoring e PAC
          </p>
        </div>
        <button
          onClick={() => setShowRunDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90"
        >
          <Play className="h-4 w-4" />
          Nuova Analisi
        </button>
      </div>

      <RunEngineDialog
        open={showRunDialog}
        onClose={() => setShowRunDialog(false)}
      />

      <div className="grid gap-4 md:grid-cols-4">
        {['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'].map((status) => {
          const count = runs?.filter((r: any) => r.status === status).length || 0;
          return (
            <div key={status} className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(status)}
                <p className="text-sm font-medium text-muted-foreground">{status}</p>
              </div>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Storico Elaborazioni</h2>
        </div>
        <div className="divide-y">
          {runs?.map((run: any) => (
            <div key={run.id} className="p-6 hover:bg-muted/50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {getStatusIcon(run.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {run.type === 'scoring' && 'ETF Scoring'}
                        {run.type === 'pac' && 'PAC Proposal'}
                        {run.type === 'full' && 'Full Analysis'}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded border ${getStatusColor(
                          run.status
                        )}`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Avviato il {new Date(run.createdAt).toLocaleString('it-IT')}
                    </p>
                    {run.completedAt && (
                      <p className="text-sm text-muted-foreground">
                        Completato il {new Date(run.completedAt).toLocaleString('it-IT')}
                      </p>
                    )}
                    {run.error && (
                      <p className="text-sm text-red-500 mt-2">{run.error}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {run._count && (
                    <div className="text-sm">
                      {run._count.scoringResults > 0 && (
                        <p className="text-muted-foreground">
                          {run._count.scoringResults} scoring results
                        </p>
                      )}
                      {run._count.pacProposals > 0 && (
                        <p className="text-muted-foreground">
                          {run._count.pacProposals} PAC proposals
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!runs?.length && (
          <div className="text-center py-12">
            <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nessuna elaborazione disponibile
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Avvia una nuova elaborazione per iniziare
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
