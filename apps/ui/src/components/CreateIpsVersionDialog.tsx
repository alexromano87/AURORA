import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from './Dialog';
import { api } from '@/lib/api';

interface CreateIpsVersionDialogProps {
  open: boolean;
  onClose: () => void;
  currentVersion?: any;
}

export function CreateIpsVersionDialog({ open, onClose, currentVersion }: CreateIpsVersionDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    version: '',
    timeHorizon: '',
    age: '',
    goal: '',
    riskProfile: 'moderato' as 'conservativo' | 'moderato' | 'aggressivo',
    volatilityTolerance: 'media' as 'bassa' | 'media' | 'alta',
    maxDrawdown: '20',
    equityAllocation: '60',
    bondsAllocation: '30',
    cashAllocation: '10',
    esg: false,
    monthlyContribution: '',
    rebalanceThreshold: '5',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentVersion && open) {
      const config = currentVersion.config;
      setFormData({
        version: (parseInt(currentVersion.version) + 1).toString(),
        timeHorizon: config?.timeHorizon || '',
        age: config?.age?.toString() || '',
        goal: config?.goal || '',
        riskProfile: config?.riskProfile || 'moderato',
        volatilityTolerance: config?.volatilityTolerance || 'media',
        maxDrawdown: config?.maxDrawdown?.toString() || '20',
        equityAllocation: config?.assetAllocation?.equity?.toString() || '60',
        bondsAllocation: config?.assetAllocation?.bonds?.toString() || '30',
        cashAllocation: config?.assetAllocation?.cash?.toString() || '10',
        esg: config?.constraints?.esg || false,
        monthlyContribution: config?.monthlyContribution?.toString() || '',
        rebalanceThreshold: config?.rebalanceThreshold?.toString() || '5',
      });
    }
  }, [currentVersion, open]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.ips.createVersion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ips'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Errore durante la creazione della versione');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const totalAllocation =
      parseFloat(formData.equityAllocation) +
      parseFloat(formData.bondsAllocation) +
      parseFloat(formData.cashAllocation);

    if (totalAllocation !== 100) {
      setError('L\'asset allocation totale deve essere 100%');
      return;
    }

    if (!formData.version || !formData.timeHorizon || !formData.age || !formData.goal) {
      setError('Compila tutti i campi obbligatori');
      return;
    }

    const config = {
      version: formData.version,
      timeHorizon: formData.timeHorizon,
      age: parseInt(formData.age),
      goal: formData.goal,
      riskProfile: formData.riskProfile,
      volatilityTolerance: formData.volatilityTolerance,
      maxDrawdown: parseFloat(formData.maxDrawdown),
      assetAllocation: {
        equity: parseFloat(formData.equityAllocation),
        bonds: parseFloat(formData.bondsAllocation),
        cash: parseFloat(formData.cashAllocation),
      },
      constraints: {
        esg: formData.esg,
      },
      monthlyContribution: formData.monthlyContribution ? parseFloat(formData.monthlyContribution) : 0,
      rebalanceThreshold: parseFloat(formData.rebalanceThreshold),
    };

    createMutation.mutate({
      userId: 'user_default',
      config,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Crea Nuova Versione IPS">
      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Numero Versione *
          </label>
          <input
            type="text"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            placeholder="Es. 2"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={createMutation.isPending}
            required
          />
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Obiettivi e Orizzonte</h3>

          <div>
            <label className="block text-sm font-medium mb-1">
              Orizzonte Temporale *
            </label>
            <select
              value={formData.timeHorizon}
              onChange={(e) => setFormData({ ...formData, timeHorizon: e.target.value })}
              className="aurora-select w-full"
              disabled={createMutation.isPending}
              required
            >
              <option value="">Seleziona...</option>
              <option value="breve">Breve termine (1-3 anni)</option>
              <option value="medio">Medio termine (3-10 anni)</option>
              <option value="lungo">Lungo termine (10+ anni)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Età *
            </label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              placeholder="Es. 35"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={createMutation.isPending}
              required
              min="18"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Obiettivo Principale *
            </label>
            <select
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              className="aurora-select w-full"
              disabled={createMutation.isPending}
              required
            >
              <option value="">Seleziona...</option>
              <option value="pensione">Pensione</option>
              <option value="casa">Acquisto casa</option>
              <option value="crescita">Crescita patrimonio</option>
              <option value="preservazione">Preservazione capitale</option>
              <option value="reddito">Generazione reddito</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Profilo Rischio</h3>

          <div>
            <label className="block text-sm font-medium mb-1">
              Profilo *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['conservativo', 'moderato', 'aggressivo'] as const).map((profile) => (
                <button
                  key={profile}
                  type="button"
                  onClick={() => setFormData({ ...formData, riskProfile: profile })}
                  className={`px-4 py-2 border rounded-md font-medium capitalize ${
                    formData.riskProfile === profile
                      ? 'bg-primary text-white border-primary'
                      : 'hover:bg-gray-50'
                  }`}
                  disabled={createMutation.isPending}
                >
                  {profile}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tolleranza Volatilità *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['bassa', 'media', 'alta'] as const).map((tolerance) => (
                <button
                  key={tolerance}
                  type="button"
                  onClick={() => setFormData({ ...formData, volatilityTolerance: tolerance })}
                  className={`px-4 py-2 border rounded-md font-medium capitalize ${
                    formData.volatilityTolerance === tolerance
                      ? 'bg-primary text-white border-primary'
                      : 'hover:bg-gray-50'
                  }`}
                  disabled={createMutation.isPending}
                >
                  {tolerance}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Max Drawdown (%) *
            </label>
            <input
              type="number"
              value={formData.maxDrawdown}
              onChange={(e) => setFormData({ ...formData, maxDrawdown: e.target.value })}
              placeholder="Es. 20"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={createMutation.isPending}
              required
              min="0"
              max="100"
              step="1"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Asset Allocation Target</h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Azionario (%) *
              </label>
              <input
                type="number"
                value={formData.equityAllocation}
                onChange={(e) => setFormData({ ...formData, equityAllocation: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={createMutation.isPending}
                required
                min="0"
                max="100"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Obbligazionario (%) *
              </label>
              <input
                type="number"
                value={formData.bondsAllocation}
                onChange={(e) => setFormData({ ...formData, bondsAllocation: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={createMutation.isPending}
                required
                min="0"
                max="100"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Cash (%) *
              </label>
              <input
                type="number"
                value={formData.cashAllocation}
                onChange={(e) => setFormData({ ...formData, cashAllocation: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={createMutation.isPending}
                required
                min="0"
                max="100"
                step="1"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Totale: {
              (parseFloat(formData.equityAllocation) || 0) +
              (parseFloat(formData.bondsAllocation) || 0) +
              (parseFloat(formData.cashAllocation) || 0)
            }% (deve essere 100%)
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Vincoli e Preferenze</h3>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="esg-version"
              checked={formData.esg}
              onChange={(e) => setFormData({ ...formData, esg: e.target.checked })}
              className="h-4 w-4"
              disabled={createMutation.isPending}
            />
            <label htmlFor="esg-version" className="text-sm font-medium">
              Investimenti ESG
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Contributi Mensili (€)
            </label>
            <input
              type="number"
              value={formData.monthlyContribution}
              onChange={(e) => setFormData({ ...formData, monthlyContribution: e.target.value })}
              placeholder="Es. 500"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={createMutation.isPending}
              min="0"
              step="50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Soglia Rebalancing (%) *
            </label>
            <input
              type="number"
              value={formData.rebalanceThreshold}
              onChange={(e) => setFormData({ ...formData, rebalanceThreshold: e.target.value })}
              placeholder="Es. 5"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={createMutation.isPending}
              required
              min="0"
              max="50"
              step="1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
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
            {createMutation.isPending ? 'Creazione...' : 'Crea Versione'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
