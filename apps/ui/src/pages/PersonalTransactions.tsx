import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Filter,
  Download,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Search,
  Check,
  X,
  Trash2,
  Tag,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Dialog } from '@/components/Dialog';

const TRANSACTION_TYPES = [
  { value: 'INCOME', label: 'Entrata', icon: ArrowUpRight, color: 'text-green-500' },
  { value: 'EXPENSE', label: 'Uscita', icon: ArrowDownRight, color: 'text-red-500' },
  { value: 'TRANSFER', label: 'Trasferimento', icon: ArrowLeftRight, color: 'text-blue-500' },
];

interface TransactionFormData {
  accountId: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  categoryId: string;
  merchant: string;
  description: string;
  note: string;
  transactionDate: string;
  toAccountId?: string;
}

export function PersonalTransactionsPage() {
  const userId = 'user_default';
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showBulkCategorize, setShowBulkCategorize] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    accountId: searchParams.get('accountId') || '',
    type: searchParams.get('type') || '',
    categoryId: searchParams.get('categoryId') || '',
    merchant: searchParams.get('merchant') || '',
    uncategorized: searchParams.get('uncategorized') === 'true',
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: 25,
  });

  const [formData, setFormData] = useState<TransactionFormData>({
    accountId: '',
    type: 'EXPENSE',
    amount: 0,
    categoryId: '',
    merchant: '',
    description: '',
    note: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState(0);
  const [detectedColumns, setDetectedColumns] = useState<any>(null);
  const [importMapping, setImportMapping] = useState<any>({
    dateColumn: '',
    amountColumn: '',
    descriptionColumn: '',
    dateFormat: 'DD/MM/YYYY',
    amountFormat: 'positive_negative',
  });
  const [importPreview, setImportPreview] = useState<any>(null);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['personal-transactions', userId, filters],
    queryFn: () => api.personalTransactions.list({
      userId,
      ...filters,
      accountId: filters.accountId || undefined,
      type: filters.type as any || undefined,
      categoryId: filters.categoryId || undefined,
      merchant: filters.merchant || undefined,
    }),
  });

  const { data: accounts } = useQuery({
    queryKey: ['bank-accounts', userId],
    queryFn: () => api.bankAccounts.list(userId),
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories', userId],
    queryFn: () => api.expenseCategories.list(userId),
  });

  const createTransaction = useMutation({
    mutationFn: (data: any) => {
      if (data.type === 'TRANSFER' && data.toAccountId) {
        return api.personalTransactions.createTransfer({
          fromAccountId: data.accountId,
          toAccountId: data.toAccountId,
          amount: data.amount,
          description: data.description,
          transactionDate: data.transactionDate,
          userId,
        });
      }
      return api.personalTransactions.create({ ...data, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateTransaction = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.personalTransactions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-transactions'] });
      setEditingTransaction(null);
      resetForm();
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: (id: string) => api.personalTransactions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });

  const bulkCategorize = useMutation({
    mutationFn: ({ ids, categoryId }: { ids: string[]; categoryId: string }) =>
      api.personalTransactions.bulkCategorize(ids, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-transactions'] });
      setSelectedTransactions([]);
      setShowBulkCategorize(false);
    },
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => api.personalTransactions.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setSelectedTransactions([]);
    },
  });

  const autoCategorize = useMutation({
    mutationFn: () => {
      const uncategorizedTxs = transactions?.items?.filter((t: any) => !t.categoryId) || [];
      if (uncategorizedTxs.length === 0) return Promise.resolve([]);
      return api.llmAdvisor.categorizeBatch(
        uncategorizedTxs.slice(0, 20).map((t: any) => ({
          id: t.id,
          merchant: t.merchant,
          description: t.description,
          amount: t.amount,
        })),
        userId
      );
    },
    onSuccess: (results: any[]) => {
      if (results?.length > 0) {
        results.forEach((result: any) => {
          if (result.categoryId && result.transactionId) {
            api.personalTransactions.update(result.transactionId, {
              categoryId: result.categoryId,
            });
          }
        });
        queryClient.invalidateQueries({ queryKey: ['personal-transactions'] });
      }
    },
  });

  const resetForm = () => {
    setFormData({
      accountId: accounts?.[0]?.id || '',
      type: 'EXPENSE',
      amount: 0,
      categoryId: '',
      merchant: '',
      description: '',
      note: '',
      transactionDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTransaction) {
      updateTransaction.mutate({ id: editingTransaction.id, data: formData });
    } else {
      createTransaction.mutate(formData);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    try {
      const columns = await api.import.detectColumns(file);
      setDetectedColumns(columns);
      setImportMapping({
        ...importMapping,
        dateColumn: columns.suggestedMapping?.dateColumn || columns.columns[0],
        amountColumn: columns.suggestedMapping?.amountColumn || columns.columns[1],
        descriptionColumn: columns.suggestedMapping?.descriptionColumn || columns.columns[2],
      });
      setImportStep(1);
    } catch (error) {
      console.error('Failed to detect columns:', error);
    }
  };

  const handleImportPreview = async () => {
    if (!importFile || !formData.accountId) return;
    try {
      const preview = await api.import.preview(importFile, formData.accountId, importMapping);
      setImportPreview(preview);
      setImportStep(2);
    } catch (error) {
      console.error('Failed to preview import:', error);
    }
  };

  const handleImportExecute = async () => {
    if (!importFile || !formData.accountId) return;
    try {
      await api.import.execute(importFile, formData.accountId, importMapping, userId);
      queryClient.invalidateQueries({ queryKey: ['personal-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setShowImportDialog(false);
      setImportStep(0);
      setImportFile(null);
      setDetectedColumns(null);
      setImportPreview(null);
    } catch (error) {
      console.error('Failed to execute import:', error);
    }
  };

  const formatCurrency = (value: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const toggleSelectAll = () => {
    if (selectedTransactions.length === transactions?.items?.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(transactions?.items?.map((t: any) => t.id) || []);
    }
  };

  const incomeCategories = useMemo(() =>
    categories?.filter((c: any) => ['salary', 'freelance', 'investments', 'other_income'].includes(c.name)) || [],
    [categories]
  );

  const expenseCategories = useMemo(() =>
    categories?.filter((c: any) => !['salary', 'freelance', 'investments', 'other_income'].includes(c.name)) || [],
    [categories]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Transazioni</h1>
          <p className="text-muted-foreground">
            Gestisci le tue entrate e uscite
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportDialog(true)}
            className="inline-flex items-center px-4 py-2 rounded-lg border hover:bg-accent"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importa
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuova Transazione
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca per merchant..."
                value={filters.merchant}
                onChange={(e) => setFilters({ ...filters, merchant: e.target.value, page: 1 })}
                className="w-full pl-10 pr-3 py-2 border rounded-lg bg-background"
              />
            </div>
          </div>
          <select
            value={filters.accountId}
            onChange={(e) => setFilters({ ...filters, accountId: e.target.value, page: 1 })}
            className="aurora-select"
          >
            <option value="">Tutti i conti</option>
            {accounts?.map((account: any) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
            className="aurora-select"
          >
            <option value="">Tutti i tipi</option>
            {TRANSACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value, page: 1 })}
            className="aurora-select"
          >
            <option value="">Tutte le categorie</option>
            {categories?.map((category: any) => (
              <option key={category.id} value={category.id}>{category.nameIt}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted">
            <input
              type="checkbox"
              checked={filters.uncategorized}
              onChange={(e) => setFilters({ ...filters, uncategorized: e.target.checked, page: 1 })}
              className="rounded"
            />
            <span className="text-sm">Non categorizzate</span>
          </label>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTransactions.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedTransactions.length} transazioni selezionate
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => autoCategorize.mutate()}
              disabled={autoCategorize.isPending}
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border hover:bg-background"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Auto-categorizza
            </button>
            <button
              onClick={() => setShowBulkCategorize(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border hover:bg-background"
            >
              <Tag className="h-4 w-4 mr-1" />
              Categorizza
            </button>
            <button
              onClick={() => {
                if (confirm(`Eliminare ${selectedTransactions.length} transazioni?`)) {
                  bulkDelete.mutate(selectedTransactions);
                }
              }}
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Elimina
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedTransactions.length === transactions?.items?.length && transactions?.items?.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Descrizione</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Categoria</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Conto</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Importo</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions?.items?.map((transaction: any) => {
              const TypeIcon = TRANSACTION_TYPES.find(t => t.value === transaction.type)?.icon || ArrowDownRight;
              const typeColor = TRANSACTION_TYPES.find(t => t.value === transaction.type)?.color || 'text-gray-500';
              const category = categories?.find((c: any) => c.id === transaction.categoryId);
              const account = accounts?.find((a: any) => a.id === transaction.accountId);

              return (
                <tr key={transaction.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTransactions([...selectedTransactions, transaction.id]);
                        } else {
                          setSelectedTransactions(selectedTransactions.filter(id => id !== transaction.id));
                        }
                      }}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(transaction.transactionDate).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TypeIcon className={`h-4 w-4 ${typeColor}`} />
                      <div>
                        <p className="font-medium">{transaction.merchant || transaction.description || 'N/A'}</p>
                        {transaction.note && (
                          <p className="text-xs text-muted-foreground">{transaction.note}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {category ? (
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${category.color}20`, color: category.color }}
                      >
                        {category.nameIt}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Non categorizzata</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {account?.name || 'N/A'}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    transaction.type === 'INCOME' ? 'text-green-500' :
                    transaction.type === 'EXPENSE' ? 'text-red-500' : 'text-blue-500'
                  }`}>
                    {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : ''}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditingTransaction(transaction);
                        setFormData({
                          accountId: transaction.accountId,
                          type: transaction.type,
                          amount: transaction.amount,
                          categoryId: transaction.categoryId || '',
                          merchant: transaction.merchant || '',
                          description: transaction.description || '',
                          note: transaction.note || '',
                          transactionDate: new Date(transaction.transactionDate).toISOString().split('T')[0],
                        });
                      }}
                      className="p-1 rounded hover:bg-muted"
                    >
                      <Tag className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Eliminare questa transazione?')) {
                          deleteTransaction.mutate(transaction.id);
                        }
                      }}
                      className="p-1 rounded hover:bg-muted text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {transactions?.total > filters.pageSize && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Pagina {filters.page} di {Math.ceil(transactions.total / filters.pageSize)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                className="p-2 rounded border hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page >= Math.ceil(transactions.total / filters.pageSize)}
                className="p-2 rounded border hover:bg-muted disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={!!(showCreateDialog || editingTransaction)}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingTransaction(null);
          resetForm();
        }}
        title={editingTransaction ? 'Modifica Transazione' : 'Nuova Transazione'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <div className="flex gap-2">
                  {TRANSACTION_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.value as any })}
                        className={`flex-1 px-3 py-2 rounded-lg border flex items-center justify-center gap-2 ${
                          formData.type === type.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Conto</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="aurora-select w-full"
                  required
                >
                  <option value="">Seleziona conto...</option>
                  {accounts?.map((account: any) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>

              {formData.type === 'TRANSFER' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Conto Destinazione</label>
                  <select
                    value={formData.toAccountId || ''}
                    onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                    className="aurora-select w-full"
                    required
                  >
                    <option value="">Seleziona conto...</option>
                    {accounts?.filter((a: any) => a.id !== formData.accountId).map((account: any) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Importo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data</label>
                  <input
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    required
                  />
                </div>
              </div>

              {formData.type !== 'TRANSFER' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="aurora-select w-full"
                  >
                    <option value="">Seleziona categoria...</option>
                    {formData.type === 'INCOME' ? (
                      incomeCategories.map((category: any) => (
                        <option key={category.id} value={category.id}>{category.nameIt}</option>
                      ))
                    ) : (
                      expenseCategories.map((category: any) => (
                        <option key={category.id} value={category.id}>{category.nameIt}</option>
                      ))
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Merchant</label>
                <input
                  type="text"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  placeholder="es. Amazon, Esselunga..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Note</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingTransaction(null);
                    resetForm();
                  }}
                  className="flex-1 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-white"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="cta-button flex-1"
                  disabled={createTransaction.isPending || updateTransaction.isPending}
                >
                  {createTransaction.isPending || updateTransaction.isPending ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
        </form>
      </Dialog>

      {/* Bulk Categorize Dialog */}
      <Dialog
        open={showBulkCategorize}
        onClose={() => setShowBulkCategorize(false)}
        title="Categorizza Transazioni"
        maxWidth="md"
      >
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-foreground/60">
            Seleziona una categoria per {selectedTransactions.length} transazioni
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {categories?.map((category: any) => (
              <button
                key={category.id}
                onClick={() => bulkCategorize.mutate({ ids: selectedTransactions, categoryId: category.id })}
                className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-2 text-sm hover:bg-white flex items-center gap-3"
              >
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {category.nameIt}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowBulkCategorize(false)}
            className="w-full rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-white"
          >
            Annulla
          </button>
        </div>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={showImportDialog}
        onClose={() => {
          setShowImportDialog(false);
          setImportStep(0);
          setImportFile(null);
          setDetectedColumns(null);
          setImportPreview(null);
        }}
        title="Importa Transazioni"
        maxWidth="lg"
      >
        <div className="space-y-4 px-6 py-5">

            {/* Step indicators */}
            <div className="flex gap-2 mb-6">
              {['File', 'Mapping', 'Anteprima'].map((step, index) => (
                <div
                  key={step}
                  className={`flex-1 text-center py-2 rounded ${
                    importStep === index
                      ? 'bg-primary text-primary-foreground'
                      : importStep > index
                      ? 'bg-green-100 text-green-700'
                      : 'bg-muted'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>

            {importStep === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Conto</label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    className="aurora-select w-full"
                    required
                  >
                    <option value="">Seleziona conto...</option>
                    {accounts?.map((account: any) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">File CSV</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                  />
                </div>
              </div>
            )}

            {importStep === 1 && detectedColumns && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Colonne rilevate: {detectedColumns.columns.join(', ')}
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Colonna Data</label>
                  <select
                    value={importMapping.dateColumn}
                    onChange={(e) => setImportMapping({ ...importMapping, dateColumn: e.target.value })}
                    className="aurora-select w-full"
                  >
                    {detectedColumns.columns.map((col: string) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Colonna Importo</label>
                  <select
                    value={importMapping.amountColumn}
                    onChange={(e) => setImportMapping({ ...importMapping, amountColumn: e.target.value })}
                    className="aurora-select w-full"
                  >
                    {detectedColumns.columns.map((col: string) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Colonna Descrizione</label>
                  <select
                    value={importMapping.descriptionColumn}
                    onChange={(e) => setImportMapping({ ...importMapping, descriptionColumn: e.target.value })}
                    className="aurora-select w-full"
                  >
                    <option value="">Nessuna</option>
                    {detectedColumns.columns.map((col: string) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Formato Data</label>
                  <select
                    value={importMapping.dateFormat}
                    onChange={(e) => setImportMapping({ ...importMapping, dateFormat: e.target.value })}
                    className="aurora-select w-full"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <button
                  onClick={handleImportPreview}
                  className="cta-button w-full"
                >
                  Anteprima
                </button>
              </div>
            )}

            {importStep === 2 && importPreview && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <p className="text-2xl font-bold text-green-600">{importPreview.validRows}</p>
                    <p className="text-xs text-green-700">Valide</p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                    <p className="text-2xl font-bold text-yellow-600">{importPreview.duplicateRows}</p>
                    <p className="text-xs text-yellow-700">Duplicate</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                    <p className="text-2xl font-bold text-red-600">{importPreview.errorRows}</p>
                    <p className="text-xs text-red-700">Errori</p>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Data</th>
                        <th className="px-3 py-2 text-left">Descrizione</th>
                        <th className="px-3 py-2 text-right">Importo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {importPreview.sampleTransactions?.map((tx: any, i: number) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{new Date(tx.transactionDate).toLocaleDateString('it-IT')}</td>
                          <td className="px-3 py-2">{tx.description || tx.merchant}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(tx.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={handleImportExecute}
                  className="cta-button w-full"
                >
                  Importa {importPreview.validRows} Transazioni
                </button>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              {importStep > 0 && (
                <button
                  onClick={() => setImportStep(importStep - 1)}
                  className="flex-1 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-white"
                >
                  Indietro
                </button>
              )}
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportStep(0);
                  setImportFile(null);
                  setDetectedColumns(null);
                  setImportPreview(null);
                }}
                className="flex-1 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-white"
              >
                Annulla
              </button>
            </div>
        </div>
      </Dialog>
    </div>
  );
}
