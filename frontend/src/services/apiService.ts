import type {
  Invoice,
  Bill,
  Client,
  Product,
  Category,
  Payment,
  Expense,
  BusinessSettings,
  Quote,
  RecurringTemplate,
} from '../types/invoice';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const getUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE ? `${API_BASE}${cleanEndpoint}` : cleanEndpoint;
};

const getAuthHeaders = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem('highphaus_auth_user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user && user.email) {
        return {
          'x-user-email': user.email,
          'x-user-role': user.role || 'Admin',
          'x-user-name': user.name || 'User',
          Authorization: `Bearer ${user.email}`,
        };
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return {};
};

const safeFetch = async (endpoint: string, options?: RequestInit) => {
  try {
    const authHeaders = getAuthHeaders();
    const res = await fetch(getUrl(endpoint), {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      ...options,
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // Non-JSON response
    }

    if (!res.ok) {
      const serverMessage = data && (data.error || data.message);
      if (serverMessage) {
        return { success: false, error: serverMessage, status: data?.status || res.status };
      }

      if (res.status === 404) {
        return {
          success: false,
          error: 'No account found with this email address or service is updating. Please check your credentials.',
          status: 404,
        };
      }
      if (res.status === 401) {
        return { success: false, error: 'Incorrect password entered. Please try again.', status: 401 };
      }
      if (res.status === 409) {
        return {
          success: false,
          error: 'An account with this email is already registered. Please sign in instead.',
          status: 409,
        };
      }
      if (res.status === 403) {
        return {
          success: false,
          error: 'Access denied: Operation requires explicit authorization by Workspace Owner.',
          status: 403,
        };
      }
      return { success: false, error: 'Server communication error. Please try again.', status: res.status };
    }

    return data || { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network connection failed' };
  }
};

export const apiService = {
  // Health
  checkHealth: async () => {
    return safeFetch('/api/health');
  },

  // Full Database Sync
  getCloudData: async (includeDeleted = false) => {
    return safeFetch(`/api/sync${includeDeleted ? '?includeDeleted=true' : ''}`);
  },

  seedCloudData: async (payload: {
    invoices?: Invoice[];
    bills?: Bill[];
    clients?: Client[];
    products?: Product[];
    categories?: Category[];
    payments?: Payment[];
    expenses?: Expense[];
    settings?: BusinessSettings;
    quotes?: Quote[];
    recurring?: RecurringTemplate[];
  }) => {
    return safeFetch('/api/sync/seed', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Invoices
  getInvoices: async () => safeFetch('/api/invoices'),
  saveInvoice: async (invoice: Invoice) =>
    safeFetch('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    }),
  deleteInvoice: async (id: string, reason?: string) =>
    safeFetch(`/api/invoices/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  restoreInvoice: async (id: string) =>
    safeFetch(`/api/invoices/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    }),

  // Bills
  getBills: async () => safeFetch('/api/bills'),
  saveBill: async (bill: Bill) =>
    safeFetch('/api/bills', {
      method: 'POST',
      body: JSON.stringify(bill),
    }),
  deleteBill: async (id: string, reason?: string) =>
    safeFetch(`/api/bills/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  restoreBill: async (id: string) =>
    safeFetch(`/api/bills/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    }),

  // Clients
  getClients: async () => safeFetch('/api/clients'),
  saveClient: async (client: Client) =>
    safeFetch('/api/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    }),
  deleteClient: async (id: string, reason?: string) =>
    safeFetch(`/api/clients/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  restoreClient: async (id: string) =>
    safeFetch(`/api/clients/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    }),

  // Products
  getProducts: async () => safeFetch('/api/products'),
  saveProduct: async (product: Product) =>
    safeFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),
  deleteProduct: async (id: string, reason?: string) =>
    safeFetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  restoreProduct: async (id: string) =>
    safeFetch(`/api/products/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    }),

  // Categories
  getCategories: async () => safeFetch('/api/categories'),
  saveCategory: async (category: Category) =>
    safeFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    }),
  deleteCategory: async (id: string, reason?: string) =>
    safeFetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  restoreCategory: async (id: string) =>
    safeFetch(`/api/categories/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    }),

  // Payments
  getPayments: async () => safeFetch('/api/payments'),
  savePayment: async (payment: Payment) =>
    safeFetch('/api/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    }),
  deletePayment: async (id: string, reason?: string) =>
    safeFetch(`/api/payments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  restorePayment: async (id: string) =>
    safeFetch(`/api/payments/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    }),

  // Expenses
  getExpenses: async () => safeFetch('/api/expenses'),
  saveExpense: async (expense: Expense) =>
    safeFetch('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    }),
  deleteExpense: async (id: string, reason?: string) =>
    safeFetch(`/api/expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  restoreExpense: async (id: string) =>
    safeFetch(`/api/expenses/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    }),

  // Settings
  getSettings: async () => safeFetch('/api/settings'),
  saveSettings: async (settings: BusinessSettings) =>
    safeFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),

  // Quotes
  getQuotes: async () => safeFetch('/api/quotes'),
  saveQuote: async (quote: Quote) =>
    safeFetch('/api/quotes', {
      method: 'POST',
      body: JSON.stringify(quote),
    }),
  deleteQuote: async (id: string, reason?: string) =>
    safeFetch(`/api/quotes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  restoreQuote: async (id: string) =>
    safeFetch(`/api/quotes/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    }),

  // Recurring Templates
  getRecurring: async () => safeFetch('/api/recurring'),
  saveRecurring: async (item: RecurringTemplate) =>
    safeFetch('/api/recurring', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  deleteRecurring: async (id: string, reason?: string) =>
    safeFetch(`/api/recurring/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  restoreRecurring: async (id: string) =>
    safeFetch(`/api/recurring/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    }),

  // Users & Authentication
  loginUser: async (credentials: { email: string; password: string }) =>
    safeFetch('/api/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  registerUser: async (data: { name: string; email: string; password: string; role?: string }) =>
    safeFetch('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getUsers: async () => safeFetch('/api/users'),
  approveUser: async (id: string, approvedBy?: string) =>
    safeFetch(`/api/users/${encodeURIComponent(id)}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ approvedBy }),
    }),
  rejectUser: async (id: string, rejectedBy?: string, reason?: string) =>
    safeFetch(`/api/users/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejectedBy, reason }),
    }),
  deleteUser: async (id: string, reason?: string) =>
    safeFetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  restoreUser: async (id: string) =>
    safeFetch(`/api/users/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    }),

  // Enterprise Approvals & Destruction Two-Step Workflow
  getApprovals: async (status?: string) =>
    safeFetch(`/api/approvals${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  requestDestruction: async (payload: {
    operation: string;
    entityType: string;
    targetIds: string[];
    targetIdentifiers?: string[];
    reason: string;
    impactSummary?: string;
  }) =>
    safeFetch('/api/approvals/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  approveDestruction: async (id: string, payload?: { approvalReason?: string; allowSelfApprovalOverride?: boolean }) =>
    safeFetch(`/api/approvals/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  rejectDestruction: async (id: string, payload?: { rejectionReason?: string }) =>
    safeFetch(`/api/approvals/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  executeDestruction: async (id: string) =>
    safeFetch(`/api/approvals/${encodeURIComponent(id)}/execute`, {
      method: 'POST',
    }),

  // Tamper-Resistant Audit Trail
  getAuditLogs: async (query?: { action?: string; entityType?: string; status?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (query?.action) params.set('action', query.action);
    if (query?.entityType) params.set('entityType', query.entityType);
    if (query?.status) params.set('status', query.status);
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return safeFetch(`/api/audit-logs${qs ? `?${qs}` : ''}`);
  },
};
