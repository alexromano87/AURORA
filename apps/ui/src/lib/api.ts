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
};
