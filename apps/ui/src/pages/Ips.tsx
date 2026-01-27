import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText, CheckCircle, Clock, Plus, PlayCircle, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CreateIpsDialog } from '@/components/CreateIpsDialog';
import { CreateIpsVersionDialog } from '@/components/CreateIpsVersionDialog';
import { EditIpsVersionDialog } from '@/components/EditIpsVersionDialog';

export function IpsPage() {
  const userId = 'user_default';
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [editingVersion, setEditingVersion] = useState<any>(null);

  const { data: policy, isLoading, error } = useQuery({
    queryKey: ['ips', userId],
    queryFn: () => api.ips.getPolicy(userId),
  });

  const activateMutation = useMutation({
    mutationFn: (versionId: string) => api.ips.activateVersion(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ips'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (versionId: string) => api.ips.deleteVersion(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ips'] });
    },
  });

  const handleActivate = (versionId: string) => {
    if (confirm('Sei sicuro di voler attivare questa versione? La versione corrente verrà disattivata.')) {
      activateMutation.mutate(versionId);
    }
  };

  const handleDelete = (version: any) => {
    if (confirm(`Sei sicuro di voler eliminare la versione ${version.version}?\n\nQuesta azione non può essere annullata.`)) {
      deleteMutation.mutate(version.id);
    }
  };

  const activeVersion = policy?.versions?.find((v: any) => v.isActive);

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  // If no policy exists, show create button
  if (error || !policy) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Investment Policy Statement (IPS)</h1>
          <p className="text-muted-foreground">
            Gestisci la tua politica di investimento e versioni
          </p>
        </div>

        <div className="rounded-lg border bg-card p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Nessuna Policy IPS Configurata</p>
          <p className="text-sm text-muted-foreground mb-6">
            Crea la tua prima Investment Policy Statement per definire gli obiettivi e i vincoli del tuo portafoglio
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Crea Policy IPS
          </button>
        </div>

        <CreateIpsDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investment Policy Statement (IPS)</h1>
          <p className="text-muted-foreground">
            Gestisci la tua politica di investimento e versioni
          </p>
        </div>
        <button
          onClick={() => setShowVersionDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuova Versione
        </button>
      </div>

      <CreateIpsVersionDialog
        open={showVersionDialog}
        onClose={() => setShowVersionDialog(false)}
        currentVersion={activeVersion}
      />

      {editingVersion && (
        <EditIpsVersionDialog
          open={!!editingVersion}
          onClose={() => setEditingVersion(null)}
          version={editingVersion}
        />
      )}

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
                  <span className="text-sm font-medium capitalize">
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
                  <span className="text-sm font-medium capitalize">
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
                  <span className="text-sm font-medium capitalize">
                    {activeVersion.config?.riskProfile || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tolleranza Volatilità</span>
                  <span className="text-sm font-medium capitalize">
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
                    €{(activeVersion.config?.monthlyContribution || 0).toFixed(2)}
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

              <div className="flex items-center gap-2">
                {version.isActive ? (
                  <span className="text-xs font-medium text-primary">ATTIVA</span>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingVersion(version)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Modifica versione"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(version)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      title="Elimina versione"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleActivate(version.id)}
                      disabled={activateMutation.isPending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      title="Attiva questa versione"
                    >
                      <PlayCircle className="h-3 w-3" />
                      Attiva
                    </button>
                  </>
                )}
              </div>
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
