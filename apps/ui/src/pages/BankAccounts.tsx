import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import {
  Plus,
  Wallet,
  CreditCard,
  PiggyBank,
  Banknote,
  TrendingUp,
  Edit,
  Trash2,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Dialog } from '@/components/Dialog';

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Conto Corrente', icon: Wallet },
  { value: 'SAVINGS', label: 'Conto Risparmio', icon: PiggyBank },
  { value: 'CREDIT_CARD', label: 'Carta di Credito', icon: CreditCard },
  { value: 'CASH', label: 'Contanti', icon: Banknote },
  { value: 'INVESTMENT', label: 'Investimenti', icon: TrendingUp },
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD'];

const COLORS = [
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#EF4444', '#F97316',
  '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#2563EB',
];

interface AccountFormData {
  name: string;
  type: string;
  currency: string;
  initialBalance: number;
  color: string;
}

export function BankAccountsPage() {
  const userId = 'user_default';
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    type: 'CHECKING',
    currency: 'EUR',
    initialBalance: 0,
    color: COLORS[0],
  });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['bank-accounts', userId],
    queryFn: () => api.bankAccounts.list(userId),
  });

  const { data: totals } = useQuery({
    queryKey: ['bank-accounts-totals', userId],
    queryFn: () => api.bankAccounts.getTotals(userId),
  });

  const { data: balanceHistory } = useQuery({
    queryKey: ['balance-history', selectedAccount],
    queryFn: () => selectedAccount ? api.bankAccounts.getBalanceHistory(selectedAccount, 30) : null,
    enabled: !!selectedAccount,
  });

  const createAccount = useMutation({
    mutationFn: (data: AccountFormData) => api.bankAccounts.create({ ...data, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateAccount = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AccountFormData> }) =>
      api.bankAccounts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setEditingAccount(null);
      resetForm();
    },
  });

  const deleteAccount = useMutation({
    mutationFn: (id: string) => api.bankAccounts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });

  const recalculateBalance = useMutation({
    mutationFn: (id: string) => api.bankAccounts.recalculateBalance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'CHECKING',
      currency: 'EUR',
      initialBalance: 0,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccount) {
      updateAccount.mutate({ id: editingAccount.id, data: formData });
    } else {
      createAccount.mutate(formData);
    }
  };

  const openEditDialog = (account: any) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      currency: account.currency,
      initialBalance: account.initialBalance,
      color: account.color || COLORS[0],
    });
  };

  const formatCurrency = (value: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const getAccountIcon = (type: string) => {
    const accountType = ACCOUNT_TYPES.find(t => t.value === type);
    return accountType?.icon || Wallet;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Conti Bancari</h1>
          <p className="text-muted-foreground">
            Gestisci i tuoi conti e monitora i saldi
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Conto
        </button>
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Saldo Totale</p>
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(totals.totalBalance)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Conti Attivi</p>
            <p className="mt-2 text-2xl font-bold">{totals.activeAccounts}</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Valute</p>
            <p className="mt-2 text-2xl font-bold">{totals.currencies?.length || 1}</p>
          </div>
        </div>
      )}

      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts?.map((account: any) => {
          const Icon = getAccountIcon(account.type);
          return (
            <div
              key={account.id}
              className={`rounded-lg border bg-card p-6 cursor-pointer transition-all hover:shadow-md ${
                selectedAccount === account.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedAccount(selectedAccount === account.id ? null : account.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: account.color || '#6366F1' }}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ACCOUNT_TYPES.find(t => t.value === account.type)?.label}
                    </p>
                  </div>
                </div>
                <div className="relative group">
                  <button className="p-1 rounded hover:bg-muted">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  <div className="absolute right-0 mt-1 w-36 bg-popover border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(account);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Modifica
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        recalculateBalance.mutate(account.id);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Ricalcola
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Sei sicuro di voler eliminare questo conto?')) {
                          deleteAccount.mutate(account.id);
                        }
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                      Elimina
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className={`text-2xl font-bold ${account.currentBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(account.currentBalance, account.currency)}
                </p>
                {account.currency !== 'EUR' && (
                  <p className="text-xs text-muted-foreground">
                    ~ {formatCurrency(account.currentBalance * 1)} EUR
                  </p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between text-xs text-muted-foreground">
                <span>Saldo iniziale: {formatCurrency(account.initialBalance, account.currency)}</span>
              </div>
            </div>
          );
        })}

        {/* Add Account Card */}
        <button
          onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}
          className="rounded-lg border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-muted/50 transition-colors min-h-[200px]"
        >
          <Plus className="h-8 w-8 text-muted-foreground" />
          <span className="text-muted-foreground">Aggiungi Conto</span>
        </button>
      </div>

      {/* Balance History Chart */}
      {selectedAccount && balanceHistory?.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Storico Saldo</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={balanceHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `€${value.toFixed(0)}`} />
              <Tooltip
                formatter={(value: any) => formatCurrency(value)}
                labelFormatter={(label) => new Date(label).toLocaleDateString('it-IT')}
              />
              <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={!!(showCreateDialog || editingAccount)}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingAccount(null);
          resetForm();
        }}
        title={editingAccount ? 'Modifica Conto' : 'Nuovo Conto'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full"
              placeholder="es. Conto Principale"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="aurora-select w-full"
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Valuta</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="aurora-select w-full"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Saldo Iniziale</label>
              <input
                type="number"
                step="0.01"
                value={formData.initialBalance}
                onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Colore</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full ${formData.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingAccount(null);
                resetForm();
              }}
              className="flex-1 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-white"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="cta-button flex-1"
              disabled={createAccount.isPending || updateAccount.isPending}
            >
              {createAccount.isPending || updateAccount.isPending ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
