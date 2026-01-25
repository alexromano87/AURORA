import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowRightLeft, ArrowUpCircle, ArrowDownCircle, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CreateTransactionDialog } from '@/components/CreateTransactionDialog';
import { EditTransactionDialog } from '@/components/EditTransactionDialog';

export function TransactionsPage() {
  const userId = 'user_default';
  const queryClient = useQueryClient();
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const { data: portfolios } = useQuery({
    queryKey: ['portfolios', userId],
    queryFn: () => api.portfolios.list(userId),
  });

  const selectedPortfolioId = portfolios?.[0]?.id;

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', selectedPortfolioId],
    queryFn: () =>
      selectedPortfolioId
        ? api.transactions.list(selectedPortfolioId, 100)
        : Promise.resolve([]),
    enabled: !!selectedPortfolioId,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ portfolioId, transactionId }: { portfolioId: string; transactionId: string }) =>
      api.transactions.delete(portfolioId, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', selectedPortfolioId] });
    },
  });

  const handleDelete = (transaction: any) => {
    if (confirm(`Sei sicuro di voler eliminare questa transazione?\n\n${transaction.side} ${transaction.quantity} ${transaction.instrument?.ticker || ''} a €${transaction.priceEur.toFixed(2)}`)) {
      deleteMutation.mutate({
        portfolioId: selectedPortfolioId!,
        transactionId: transaction.id,
      });
    }
  };

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transazioni</h1>
          <p className="text-muted-foreground">
            Storico completo delle operazioni
          </p>
        </div>
        <button
          onClick={() => setShowTransactionDialog(true)}
          disabled={!selectedPortfolioId}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          Nuova Transazione
        </button>
      </div>

      {selectedPortfolioId && (
        <>
          <CreateTransactionDialog
            open={showTransactionDialog}
            onClose={() => setShowTransactionDialog(false)}
            portfolioId={selectedPortfolioId}
          />
          {editingTransaction && (
            <EditTransactionDialog
              open={!!editingTransaction}
              onClose={() => setEditingTransaction(null)}
              portfolioId={selectedPortfolioId}
              transaction={editingTransaction}
            />
          )}
        </>
      )}

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Strumento
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                  Quantità
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                  Prezzo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                  Totale
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions?.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(tx.executedAt).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {tx.side === 'BUY' ? (
                        <ArrowDownCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          tx.side === 'BUY' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {tx.side}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium">
                        {tx.instrument?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.instrument?.ticker || ''}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    {parseFloat(tx.quantity).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    €{parseFloat(tx.priceEur).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    €{parseFloat(tx.totalEur).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEditingTransaction(tx)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Modifica"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="Elimina"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!transactions?.length && (
          <div className="text-center py-12">
            <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nessuna transazione disponibile
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
