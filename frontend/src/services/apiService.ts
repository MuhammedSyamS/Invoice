import type {
  Invoice,
  Bill,
  Client,
  Product,
  Category,
  Payment,
  Expense,
  BusinessSettings,
} from '../types/invoice';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const getUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE ? `${API_BASE}${cleanEndpoint}` : cleanEndpoint;
};

const safeFetch = async (endpoint: string, options?: RequestInit) => {
  try {
    const res = await fetch(getUrl(endpoint), {
      headers: {
        'Content-Type': 'application/json',
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
          error: 'Your account is pending approval by the Workspace Owner.',
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
  getCloudData: async () => {
    return safeFetch('/api/sync');
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
  deleteInvoice: async (id: string) =>
    safeFetch(`/api/invoices/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Bills
  getBills: async () => safeFetch('/api/bills'),
  saveBill: async (bill: Bill) =>
    safeFetch('/api/bills', {
      method: 'POST',
      body: JSON.stringify(bill),
    }),
  deleteBill: async (id: string) =>
    safeFetch(`/api/bills/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Clients
  getClients: async () => safeFetch('/api/clients'),
  saveClient: async (client: Client) =>
    safeFetch('/api/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    }),
  deleteClient: async (id: string) =>
    safeFetch(`/api/clients/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Products
  getProducts: async () => safeFetch('/api/products'),
  saveProduct: async (product: Product) =>
    safeFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),
  deleteProduct: async (id: string) =>
    safeFetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Categories
  getCategories: async () => safeFetch('/api/categories'),
  saveCategory: async (category: Category) =>
    safeFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    }),
  deleteCategory: async (id: string) =>
    safeFetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Payments
  getPayments: async () => safeFetch('/api/payments'),
  savePayment: async (payment: Payment) =>
    safeFetch('/api/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    }),
  deletePayment: async (id: string) =>
    safeFetch(`/api/payments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Expenses
  getExpenses: async () => safeFetch('/api/expenses'),
  saveExpense: async (expense: Expense) =>
    safeFetch('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    }),
  deleteExpense: async (id: string) =>
    safeFetch(`/api/expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Settings
  getSettings: async () => safeFetch('/api/settings'),
  saveSettings: async (settings: BusinessSettings) =>
    safeFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Users & Authentication (MongoDB backend)
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
  deleteUser: async (id: string) =>
    safeFetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};
