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
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="section-subtitle">Execution log</p>
          <h1 className="section-title">Transazioni</h1>
        </div>
        <button
          onClick={() => setShowTransactionDialog(true)}
          disabled={!selectedPortfolioId}
          className="cta-button disabled:opacity-50"
        >
          Nuova transazione
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

      <div className="glass-panel p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/60">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/50 uppercase">
                  Data
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/50 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/50 uppercase">
                  Strumento
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-foreground/50 uppercase">
                  Quantità
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-foreground/50 uppercase">
                  Prezzo
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-foreground/50 uppercase">
                  Totale
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-foreground/50 uppercase">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions?.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-white/70 transition-colors">
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
                          tx.side === 'BUY' ? 'text-emerald-600' : 'text-rose-600'
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
                      <p className="text-xs text-foreground/60">
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
                        className="rounded-full bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 transition-colors"
                        title="Modifica"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx)}
                        disabled={deleteMutation.isPending}
                        className="rounded-full bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
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
            <ArrowRightLeft className="h-12 w-12 mx-auto text-foreground/30 mb-4" />
            <p className="text-foreground/60">
              Nessuna transazione disponibile
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
