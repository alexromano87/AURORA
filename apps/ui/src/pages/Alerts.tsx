import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export function AlertsPage() {
  const userId = 'user_default';

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', userId],
    queryFn: () => api.alerts.list(userId),
  });

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  const activeAlerts = alerts?.filter((a: any) => a.status === 'ACTIVE') || [];
  const dismissedAlerts = alerts?.filter((a: any) => a.status === 'DISMISSED') || [];
  const resolvedAlerts = alerts?.filter((a: any) => a.status === 'RESOLVED') || [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-500 bg-red-50 border-red-200';
      case 'HIGH':
        return 'text-orange-500 bg-orange-50 border-orange-200';
      case 'MEDIUM':
        return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'LOW':
        return 'text-blue-500 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const renderAlert = (alert: any) => (
    <div
      key={alert.id}
      className={`rounded-lg border p-6 ${getSeverityColor(alert.severity)}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg">{alert.title}</h3>
            <p className="text-sm mt-1">{alert.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-1 rounded bg-white/50">
            {alert.type}
          </span>
          <span className="text-xs font-medium px-2 py-1 rounded bg-white/50">
            {alert.severity}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs">
          {alert.portfolio?.name && (
            <span className="font-medium">Portfolio: {alert.portfolio.name}</span>
          )}
          <span className="text-muted-foreground ml-4">
            {new Date(alert.createdAt).toLocaleString('it-IT')}
          </span>
        </div>
        {alert.status === 'ACTIVE' && (
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs font-medium rounded border hover:bg-white/50">
              Ignora
            </button>
            <button className="px-3 py-1 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90">
              Risolvi
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Alerts</h1>
        <p className="text-muted-foreground">
          Notifiche e avvisi sul tuo portafoglio
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <p className="font-medium">Alerts Attivi</p>
          </div>
          <p className="text-3xl font-bold mt-2">{activeAlerts.length}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-gray-500" />
            <p className="font-medium">Ignorati</p>
          </div>
          <p className="text-3xl font-bold mt-2">{dismissedAlerts.length}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="font-medium">Risolti</p>
          </div>
          <p className="text-3xl font-bold mt-2">{resolvedAlerts.length}</p>
        </div>
      </div>

      {activeAlerts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Alerts Attivi</h2>
          <div className="space-y-4">
            {activeAlerts.map(renderAlert)}
          </div>
        </div>
      )}

      {resolvedAlerts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recentemente Risolti</h2>
          <div className="space-y-4">
            {resolvedAlerts.slice(0, 5).map((alert: any) => (
              <div
                key={alert.id}
                className="rounded-lg border bg-card p-6 opacity-70"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{alert.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Risolto il {new Date(alert.resolvedAt).toLocaleString('it-IT')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!alerts?.length && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessun alert disponibile</p>
        </div>
      )}
    </div>
  );
}
