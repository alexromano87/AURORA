import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Download, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';

export function PricesPage() {
  const queryClient = useQueryClient();
  const [selectedDays, setSelectedDays] = useState(7);

  const { data: jobsStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['price-jobs-status'],
    queryFn: () => api.prices.getJobsStatus(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const queueUpdateAllMutation = useMutation({
    mutationFn: (days: number) => api.prices.queueUpdateAll(days),
    onSuccess: () => {
      refetchStatus();
    },
  });

  const handleQueueUpdateAll = () => {
    queueUpdateAllMutation.mutate(selectedDays);
  };

  const daysOptions = [
    { value: 7, label: '7 giorni' },
    { value: 30, label: '30 giorni' },
    { value: 90, label: '3 mesi' },
    { value: 180, label: '6 mesi' },
    { value: 365, label: '1 anno' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Gestione Prezzi</h1>
        <p className="text-muted-foreground">
          Aggiorna i prezzi storici degli strumenti da Yahoo Finance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Update All Prices Card */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Aggiorna Tutti i Prezzi</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Scarica i prezzi per tutti gli strumenti in modalità asincrona
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Periodo di aggiornamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {daysOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDays(option.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                      selectedDays === option.value
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleQueueUpdateAll}
              disabled={queueUpdateAllMutation.isPending}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {queueUpdateAllMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Accodamento...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Avvia Aggiornamento
                </>
              )}
            </button>

            {queueUpdateAllMutation.isSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✓ Aggiornamento accodato con successo! I prezzi verranno scaricati in background.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Jobs Status Card */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Stato Jobs</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Monitoraggio job di aggiornamento prezzi
              </p>
            </div>
          </div>

          {jobsStatus && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-900">In Attesa</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900">{jobsStatus.waiting}</p>
                </div>

                <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                    <span className="text-sm font-medium text-blue-900">Attivi</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{jobsStatus.active}</p>
                </div>

                <div className="p-3 rounded-md bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Completati</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{jobsStatus.completed}</p>
                </div>

                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-900">Falliti</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">{jobsStatus.failed}</p>
                </div>
              </div>

              {jobsStatus.jobs.active.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Job Attivi:</p>
                  <div className="space-y-2">
                    {jobsStatus.jobs.active.map((job: any) => (
                      <div
                        key={job.id}
                        className="p-2 bg-blue-50 rounded text-xs font-mono"
                      >
                        {job.name} - {job.data.instrumentId || 'Tutti gli strumenti'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jobsStatus.jobs.failed.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Ultimi Errori:</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {jobsStatus.jobs.failed.slice(0, 3).map((job: any) => (
                      <div
                        key={job.id}
                        className="p-2 bg-red-50 rounded text-xs"
                      >
                        <p className="font-medium text-red-900">{job.name}</p>
                        <p className="text-red-700 mt-1">{job.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-3">Informazioni</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            • I prezzi vengono scaricati da <strong>Yahoo Finance</strong> in background
          </p>
          <p>
            • L'aggiornamento automatico è schedulato ogni giorno alle <strong>02:00</strong>
          </p>
          <p>
            • Per evitare rate limiting, c'è una pausa di 1 secondo tra ogni strumento
          </p>
          <p>
            • Gli strumenti di tipo <strong>BOND</strong> e <strong>CASH</strong> non vengono aggiornati
          </p>
          <p>
            • Per crypto e ETF europei vengono usati ticker specifici (es. BTC-USD, ticker.MI)
          </p>
        </div>
      </div>
    </div>
  );
}
