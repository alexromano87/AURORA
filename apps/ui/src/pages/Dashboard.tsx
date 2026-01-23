import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, AlertCircle, Briefcase } from 'lucide-react';

export function DashboardPage() {
  const userId = 'user_default';

  const { data: portfolios } = useQuery({
    queryKey: ['portfolios', userId],
    queryFn: () => api.portfolios.list(userId),
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts', userId, false],
    queryFn: () => api.alerts.list(userId, false),
  });

  const { data: ipsPolicy } = useQuery({
    queryKey: ['ips', userId],
    queryFn: () => api.ips.getPolicy(userId),
  });

  const totalValue = portfolios?.reduce((sum: number, p: any) => sum + (p.totalValue || 0), 0) || 0;
  const totalReturn = portfolios?.reduce((sum: number, p: any) => sum + (p.totalReturn || 0), 0) || 0;
  const totalReturnPct = totalValue > 0 ? (totalReturn / (totalValue - totalReturn)) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Panoramica del tuo patrimonio e investimenti
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Patrimonio Totale</p>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">
            €{totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Rendimento Totale</p>
            {totalReturn >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <p className={`mt-2 text-2xl font-bold ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            €{totalReturn.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className={`text-xs ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Portfolios</p>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{portfolios?.length || 0}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Alerts Attivi</p>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{alerts?.length || 0}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Portfolios Recenti</h2>
          <div className="space-y-3">
            {portfolios?.slice(0, 5).map((portfolio: any) => (
              <div key={portfolio.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{portfolio.name}</p>
                  <p className="text-xs text-muted-foreground">{portfolio.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    €{(portfolio.totalValue || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <p className={`text-xs ${(portfolio.totalReturnPct || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(portfolio.totalReturnPct || 0) >= 0 ? '+' : ''}
                    {(portfolio.totalReturnPct || 0).toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
            {!portfolios?.length && (
              <p className="text-sm text-muted-foreground">Nessun portfolio disponibile</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Alerts Recenti</h2>
          <div className="space-y-3">
            {alerts?.slice(0, 5).map((alert: any) => (
              <div key={alert.id} className="flex items-start gap-3">
                <AlertCircle className={`h-4 w-4 mt-0.5 ${
                  alert.severity === 'CRITICAL' ? 'text-red-500' :
                  alert.severity === 'HIGH' ? 'text-orange-500' :
                  alert.severity === 'MEDIUM' ? 'text-yellow-500' : 'text-blue-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
              </div>
            ))}
            {!alerts?.length && (
              <p className="text-sm text-muted-foreground">Nessun alert attivo</p>
            )}
          </div>
        </div>
      </div>

      {ipsPolicy && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">IPS Attivo</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Orizzonte Temporale</p>
              <p className="text-lg font-medium">{ipsPolicy.config?.timeHorizon || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profilo Rischio</p>
              <p className="text-lg font-medium">{ipsPolicy.config?.riskProfile || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Versione</p>
              <p className="text-lg font-medium">v{ipsPolicy.activeVersion?.version || '1'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
