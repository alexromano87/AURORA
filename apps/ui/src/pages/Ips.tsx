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
      <div className="space-y-10">
        <div>
          <p className="section-subtitle">Investment Policy</p>
          <h1 className="section-title">IPS</h1>
        </div>

        <div className="glass-panel p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-foreground/40 mb-4" />
          <p className="text-lg font-semibold mb-2">Nessuna policy IPS configurata</p>
          <p className="text-sm text-foreground/60 mb-6">
            Crea la tua prima Investment Policy Statement per definire obiettivi e vincoli del portafoglio.
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="cta-button inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Crea policy IPS
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
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="section-subtitle">Governance</p>
          <h1 className="section-title">Investment Policy Statement</h1>
        </div>
        <button
          onClick={() => setShowVersionDialog(true)}
          className="cta-button inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuova versione
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
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Versione attiva</h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
              <CheckCircle className="h-3 w-3" />
              v{activeVersion.version}
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-foreground/60 mb-3">
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
              <h3 className="text-sm font-medium text-foreground/60 mb-3">
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
              <h3 className="text-sm font-medium text-foreground/60 mb-3">
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
              <h3 className="text-sm font-medium text-foreground/60 mb-3">
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
            <div className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-4">
              <p className="text-sm font-medium mb-1">Note</p>
              <p className="text-sm text-foreground/60">{activeVersion.notes}</p>
            </div>
          )}
        </div>
      )}

      <div className="glass-panel p-6">
        <h2 className="text-lg font-semibold mb-4">Storico versioni</h2>
        <div className="space-y-3">
          {policy?.versions?.map((version: any) => (
            <div
              key={version.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 ${
                version.isActive ? 'border-primary/40 bg-primary/10' : 'border-white/60 bg-white/70'
              }`}
            >
              <div className="flex items-center gap-3">
                {version.isActive ? (
                  <CheckCircle className="h-4 w-4 text-primary" />
                ) : (
                  <Clock className="h-4 w-4 text-foreground/40" />
                )}
                <div>
                  <p className="font-medium">Versione {version.version}</p>
                  <p className="text-xs text-foreground/60">
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
                      className="rounded-full bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 transition-colors"
                      title="Modifica versione"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(version)}
                      disabled={deleteMutation.isPending}
                      className="rounded-full bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
                      title="Elimina versione"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleActivate(version.id)}
                      disabled={activateMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-full bg-foreground px-4 py-2 text-xs text-white hover:bg-foreground/90 disabled:opacity-50"
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
            <p className="text-sm text-foreground/60">Nessuna versione disponibile</p>
          )}
        </div>
      </div>
    </div>
  );
}
