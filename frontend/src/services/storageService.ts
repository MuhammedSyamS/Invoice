import type { Invoice, Client, Quote, RecurringTemplate, BusinessSettings } from '../types/invoice';

const STORAGE_KEYS = {
  INVOICES: 'highphaus_invoices_v11',
  CLIENTS: 'highphaus_clients_v11',
  QUOTES: 'highphaus_quotes_v11',
  RECURRING: 'highphaus_recurring_v11',
  SETTINGS: 'highphaus_settings_v11',
  THEME: 'highphaus_theme_v11',
  INITIALIZED: 'highphaus_initialized_v11',
};

export const DEFAULT_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham (AED)' },
];

export const getCurrencySymbol = (currencyCode?: string): string => {
  if (!currencyCode || currencyCode === 'INR') return '₹';
  const found = DEFAULT_CURRENCIES.find((c) => c.code === currencyCode);
  return found ? found.symbol : `${currencyCode} `;
};

/**
 * Converts numeric currency amount into words (Indian Numbering System: Lakhs & Crores)
 * Example: 209050 -> Rupees Two Lakh Nine Thousand Fifty Only
 */
export const numberToWordsINR = (num: number): string => {
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const convertTwoDigits = (n: number): string => {
    if (n < 20) return units[n];
    const t = Math.floor(n / 10);
    const r = n % 10;
    return `${tens[t]}${r > 0 ? ' ' + units[r] : ''}`;
  };

  const convertThreeDigits = (n: number): string => {
    const h = Math.floor(n / 100);
    const r = n % 100;
    let res = '';
    if (h > 0) res += `${units[h]} Hundred`;
    if (r > 0) res += (res ? ' ' : '') + convertTwoDigits(r);
    return res;
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let remaining = integerPart;
  let words = '';

  // Crores (>= 1,00,00,000)
  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    words += `${convertThreeDigits(crores)} Crore`;
    remaining %= 10000000;
  }

  // Lakhs (>= 1,00,000)
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    words += (words ? ' ' : '') + `${convertTwoDigits(lakhs)} Lakh`;
    remaining %= 100000;
  }

  // Thousands (>= 1,000)
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    words += (words ? ' ' : '') + `${convertTwoDigits(thousands)} Thousand`;
    remaining %= 1000;
  }

  // Hundreds & Tens
  if (remaining > 0) {
    words += (words ? ' ' : '') + convertThreeDigits(remaining);
  }

  let result = `Rupees ${words.trim()}`;

  if (decimalPart > 0) {
    result += ` and ${convertTwoDigits(decimalPart)} Paise`;
  }

  result += ' Only';
  return result;
};

/**
 * Generates invoice numbers using Year and Invoice Order Sequence: HPINV-YYYYNN
 * Example: HPINV-202601 (Year: 2026, Invoice #: 01)
 */
export const generateNextInvoiceNumber = (count: number = 0, dateStr?: string): string => {
  let year = '';
  if (dateStr && dateStr.includes('-')) {
    year = dateStr.slice(0, 4);
  }
  if (!year || year.length !== 4) {
    year = String(new Date().getFullYear());
  }

  const seq = String(count + 1).padStart(2, '0');
  return `HPINV-${year}${seq}`;
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  companyName: 'Highphaus',
  tagline: 'Creative Marketing Agency',
  logoText: 'HIGHPHAUS',
  showLogo: true,
  email: 'hello@highphaus.com',
  phone: '+91 98765 43210',
  website: 'www.highphaus.com',
  address: 'K.G Building, Kallara, Trivandrum, Kerala',
  pincode: '695608',
  taxId: 'GSTIN-27AAACH9042K1Z8',
  bankName: 'HDFC Bank Ltd',
  accountName: 'Highphaus Media Pvt Ltd',
  accountNumber: '50200049281094',
  ifscSwift: 'HDFC0000240',
  upiId: 'highphaus@hdfcbank',
  currency: 'INR',
  defaultTaxRate: 18,
  defaultPaymentTermsDays: 15,
  notesFooter: 'Thank you for partnering with Highphaus Creative Marketing Agency (www.highphaus.com). Payment is due as per contract terms.',
};

export const BLANK_SETTINGS: BusinessSettings = {
  companyName: '',
  tagline: '',
  logoText: '',
  logoUrl: '',
  showLogo: false,
  email: '',
  phone: '',
  website: '',
  address: '',
  pincode: '',
  taxId: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  ifscSwift: '',
  upiId: '',
  currency: 'INR',
  defaultTaxRate: 0,
  defaultPaymentTermsDays: 15,
  notesFooter: '',
};

