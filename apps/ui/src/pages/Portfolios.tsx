import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Briefcase, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { CreatePortfolioDialog } from '@/components/CreatePortfolioDialog';

export function PortfoliosPage() {
  const userId = 'user_default';
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['portfolios', userId],
    queryFn: () => api.portfolios.list(userId),
  });

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolios</h1>
          <p className="text-muted-foreground">
            Gestisci i tuoi portafogli di investimento
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90"
        >
          Nuovo Portfolio
        </button>
      </div>

      <CreatePortfolioDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {portfolios?.map((portfolio: any) => (
          <Link
            key={portfolio.id}
            to={`/portfolios/${portfolio.id}`}
            className="block rounded-lg border bg-card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{portfolio.name}</h3>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-muted">
                {portfolio.type}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Valore Totale</p>
                <p className="text-2xl font-bold">
                  €{(portfolio.totalValue || 0).toLocaleString('it-IT', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rendimento</p>
                  <p
                    className={`text-lg font-semibold ${
                      (portfolio.totalReturn || 0) >= 0
                        ? 'text-green-500'
                        : 'text-red-500'
                    }`}
                  >
                    €{(portfolio.totalReturn || 0).toLocaleString('it-IT', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {(portfolio.totalReturnPct || 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={`font-medium ${
                      (portfolio.totalReturnPct || 0) >= 0
                        ? 'text-green-500'
                        : 'text-red-500'
                    }`}
                  >
                    {(portfolio.totalReturnPct || 0) >= 0 ? '+' : ''}
                    {(portfolio.totalReturnPct || 0).toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {portfolio.positions?.length || 0} posizioni
                </p>
              </div>
            </div>
          </Link>
        ))}

        {!portfolios?.length && (
          <div className="col-span-full text-center py-12">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nessun portfolio disponibile. Creane uno per iniziare.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
