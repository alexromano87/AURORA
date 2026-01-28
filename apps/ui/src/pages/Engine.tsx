import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Play, Clock, CheckCircle, XCircle, Loader2, RefreshCw, Filter, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { RunEngineDialog } from '@/components/RunEngineDialog';
import { EngineRunDetailDialog } from '@/components/EngineRunDetailDialog';

type RunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null;
type RunType = 'scoring' | 'pac' | 'full' | null;

export function EnginePage() {
  const userId = 'user_default';
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<RunStatus>(null);
  const [typeFilter, setTypeFilter] = useState<RunType>(null);

  const { data: runs, isLoading, refetch } = useQuery({
    queryKey: ['engine-runs', userId],
    queryFn: () => api.engine.listRuns(userId, 50),
    refetchInterval: (query) => {
      // Auto-refresh ogni 5 secondi se ci sono run in esecuzione o in coda
      const data = query.state.data as any[];
      const hasActiveRuns = data?.some((r: any) =>
        r.status === 'RUNNING' || r.status === 'QUEUED'
      );
      return hasActiveRuns ? 5000 : false;
    },
  });

  // Filtra runs
  const filteredRuns = runs?.filter((run: any) => {
    if (statusFilter && run.status !== statusFilter) return false;
    if (typeFilter && run.type !== typeFilter) return false;
    return true;
  });

  const hasActiveFilters = statusFilter !== null || typeFilter !== null;

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
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="section-subtitle">Orchestrazione</p>
          <h1 className="section-title">Engine Analytics</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-white"
            title="Aggiorna"
          >
            <RefreshCw className="h-4 w-4" />
            Aggiorna
          </button>
          <button
            onClick={() => setShowRunDialog(true)}
            className="cta-button inline-flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Nuova analisi
          </button>
        </div>
      </div>

      <RunEngineDialog
        open={showRunDialog}
        onClose={() => setShowRunDialog(false)}
      />

      <EngineRunDetailDialog
        open={!!selectedRun}
        onClose={() => setSelectedRun(null)}
        run={selectedRun}
      />

      {/* Filtri */}
      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-foreground/40" />
            <span className="text-sm font-medium">Filtri attivi</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="aurora-select"
            >
              <option value="">Tutti gli stati</option>
              <option value="QUEUED">In coda</option>
              <option value="RUNNING">In esecuzione</option>
              <option value="COMPLETED">Completati</option>
              <option value="FAILED">Falliti</option>
            </select>

            <select
              value={typeFilter || ''}
              onChange={(e) => setTypeFilter(e.target.value || null)}
              className="aurora-select"
            >
              <option value="">Tutti i tipi</option>
              <option value="scoring">ETF Scoring</option>
              <option value="pac">PAC Proposal</option>
              <option value="full">Analisi Completa</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setStatusFilter(null);
                  setTypeFilter(null);
                }}
                className="flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-100"
              >
                <X className="h-3 w-3" />
                Rimuovi filtri
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'].map((status) => {
          const count = runs?.filter((r: any) => r.status === status).length || 0;
          return (
            <div key={status} className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(status)}
                <p className="text-sm font-medium text-foreground/60">{status}</p>
              </div>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          );
        })}
      </div>

      <div className="glass-panel p-0">
        <div className="p-6 border-b border-white/60">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Storico Elaborazioni</h2>
            <span className="text-sm text-foreground/60">
              {filteredRuns?.length || 0} {hasActiveFilters ? 'risultat' : 'elaborazion'}
              {(filteredRuns?.length || 0) === 1 ? (hasActiveFilters ? 'o' : 'e') : (hasActiveFilters ? 'i' : 'i')}
            </span>
          </div>
        </div>
        <div className="divide-y">
          {filteredRuns?.map((run: any) => (
            <div
              key={run.id}
              onClick={() => setSelectedRun(run)}
              className="p-6 hover:bg-white/70 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {getStatusIcon(run.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {run.type === 'scoring' && 'ETF Scoring'}
                        {run.type === 'pac' && 'PAC Proposal'}
                        {run.type === 'full' && 'Analisi Completa'}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded border ${getStatusColor(
                          run.status
                        )}`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/60 mt-1">
                      Avviato il {new Date(run.createdAt).toLocaleString('it-IT')}
                    </p>
                    {run.completedAt && (
                      <p className="text-sm text-foreground/60">
                        Completato il {new Date(run.completedAt).toLocaleString('it-IT')}
                      </p>
                    )}
                    {run.error && (
                      <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 p-3">
                        <p className="text-xs font-medium text-rose-800">Errore:</p>
                        <p className="text-xs text-rose-700 mt-1">{run.error}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {run._count && (
                    <div className="text-sm">
                      {run._count.scoringResults > 0 && (
                        <p className="text-foreground/60">
                          {run._count.scoringResults} scoring result{run._count.scoringResults > 1 ? 's' : ''}
                        </p>
                      )}
                      {run._count.pacProposals > 0 && (
                        <p className="text-foreground/60">
                          {run._count.pacProposals} PAC proposal{run._count.pacProposals > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!filteredRuns?.length && runs?.length > 0 && (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 mx-auto text-foreground/30 mb-4" />
            <p className="text-foreground/60">
              Nessuna elaborazione corrisponde ai filtri
            </p>
            <button
              onClick={() => {
                setStatusFilter(null);
                setTypeFilter(null);
              }}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Rimuovi filtri
            </button>
          </div>
        )}

        {!runs?.length && (
          <div className="text-center py-12">
            <Play className="h-12 w-12 mx-auto text-foreground/30 mb-4" />
            <p className="text-foreground/60">
              Nessuna elaborazione disponibile
            </p>
            <p className="text-sm text-foreground/60 mt-2">
              Avvia una nuova elaborazione per iniziare
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