const SEED_CLIENTS: Client[] = [
  {
    id: 'cli-001',
    name: 'Robert Sterling',
    company: 'Apex Apparel & Lifestyle',
    email: 'r.sterling@apexlifestyle.com',
    phone: '+91 98200 11223',
    address: '102 Fashion Avenue, Lower Parel, Mumbai, Maharashtra',
    city: 'Mumbai',
    country: 'India',
    pincode: '400013',
    taxId: 'GSTIN-27APXAP9042K1Z4',
    createdAt: '2026-01-10',
    notes: 'Monthly performance marketing account.',
  },
  {
    id: 'cli-002',
    name: 'Dr. Ananya Sharma',
    company: 'Nexus HealthTech',
    email: 'ananya@nexushealth.io',
    phone: '+91 98765 43210',
    address: 'Plot 45, Tech Park Phase II, Electronic City, Bengaluru, Karnataka',
    city: 'Bengaluru',
    country: 'India',
    pincode: '560100',
    taxId: 'GSTIN-29AAACH8821K1Z5',
    createdAt: '2026-02-01',
    notes: 'UI/UX redesign & growth marketing client.',
  },
  {
    id: 'cli-003',
    name: 'Michael Chang',
    company: 'Urban Craft Beverages',
    email: 'mchang@urbancraft.co',
    phone: '+91 99880 77665',
    address: '88 Cyber City Tower B, DLF Phase 2, Gurugram, Haryana',
    city: 'Gurugram',
    country: 'India',
    pincode: '122002',
    taxId: 'GSTIN-06UCBWC1182K1Z9',
    createdAt: '2026-02-15',
    notes: 'Social media reel shoots & influencer marketing retainer.',
  },
];

const SEED_INVOICES: Invoice[] = [
  {
    id: 'inv-1001',
    invoiceNumber: 'HPINV-202601',
    clientId: 'cli-001',
    clientName: 'Robert Sterling',
    clientCompany: 'Apex Apparel & Lifestyle',
    clientEmail: 'r.sterling@apexlifestyle.com',
    clientPhone: '+91 98200 11223',
    clientAddress: '102 Fashion Avenue, Lower Parel, Mumbai, Maharashtra',
    clientPincode: '400013',
    clientTaxId: 'GSTIN-27APXAP9042K1Z4',
    issueDate: '2026-08-15',
    dueDate: '2026-08-30',
    items: [
      {
        id: 'item-1',
        description: 'Performance Marketing Campaign (Meta & Google Ads Optimization)',
        quantity: 1,
        unitPrice: 125000,
        taxRate: 18,
        amount: 125000,
      },
      {
        id: 'item-2',
        description: 'Social Media Video Reel Production & Creative Ad Assets',
        quantity: 4,
        unitPrice: 15000,
        taxRate: 18,
        amount: 60000,
      },
    ],
    subtotal: 185000,
    taxTotal: 33300,
    discountRate: 5,
    discountTotal: 9250,
    shippingFee: 0,
    total: 209050,
    status: 'sent',
    notes: 'Highphaus Campaign Deliverables complete. Performance reports attached.',
    terms: 'Payment due within 15 days of invoice date via Bank wire or UPI.',
    currency: 'INR',
    createdAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'inv-1002',
    invoiceNumber: 'HPINV-202602',
    clientId: 'cli-002',
    clientName: 'Dr. Ananya Sharma',
    clientCompany: 'Nexus HealthTech',
    clientEmail: 'ananya@nexushealth.io',
    clientPhone: '+91 98765 43210',
    clientAddress: 'Plot 45, Tech Park Phase II, Electronic City, Bengaluru, Karnataka',
    clientPincode: '560100',
    clientTaxId: 'GSTIN-29AAACH8821K1Z5',
    issueDate: '2026-08-01',
    dueDate: '2026-08-15',
    items: [
      {
        id: 'item-4',
        description: 'Brand System & UI/UX Web Design Package',
        quantity: 1,
        unitPrice: 185000,
        taxRate: 18,
        amount: 185000,
      },
    ],
    subtotal: 185000,
    taxTotal: 33300,
    discountRate: 0,
    discountTotal: 0,
    shippingFee: 0,
    total: 218300,
    status: 'paid',
    paidAt: '2026-08-12',
    paymentMethod: 'UPI / Bank Transfer',
    notes: 'UI/UX Figma design assets handed over.',
    terms: 'Payment due upon receipt.',
    currency: 'INR',
    createdAt: '2026-08-01T09:30:00Z',
  },
];

const SEED_QUOTES: Quote[] = [
  {
    id: 'quo-501',
    quoteNumber: 'HPQUO-202601',
    clientId: 'cli-001',
    clientName: 'Robert Sterling',
    clientCompany: 'Apex Apparel & Lifestyle',
    clientEmail: 'r.sterling@apexlifestyle.com',
    issueDate: '2026-08-20',
    validUntil: '2026-09-20',
    items: [
      {
        id: 'qitem-1',
        description: 'Festive Season Multi-Channel Ad Campaign',
        quantity: 1,
        unitPrice: 350000,
        taxRate: 18,
        amount: 350000,
      },
    ],
    subtotal: 350000,
    taxTotal: 63000,
    discountRate: 5,
    discountTotal: 17500,
    total: 395500,
    status: 'sent',
    notes: 'Highphaus proposal valid for 30 days.',
    terms: 'Standard Highphaus Creative Marketing Agency Quotation Terms Apply.',
    currency: 'INR',
    createdAt: '2026-08-20T08:00:00Z',
  },
];

