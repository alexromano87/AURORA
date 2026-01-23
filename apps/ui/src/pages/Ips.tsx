import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText, CheckCircle, Clock } from 'lucide-react';

export function IpsPage() {
  const userId = 'user_default';

  const { data: policy } = useQuery({
    queryKey: ['ips', userId],
    queryFn: () => api.ips.getPolicy(userId),
  });

  const activeVersion = policy?.versions?.find((v: any) => v.isActive);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Investment Policy Statement (IPS)</h1>
        <p className="text-muted-foreground">
          Gestisci la tua politica di investimento e versioni
        </p>
      </div>

      {activeVersion && (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Versione Attiva</h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              <CheckCircle className="h-3 w-3" />
              v{activeVersion.version}
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Obiettivi e Orizzonte
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Orizzonte Temporale</span>
                  <span className="text-sm font-medium">
                    {activeVersion.config?.timeHorizon || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Età</span>
                  <span className="text-sm font-medium">
                    {activeVersion.config?.age || 'N/A'} anni
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Obiettivo Principale</span>
                  <span className="text-sm font-medium">
                    {activeVersion.config?.goal || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Profilo Rischio
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Profilo</span>
                  <span className="text-sm font-medium">
                    {activeVersion.config?.riskProfile || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tolleranza Volatilità</span>
                  <span className="text-sm font-medium">
                    {activeVersion.config?.volatilityTolerance || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Max Drawdown</span>
                  <span className="text-sm font-medium">
                    {activeVersion.config?.maxDrawdown || 'N/A'}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Asset Allocation Target
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Azionario</span>
                  <span className="text-sm font-medium">
                    {activeVersion.config?.assetAllocation?.equity || 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Obbligazionario</span>
                  <span className="text-sm font-medium">
                    {activeVersion.config?.assetAllocation?.bonds || 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cash</span>
                  <span className="text-sm font-medium">
                    {activeVersion.config?.assetAllocation?.cash || 0}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Vincoli e Preferenze
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">ESG</span>
                  <span className="text-sm font-medium">
                    {activeVersion.config?.constraints?.esg ? 'Sì' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Contributi Mensili</span>
                  <span className="text-sm font-medium">
                    €{activeVersion.config?.monthlyContribution?.toLocaleString('it-IT') || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Rebalance Threshold</span>
                  <span className="text-sm font-medium">
                    {activeVersion.config?.rebalanceThreshold || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {activeVersion.notes && (
            <div className="mt-6 p-4 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">Note</p>
              <p className="text-sm text-muted-foreground">{activeVersion.notes}</p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Storico Versioni</h2>
        <div className="space-y-3">
          {policy?.versions?.map((version: any) => (
            <div
              key={version.id}
              className={`flex items-center justify-between p-4 rounded-md ${
                version.isActive ? 'bg-primary/10 border border-primary' : 'bg-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                {version.isActive ? (
                  <CheckCircle className="h-4 w-4 text-primary" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Versione {version.version}</p>
                  <p className="text-xs text-muted-foreground">
                    Creata il {new Date(version.createdAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </div>
              {version.isActive && (
                <span className="text-xs font-medium text-primary">ATTIVA</span>
              )}
            </div>
          ))}
          {!policy?.versions?.length && (
            <p className="text-sm text-muted-foreground">Nessuna versione disponibile</p>
          )}
        </div>
      </div>
    </div>
  );
}
