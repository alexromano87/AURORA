import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Briefcase, TrendingUp, TrendingDown, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CreatePortfolioDialog } from '@/components/CreatePortfolioDialog';
import { EditPortfolioDialog } from '@/components/EditPortfolioDialog';

export function PortfoliosPage() {
  const userId = 'user_default';
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<any>(null);

  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['portfolios', userId],
    queryFn: () => api.portfolios.list(userId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.portfolios.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });

  const handleDelete = (portfolio: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm(`Sei sicuro di voler eliminare il portfolio "${portfolio.name}"?\n\nQuesta azione eliminerà anche tutte le transazioni e le posizioni associate.`)) {
      deleteMutation.mutate(portfolio.id);
    }
  };

  const handleEdit = (portfolio: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingPortfolio(portfolio);
  };

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

      {editingPortfolio && (
        <EditPortfolioDialog
          open={!!editingPortfolio}
          onClose={() => setEditingPortfolio(null)}
          portfolio={editingPortfolio}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {portfolios?.map((portfolio: any) => (
          <div key={portfolio.id} className="relative rounded-lg border bg-card hover:shadow-md transition-shadow">
            <Link
              to={`/portfolios/${portfolio.id}`}
              className="block p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{portfolio.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-muted">
                    {portfolio.type}
                  </span>
                </div>
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

              <div className="pt-3 border-t flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {portfolio.positionsCount || 0} posizioni
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleEdit(portfolio, e)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Modifica portfolio"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(portfolio, e)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                    title="Elimina portfolio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            </Link>
          </div>
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