const SEED_RECURRING: RecurringTemplate[] = [
  {
    id: 'rec-1',
    title: 'Monthly Performance Marketing Retainer',
    clientId: 'cli-001',
    clientName: 'Robert Sterling',
    clientCompany: 'Apex Apparel & Lifestyle',
    frequency: 'monthly',
    items: [
      {
        id: 'ritem-1',
        description: 'Monthly Performance Marketing Management & Ad Optimization',
        quantity: 1,
        unitPrice: 125000,
        taxRate: 18,
        amount: 125000,
      },
    ],
    amount: 147500,
    currency: 'INR',
    nextDueDate: '2026-10-01',
    lastGeneratedDate: '2026-09-01',
    status: 'active',
  },
];

export const isStorageInitialized = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true';
};

export const markStorageInitialized = (): void => {
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
};

export const getStoredInvoices = (): Invoice[] => {
  const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
  if (!data) {
    if (isStorageInitialized()) {
      return [];
    }
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(SEED_INVOICES));
    markStorageInitialized();
    return SEED_INVOICES;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveInvoices = (invoices: Invoice[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
};

export const getStoredClients = (): Client[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
  if (!data) {
    if (isStorageInitialized()) {
      return [];
    }
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(SEED_CLIENTS));
    markStorageInitialized();
    return SEED_CLIENTS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveClients = (clients: Client[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
};

export const getStoredQuotes = (): Quote[] => {
  const data = localStorage.getItem(STORAGE_KEYS.QUOTES);
  if (!data) {
    if (isStorageInitialized()) {
      return [];
    }
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(SEED_QUOTES));
    markStorageInitialized();
    return SEED_QUOTES;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveQuotes = (quotes: Quote[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
};

export const getStoredRecurring = (): RecurringTemplate[] => {
  const data = localStorage.getItem(STORAGE_KEYS.RECURRING);
  if (!data) {
    if (isStorageInitialized()) {
      return [];
    }
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(SEED_RECURRING));
    markStorageInitialized();
    return SEED_RECURRING;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveRecurring = (templates: RecurringTemplate[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(templates));
};

export const getStoredSettings = (): BusinessSettings => {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!data) {
    if (isStorageInitialized()) {
      return BLANK_SETTINGS;
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    markStorageInitialized();
    return DEFAULT_SETTINGS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return BLANK_SETTINGS;
  }
};

export const saveSettings = (settings: BusinessSettings): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

// --- DATA DELETION & RESET HELPERS ---

export const clearAllInvoices = (): void => {
  saveInvoices([]);
};

export const clearAllClients = (): void => {
  saveClients([]);
};

export const clearAllQuotes = (): void => {
  saveQuotes([]);
};

export const clearAllRecurring = (): void => {
  saveRecurring([]);
};

export const clearBusinessSettings = (): BusinessSettings => {
  saveSettings(BLANK_SETTINGS);
  return BLANK_SETTINGS;
};

/**
 * Deletes every single detail inside the website:
 * - Empties all invoices
 * - Empties all clients
 * - Empties all quotes/proposals
 * - Empties all recurring subscriptions
 * - Wipes all business profile & bank details to completely blank
 */
export const wipeEntireWebsite = (): {
  invoices: Invoice[];
  clients: Client[];
  quotes: Quote[];
  recurring: RecurringTemplate[];
  settings: BusinessSettings;
} => {
  markStorageInitialized();
  saveInvoices([]);
  saveClients([]);
  saveQuotes([]);
  saveRecurring([]);
  saveSettings(BLANK_SETTINGS);
  return {
    invoices: [],
    clients: [],
    quotes: [],
    recurring: [],
    settings: BLANK_SETTINGS,
  };
};

/**
 * Restores initial sample demo data
 */
export const resetToDemoData = (): {
  invoices: Invoice[];
  clients: Client[];
  quotes: Quote[];
  recurring: RecurringTemplate[];
  settings: BusinessSettings;
} => {
  markStorageInitialized();
  saveInvoices(SEED_INVOICES);
  saveClients(SEED_CLIENTS);
  saveQuotes(SEED_QUOTES);
  saveRecurring(SEED_RECURRING);
  saveSettings(DEFAULT_SETTINGS);
  return {
    invoices: SEED_INVOICES,
    clients: SEED_CLIENTS,
    quotes: SEED_QUOTES,
    recurring: SEED_RECURRING,
    settings: DEFAULT_SETTINGS,
  };
};
