const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  health: {
    check: () => fetchApi<{ status: string; database: string }>('/health'),
  },

  ips: {
    getPolicy: (userId: string) => fetchApi(`/ips?userId=${userId}`),
    getActiveVersion: (userId: string) => fetchApi(`/ips/active?userId=${userId}`),
    createPolicy: (data: { userId: string; config: any }) =>
      fetchApi('/ips', { method: 'POST', body: JSON.stringify(data) }),
    createVersion: (data: { userId: string; config: any; notes?: string }) =>
      fetchApi('/ips/versions', { method: 'POST', body: JSON.stringify(data) }),
    activateVersion: (versionId: string) =>
      fetchApi(`/ips/activate/${versionId}`, { method: 'POST' }),
    updateVersion: (versionId: string, data: { config: any }) =>
      fetchApi(`/ips/versions/${versionId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteVersion: (versionId: string) =>
      fetchApi(`/ips/versions/${versionId}`, { method: 'DELETE' }),
  },

  portfolios: {
    list: (userId: string) => fetchApi(`/portfolios?userId=${userId}`),
    get: (id: string) => fetchApi(`/portfolios/${id}`),
    getSnapshots: (id: string, limit?: number) =>
      fetchApi(`/portfolios/${id}/snapshots?limit=${limit || 30}`),
    create: (data: { userId?: string; name: string; type?: string }) =>
      fetchApi('/portfolios', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; type?: string }) =>
      fetchApi(`/portfolios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/portfolios/${id}`, { method: 'DELETE' }),
    createSnapshot: (id: string) =>
      fetchApi(`/portfolios/${id}/snapshots`, { method: 'POST' }),
  },

  transactions: {
    list: (portfolioId: string, limit?: number) =>
      fetchApi(`/portfolios/${portfolioId}/transactions?limit=${limit || 50}`),
    create: (portfolioId: string, data: any) =>
      fetchApi(`/portfolios/${portfolioId}/transactions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (portfolioId: string, id: string, data: any) =>
      fetchApi(`/portfolios/${portfolioId}/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (portfolioId: string, id: string) =>
      fetchApi(`/portfolios/${portfolioId}/transactions/${id}`, {
        method: 'DELETE',
      }),
  },

  engine: {
    enqueueRun: (data: { userId: string; type: 'scoring' | 'pac' | 'full' }) =>
      fetchApi('/engine/run', { method: 'POST', body: JSON.stringify(data) }),
    getRunStatus: (runId: string) => fetchApi(`/engine/runs/${runId}`),
    listRuns: (userId: string, limit?: number) =>
      fetchApi(`/engine/runs?userId=${userId}&limit=${limit || 20}`),
  },

  alerts: {
    list: (userId: string, acknowledged?: boolean) =>
      fetchApi(`/alerts?userId=${userId}${acknowledged !== undefined ? `&acknowledged=${acknowledged}` : ''}`),
    get: (id: string) => fetchApi(`/alerts/${id}`),
    dismiss: (id: string) => fetchApi(`/alerts/${id}/dismiss`, { method: 'POST' }),
    resolve: (id: string) => fetchApi(`/alerts/${id}/resolve`, { method: 'POST' }),
    create: (data: any) =>
      fetchApi('/alerts', { method: 'POST', body: JSON.stringify(data) }),
  },

  instruments: {
    list: (type?: string, limit?: number) =>
      fetchApi(`/instruments?${type ? `type=${type}&` : ''}limit=${limit || 100}`),
    search: (query: string, type?: string) =>
      fetchApi(`/instruments/search?q=${query}${type ? `&type=${type}` : ''}`),
    get: (id: string) => fetchApi(`/instruments/${id}`),
    create: (data: any) =>
      fetchApi('/instruments', { method: 'POST', body: JSON.stringify(data) }),
    updatePrices: (id: string, prices: any[]) =>
      fetchApi(`/instruments/${id}/prices`, {
        method: 'POST',
        body: JSON.stringify({ prices }),
      }),
  },

  prices: {
    fetchForInstrument: (instrumentId: string, days?: number) =>
      fetchApi(`/prices/instrument/${instrumentId}?${days ? `days=${days}` : ''}`, {
        method: 'POST',
      }),
    fetchFromFinnhub: (instrumentId: string) =>
      fetchApi(`/prices/finnhub/instrument/${instrumentId}`, {
        method: 'POST',
      }),
    fetchFromYahoo: (instrumentId: string) =>
      fetchApi(`/prices/yahoo/instrument/${instrumentId}`, {
        method: 'POST',
      }),
    searchYahooSymbols: (query: string) =>
      fetchApi<Array<{
        symbol: string;
        name: string;
        exchange: string;
        price?: number;
        currency?: string;
        isin?: string;
      }>>(`/prices/yahoo/search/${encodeURIComponent(query)}`),
    updateAll: (days?: number) =>
      fetchApi(`/prices/update-all?${days ? `days=${days}` : ''}`, {
        method: 'POST',
      }),
    queueUpdateAll: (days?: number) =>
      fetchApi(`/prices/queue/update-all?${days ? `days=${days}` : ''}`, {
        method: 'POST',
      }),
    queueForInstrument: (instrumentId: string, days?: number) =>
      fetchApi(`/prices/queue/instrument/${instrumentId}?${days ? `days=${days}` : ''}`, {
        method: 'POST',
      }),
    getLatestPrice: (instrumentId: string) =>
      fetchApi<{ priceEur: number; priceOriginal: number | null; currency: string } | null>(`/prices/instrument/${instrumentId}/latest`),
    getPriceHistory: (instrumentId: string, days?: number) =>
      fetchApi<Array<{
        date: string;
        price: number;
        priceOriginal: number | null;
        currency: string;
        open: number | null;
        high: number | null;
        low: number | null;
        volume: number | null;
      }>>(`/prices/instrument/${instrumentId}/history${days ? `?days=${days}` : ''}`),
    getJobsStatus: () => fetchApi('/prices/jobs/status'),
  },

  // Personal Finance APIs
  bankAccounts: {
    list: (userId: string = 'user_default') =>
      fetchApi(`/bank-accounts?userId=${userId}`),
    get: (id: string) => fetchApi(`/bank-accounts/${id}`),
    create: (data: {
      name: string;
      type: string;
      currency?: string;
      initialBalance?: number;
      color?: string;
      icon?: string;
      userId?: string;
    }) =>
      fetchApi('/bank-accounts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      fetchApi(`/bank-accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/bank-accounts/${id}`, { method: 'DELETE' }),
    getTotals: (userId: string = 'user_default') =>
      fetchApi(`/bank-accounts/totals?userId=${userId}`),
    getBalanceHistory: (id: string, days?: number) =>
      fetchApi(`/bank-accounts/${id}/balance-history${days ? `?days=${days}` : ''}`),
    recalculateBalance: (id: string) =>
      fetchApi(`/bank-accounts/${id}/recalculate`, { method: 'POST' }),
  },

  expenseCategories: {
    list: (userId: string = 'user_default', includeSystem: boolean = true) =>
      fetchApi(`/expense-categories?userId=${userId}&includeSystem=${includeSystem}`),
    get: (id: string) => fetchApi(`/expense-categories/${id}`),
    create: (data: {
      name: string;
      nameIt: string;
      icon: string;
      color: string;
      parentId?: string;
      userId?: string;
    }) =>
      fetchApi('/expense-categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      fetchApi(`/expense-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/expense-categories/${id}`, { method: 'DELETE' }),
  },

  personalTransactions: {
    list: (params: {
      userId?: string;
      accountId?: string;
      type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
      categoryId?: string;
      merchant?: string;
      minAmount?: number;
      maxAmount?: number;
      startDate?: string;
      endDate?: string;
      uncategorized?: boolean;
      page?: number;
      pageSize?: number;
    } = {}) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
      if (!params.userId) searchParams.set('userId', 'user_default');
      return fetchApi(`/personal-transactions?${searchParams.toString()}`);
    },
    get: (id: string) => fetchApi(`/personal-transactions/${id}`),
    create: (data: {
      accountId: string;
      type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
      amount: number;
      currency?: string;
      categoryId?: string;
      merchant?: string;
      description?: string;
      note?: string;
      transactionDate?: string;
      userId?: string;
    }) =>
      fetchApi('/personal-transactions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      fetchApi(`/personal-transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/personal-transactions/${id}`, { method: 'DELETE' }),
    createTransfer: (data: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      currency?: string;
      description?: string;
      transactionDate?: string;
      userId?: string;
    }) =>
      fetchApi('/personal-transactions/transfer', { method: 'POST', body: JSON.stringify(data) }),
    bulkCategorize: (transactionIds: string[], categoryId: string) =>
      fetchApi('/personal-transactions/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({ transactionIds, categoryId }),
      }),
    bulkDelete: (transactionIds: string[]) =>
      fetchApi('/personal-transactions/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ transactionIds }),
      }),
    getUncategorizedCount: (userId: string = 'user_default') =>
      fetchApi<{ count: number }>(`/personal-transactions/uncategorized-count?userId=${userId}`),
  },

  import: {
    detectColumns: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return fetch(`${API_BASE}/personal-transactions/import/detect-columns`, {
        method: 'POST',
        body: formData,
      }).then(res => res.json());
    },
    preview: (file: File, accountId: string, mapping: any) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accountId', accountId);
      formData.append('mapping', JSON.stringify(mapping));
      return fetch(`${API_BASE}/personal-transactions/import/preview`, {
        method: 'POST',
        body: formData,
      }).then(res => res.json());
    },
    execute: (file: File, accountId: string, mapping: any, userId: string = 'user_default') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('accountId', accountId);
      formData.append('mapping', JSON.stringify(mapping));
      return fetch(`${API_BASE}/personal-transactions/import/execute`, {
        method: 'POST',
        body: formData,
      }).then(res => res.json());
    },
    getHistory: (userId: string = 'user_default') =>
      fetchApi(`/personal-transactions/import/history?userId=${userId}`),
  },

  llmAdvisor: {
    getStatus: () => fetchApi('/llm-advisor/status'),
    categorize: (data: {
      merchant?: string;
      description?: string;
      amount: number;
      userId?: string;
    }) =>
      fetchApi('/llm-advisor/categorize', { method: 'POST', body: JSON.stringify(data) }),
    categorizeBatch: (transactions: Array<{
      id: string;
      merchant?: string;
      description?: string;
      amount: number;
    }>, userId: string = 'user_default') =>
      fetchApi('/llm-advisor/categorize-batch', {
        method: 'POST',
        body: JSON.stringify({ transactions, userId }),
      }),
    analyzeSpending: (userId: string = 'user_default', months: number = 3) =>
      fetchApi('/llm-advisor/analyze-spending', {
        method: 'POST',
        body: JSON.stringify({ userId, months }),
      }),
    getSavingOpportunities: (userId: string = 'user_default') =>
      fetchApi(`/llm-advisor/saving-opportunities?userId=${userId}`),
    evaluatePurchase: (data: {
      description: string;
      amount: number;
      isRecurring?: boolean;
      recurringMonths?: number;
      installments?: number;
      urgency?: 'low' | 'medium' | 'high';
      userId?: string;
    }) =>
      fetchApi('/llm-advisor/evaluate-purchase', { method: 'POST', body: JSON.stringify(data) }),
    suggestInstallments: (amount: number, maxMonths: number = 24, userId: string = 'user_default') =>
      fetchApi('/llm-advisor/suggest-installments', {
        method: 'POST',
        body: JSON.stringify({ amount, maxMonths, userId }),
      }),
    getFinancialContext: (userId: string = 'user_default') =>
      fetchApi(`/llm-advisor/financial-context?userId=${userId}`),
    getInsights: (userId: string = 'user_default') =>
      fetchApi(`/llm-advisor/insights?userId=${userId}`),
  },

  personalFinance: {
    getKpis: (userId: string = 'user_default', startDate?: string, endDate?: string) => {
      const params = new URLSearchParams({ userId });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      return fetchApi(`/personal-finance/kpis?${params.toString()}`);
    },
    getBalanceTrend: (userId: string = 'user_default', days: number = 30) =>
      fetchApi(`/personal-finance/balance-trend?userId=${userId}&days=${days}`),
    getCategoryBreakdown: (userId: string = 'user_default', startDate?: string, endDate?: string) => {
      const params = new URLSearchParams({ userId });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      return fetchApi(`/personal-finance/category-breakdown?${params.toString()}`);
    },
    getIncomeVsExpenses: (userId: string = 'user_default', months: number = 6) =>
      fetchApi(`/personal-finance/income-vs-expenses?userId=${userId}&months=${months}`),
    getAlerts: (userId: string = 'user_default') =>
      fetchApi(`/personal-finance/alerts?userId=${userId}`),
    acknowledgeAlert: (alertId: string) =>
      fetchApi(`/personal-finance/alerts/${alertId}/acknowledge`, { method: 'POST' }),
  },
};
