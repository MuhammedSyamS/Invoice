import type {
  Invoice,
  Client,
  Quote,
  RecurringTemplate,
  BusinessSettings,
  Product,
  Bill,
  Payment,
  Expense,
  SaaSSubscriptionState,
  TeamMember,
  AuditLogEntry,
  Category,
} from '../types/invoice';

const STORAGE_KEYS = {
  INVOICES: 'highphaus_invoices_v11',
  BILLS: 'highphaus_bills_v11',
  CLIENTS: 'highphaus_clients_v11',
  PRODUCTS: 'highphaus_products_v11',
  CATEGORIES: 'highphaus_categories_v11',
  PAYMENTS: 'highphaus_payments_v11',
  EXPENSES: 'highphaus_expenses_v11',
  QUOTES: 'highphaus_quotes_v11',
  RECURRING: 'highphaus_recurring_v11',
  SETTINGS: 'highphaus_settings_v11',
  SUBSCRIPTION: 'highphaus_subscription_v11',
  TEAM: 'highphaus_team_v11',
  AUDIT_LOGS: 'highphaus_audit_v11',
  INITIALIZED: 'highphaus_initialized_v11',
};

export const DEFAULT_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham (AED)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$)' },
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
  if (isNaN(num) || num <= 0) return 'Rupees Zero Only';

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
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

export const generateNextInvoiceNumber = (count: number = 0, dateStr?: string, prefix: string = 'HPINV'): string => {
  let year = '';
  if (dateStr && dateStr.includes('-')) {
    year = dateStr.slice(0, 4);
  }
  if (!year || year.length !== 4) {
    year = String(new Date().getFullYear());
  }

  const seq = String(count + 1).padStart(3, '0');
  const cleanPrefix = (prefix || 'HPINV').trim().toUpperCase();
  return `${cleanPrefix}-${year}${seq}`;
};

export const generateNextBillNumber = (count: number = 0, dateStr?: string, prefix: string = 'HPBILL'): string => {
  let year = '';
  if (dateStr && dateStr.includes('-')) {
    year = dateStr.slice(0, 4);
  }
  if (!year || year.length !== 4) {
    year = String(new Date().getFullYear());
  }

  const seq = String(count + 1).padStart(3, '0');
  const cleanPrefix = (prefix || 'HPBILL').trim().toUpperCase();
  return `${cleanPrefix}-${year}${seq}`;
};

export const generateNextPaymentNumber = (count: number = 0): string => {
  const seq = String(count + 1).padStart(4, '0');
  return `PAY-${new Date().getFullYear()}-${seq}`;
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  companyName: 'HIGHPHAUS',
  tagline: 'Creative Marketing & Digital Growth Agency',
  logoText: 'HIGHPHAUS',
  showLogo: true,
  email: 'highphaus@gmail.com',
  phone: '+91 70342 06108',
  website: 'www.highphaus.com',
  address: 'K.G Building, Kallara , Trivandrum, Kerala',
  pincode: '695608',
  taxId: '27AAACH9042K1Z8',
  panNumber: 'AAACH9042K',
  invoicePrefix: 'HPINV',
  billPrefix: 'HPBILL',
  bankName: 'HDFC Bank Ltd',
  accountName: 'Highphaus Media Pvt Ltd',
  accountNumber: '50200049281094',
  ifscSwift: 'HDFC0000240',
  upiId: 'highphaus@hdfcbank',
  currency: 'INR',
  defaultTaxRate: 18,
  isGstRegistered: true,
  defaultPaymentTermsDays: 15,
  notesFooter: 'Thank you for partnering with Highphaus. Payment is due as per contract terms via NEFT/IMPS or UPI.',
  billNotesFooter: 'Computer generated tax invoice & sales receipt. No signature required.',
  pdfPrimaryColor: '#09090b',
  pdfAccentColor: '#09090b',
  pdfBalanceTheme: 'brown',
  pdfFontFamily: 'Plus Jakarta Sans',
  pdfShowPaymentHistory: true,
  pdfShowAmountInWords: true,
  pdfShowSignatory: true,
  pdfSignatoryTitle: 'AUTHORISED SIGNATORY',
  pdfFooterSeparator: '|',
  pdfFooterDisclaimer: '',
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
  panNumber: '',
  invoicePrefix: 'INV',
  billPrefix: 'BILL',
  bankName: '',
  accountName: '',
  accountNumber: '',
  ifscSwift: '',
  upiId: '',
  currency: 'INR',
  defaultTaxRate: 0,
  isGstRegistered: false,
  defaultPaymentTermsDays: 15,
  notesFooter: '',
  billNotesFooter: '',
  pdfPrimaryColor: '#09090b',
  pdfAccentColor: '#09090b',
  pdfBalanceTheme: 'brown',
  pdfFontFamily: 'Plus Jakarta Sans',
  pdfShowPaymentHistory: true,
  pdfShowAmountInWords: true,
  pdfShowSignatory: true,
  pdfSignatoryTitle: 'AUTHORISED SIGNATORY',
  pdfFooterSeparator: '|',
  pdfFooterDisclaimer: '',
};

// ----------------------------------------------------------------------------
// SEED & SANITIZATION LOGIC (ZERO DUMMY DATA FOR NEW DEVICES)
// ----------------------------------------------------------------------------
export const DUMMY_IDS = new Set([
  'inv-1001', 'inv-1002',
  'cli-001', 'cli-002', 'cli-003',
  'bill-2001', 'bill-2002',
  'pay-001', 'pay-002', 'pay-003', 'pay-004', 'pay-005',
  'exp-001', 'exp-002', 'exp-003',
  'quo-501',
  'rec-1',
  'aud-01', 'aud-02', 'aud-03', 'aud-04',
]);

export const DUMMY_COMPANIES = new Set([
  'apex apparel & lifestyle',
  'nexus healthtech',
  'urban craft beverages',
]);

/**
 * Permanently purges all fake/dummy seed data from localStorage
 */
export const purgeAllDummyData = (): void => {
  try {
    const rawInv = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (rawInv) {
      const parsed: Invoice[] = JSON.parse(rawInv);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (i) => !DUMMY_IDS.has(i.id) && !DUMMY_COMPANIES.has((i.clientCompany || '').toLowerCase().trim())
        );
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(filtered));
      }
    }

    const rawCli = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (rawCli) {
      const parsed: Client[] = JSON.parse(rawCli);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (c) => !DUMMY_IDS.has(c.id) && !DUMMY_COMPANIES.has((c.company || '').toLowerCase().trim())
        );
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(filtered));
      }
    }

    const rawBills = localStorage.getItem(STORAGE_KEYS.BILLS);
    if (rawBills) {
      const parsed: Bill[] = JSON.parse(rawBills);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((b) => !DUMMY_IDS.has(b.id));
        localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(filtered));
      }
    }

    const rawProd = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (rawProd) {
      const parsed: Product[] = JSON.parse(rawProd);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((p) => !DUMMY_IDS.has(p.id));
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
      }
    }

    const rawPay = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (rawPay) {
      const parsed: Payment[] = JSON.parse(rawPay);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((p) => !DUMMY_IDS.has(p.id));
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(filtered));
      }
    }

    const rawExp = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (rawExp) {
      const parsed: Expense[] = JSON.parse(rawExp);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((e) => !DUMMY_IDS.has(e.id));
        localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(filtered));
      }
    }

    const rawQuotes = localStorage.getItem(STORAGE_KEYS.QUOTES);
    if (rawQuotes) {
      const parsed: Quote[] = JSON.parse(rawQuotes);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((q) => !DUMMY_IDS.has(q.id));
        localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(filtered));
      }
    }

    const rawRec = localStorage.getItem(STORAGE_KEYS.RECURRING);
    if (rawRec) {
      const parsed: RecurringTemplate[] = JSON.parse(rawRec);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((r) => !DUMMY_IDS.has(r.id));
        localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(filtered));
      }
    }

    const rawAudit = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (rawAudit) {
      const parsed: AuditLogEntry[] = JSON.parse(rawAudit);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((a) => !DUMMY_IDS.has(a.id));
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(filtered));
      }
    }
  } catch (err) {
    console.error('Error purging dummy data:', err);
  }
};

export const RESTORED_CLIENTS: Client[] = [
  {
    id: 'cli-004',
    name: 'Chef Baker',
    company: "Chef's Cake World",
    email: 'orders@chefscakeworld.com',
    phone: '+91 70127 76730',
    address: 'Trivandrum, Kerala',
    city: 'Trivandrum',
    country: 'India',
    pincode: '695001',
    taxId: '32AAACC1234K1Z1',
    panNumber: 'AAACC1234K',
    createdAt: '2026-02-18',
    notes: 'Premium cake studio & marketing deliverables.',
  },
  {
    id: 'cli-005',
    name: 'Moothedan Management',
    company: 'MOOTHEDAN PROJECTS AND POOLS INDIA PRIVATE LIMITED',
    email: 'moothedanprojects@gmail.com',
    phone: '95004 38199',
    address: '11/25B, kanjirapilly P O, chalakudy, Velukkara, Thrissur, Kerala - 680721',
    city: 'Thrissur',
    country: 'India',
    pincode: '680721',
    taxId: '32AAAPM5678K1Z3',
    panNumber: 'AAAPM5678K',
    createdAt: '2026-02-20',
    notes: 'Commercial projects, pool engineering and video production account.',
  },
  {
    id: 'cli-006',
    name: 'Operations Director',
    company: 'Samudhra Water Solutions',
    email: 'info@samudhrawater.com',
    phone: '+91 97452 34567',
    address: 'Plot 12, Industrial Development Area, Aroor, Alappuzha, Kerala - 688534',
    city: 'Aroor',
    country: 'India',
    pincode: '688534',
    taxId: '32AAMCS9876K1Z8',
    panNumber: 'AAMCS9876K',
    createdAt: '2026-02-22',
    notes: 'Industrial water filtration & equipment solutions account.',
  },
];

const SEED_CLIENTS: Client[] = [...RESTORED_CLIENTS];

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat-web',
    name: 'Website Development',
    description: 'Custom web design, development, CMS, and web applications.',
    color: '#2563eb',
    icon: 'Globe',
    sortOrder: 1,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-smm',
    name: 'Social Media Management',
    description: 'Monthly social content calendars, community growth, and creator management.',
    color: '#db2777',
    icon: 'Share2',
    sortOrder: 2,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-brand',
    name: 'Brand Kit',
    description: 'Corporate visual identity, logo system, typography, and brand assets.',
    color: '#7c3aed',
    icon: 'Palette',
    sortOrder: 3,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-seo',
    name: 'SEO',
    description: 'Search engine optimization, keyword ranking strategy, and content marketing.',
    color: '#059669',
    icon: 'TrendingUp',
    sortOrder: 4,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-perf',
    name: 'Performance Marketing',
    description: 'Paid ad campaigns across Google, Meta, and conversion tracking.',
    color: '#ea580c',
    icon: 'BarChart2',
    sortOrder: 5,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-video',
    name: 'Video Production',
    description: 'Commercial video shooting, editing, reels, and post-production.',
    color: '#0284c7',
    icon: 'Video',
    sortOrder: 6,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export const RESTORED_INVOICES: Invoice[] = [
  {
    id: 'inv-202601',
    invoiceNumber: 'HPINV-202601',
    clientId: 'cli-005',
    clientName: 'Moothedan Management',
    clientCompany: 'MOOTHEDAN PROJECTS AND POOLS INDIA PRIVATE LIMITED',
    clientEmail: 'moothedanprojects@gmail.com',
    clientPhone: '95004 38199',
    clientAddress: '11/25B, kanjirapilly P O, chalakudy, Velukkara, Thrissur, Kerala - 680721',
    clientPincode: '680721',
    clientTaxId: '32AAAPM5678K1Z3',
    issueDate: '2026-09-17',
    dueDate: '2026-10-02',
    categoryId: 'cat-video',
    categoryName: 'Video Production',
    items: [
      {
        id: 'item-mth-1',
        productId: 'prod-003',
        categoryId: 'cat-video',
        categoryName: 'Video Production',
        description: 'Full Video Production & Post-Production — 4 Deliverables',
        quantity: 1,
        unitPrice: 20000,
        taxRate: 0,
        amount: 20000,
      },
      {
        id: 'item-mth-2',
        categoryId: 'cat-video',
        categoryName: 'Video Production',
        description: 'Travel Expenses',
        quantity: 1,
        unitPrice: 1200,
        taxRate: 0,
        amount: 1200,
      },
      {
        id: 'item-mth-3',
        categoryId: 'cat-video',
        categoryName: 'Video Production',
        description: 'Food Expenses',
        quantity: 1,
        unitPrice: 1300,
        taxRate: 0,
        amount: 1300,
      },
    ],
    subtotal: 22500,
    discountRate: 0,
    discountTotal: 0,
    taxTotal: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    isInterState: false,
    shippingFee: 0,
    roundOff: 0,
    total: 22500,
    paidAmount: 0,
    balanceDue: 22500,
    status: 'sent',
    notes: '',
    terms: 'Payment due within 15 days of invoice date.',
    currency: 'INR',
    createdAt: '2026-09-17T10:00:00Z',
  },
  {
    id: 'inv-202602',
    invoiceNumber: 'HPINV-202602',
    clientId: 'cli-004',
    clientName: 'Chef Baker',
    clientCompany: "Chef's Cake World",
    clientEmail: 'orders@chefscakeworld.com',
    clientPhone: '+91 70127 76730',
    clientAddress: 'Trivandrum, Kerala',
    clientPincode: '695001',
    clientTaxId: '32AAACC1234K1Z1',
    issueDate: '2026-09-17',
    dueDate: '2026-10-02',
    categoryId: 'cat-smm',
    categoryName: 'Social Media Management',
    items: [
      {
        id: 'item-ccw-1',
        productId: 'prod-001',
        categoryId: 'cat-smm',
        categoryName: 'Social Media Management',
        description: 'Monthly Content & Management Package',
        quantity: 1,
        unitPrice: 30000,
        taxRate: 0,
        amount: 30000,
      },
      {
        id: 'item-ccw-2',
        productId: 'prod-001',
        categoryId: 'cat-perf',
        categoryName: 'Performance Marketing',
        description: 'Meta Ads Management',
        quantity: 1,
        unitPrice: 3000,
        taxRate: 0,
        amount: 3000,
      },
      {
        id: 'item-ccw-3',
        categoryId: 'cat-perf',
        categoryName: 'Performance Marketing',
        description: 'Ads Spend',
        quantity: 1,
        unitPrice: 2000,
        taxRate: 0,
        amount: 2000,
      },
    ],
    subtotal: 35000,
    discountRate: 0,
    discountTotal: 0,
    taxTotal: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    isInterState: false,
    shippingFee: 0,
    roundOff: 0,
    total: 35000,
    paidAmount: 0,
    balanceDue: 35000,
    status: 'sent',
    notes: '',
    terms: 'Payment due within 15 days of invoice date.',
    currency: 'INR',
    createdAt: '2026-09-17T10:30:00Z',
  },
  {
    id: 'inv-202603',
    invoiceNumber: 'HPINV-202603',
    clientId: 'cli-006',
    clientName: 'Operations Director',
    clientCompany: 'Samudhra Water Solutions',
    clientEmail: 'info@samudhrawater.com',
    clientPhone: '+91 97452 34567',
    clientAddress: 'Plot 12, Industrial Development Area, Aroor, Alappuzha, Kerala - 688534',
    clientPincode: '688534',
    clientTaxId: '32AAMCS9876K1Z8',
    issueDate: '2026-09-18',
    dueDate: '2026-10-03',
    categoryId: 'cat-web',
    categoryName: 'Website Development',
    items: [
      {
        id: 'item-sws-1',
        productId: 'prod-005',
        categoryId: 'cat-web',
        categoryName: 'Website Development',
        description: 'Industrial Water Treatment Solutions Brand Portal & Product Catalog',
        quantity: 1,
        unitPrice: 85000,
        taxRate: 0,
        amount: 85000,
      },
      {
        id: 'item-sws-2',
        productId: 'prod-003',
        categoryId: 'cat-video',
        categoryName: 'Video Production',
        description: 'Technical Explainer Video Production & Ad Campaigns',
        quantity: 2,
        unitPrice: 20000,
        taxRate: 0,
        amount: 40000,
      },
    ],
    subtotal: 125000,
    discountRate: 0,
    discountTotal: 0,
    taxTotal: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    isInterState: false,
    shippingFee: 0,
    roundOff: 0,
    total: 125000,
    paidAmount: 0,
    balanceDue: 125000,
    status: 'sent',
    notes: '',
    terms: 'Payment due within 15 days of invoice date.',
    currency: 'INR',
    createdAt: '2026-09-18T11:00:00Z',
  },
];

const SEED_PRODUCTS: Product[] = [];
const SEED_INVOICES: Invoice[] = [...RESTORED_INVOICES];
const SEED_BILLS: Bill[] = [];
const SEED_PAYMENTS: Payment[] = [];
const SEED_EXPENSES: Expense[] = [];

const SEED_SUBSCRIPTION: SaaSSubscriptionState = {
  currentPlanId: 'pro',
  billingCycle: 'monthly',
  subscriptionStatus: 'active',
  nextBillingDate: '2026-10-15',
  paymentMethodSummary: 'Highphaus Workspace Tier',
  invoicesIssuedThisMonth: 0,
  storageUsedMB: 0,
};

const SEED_TEAM: TeamMember[] = [
  {
    id: 'team-01',
    name: 'Admin',
    email: 'admin@highphaus.com',
    role: 'Owner',
    status: 'active',
    joinedDate: '2026-01-01',
  },
];

const SEED_AUDIT_LOGS: AuditLogEntry[] = [];
const SEED_QUOTES: Quote[] = [];
const SEED_RECURRING: RecurringTemplate[] = [];

// ----------------------------------------------------------------------------
// STORAGE GETTERS & SETTERS
// ----------------------------------------------------------------------------
export const isStorageInitialized = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true';
};

export const markStorageInitialized = (): void => {
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
};

// --- Invoices ---
export const getStoredInvoices = (): Invoice[] => {
  try {
    purgeAllDummyData();
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    let list: Invoice[] = [];
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.filter(
          (i) => !DUMMY_IDS.has(i.id) && !DUMMY_COMPANIES.has((i.clientCompany || '').toLowerCase().trim())
        );
      }
    }
    // Ensure real client invoices (HPINV-202601, HPINV-202602, HPINV-202603) are preserved
    let updated = false;
    for (const rInv of RESTORED_INVOICES) {
      if (!list.some((inv) => inv.id === rInv.id || inv.invoiceNumber === rInv.invoiceNumber)) {
        list.push(rInv);
        updated = true;
      }
    }
    if (updated || raw === null) {
      saveInvoices(list);
    }
    return list;
  } catch (err) {
    console.error('Error loading invoices:', err);
    return [...RESTORED_INVOICES];
  }
};

export const saveInvoices = (invoices: Invoice[]): void => {
  markStorageInitialized();
  const json = JSON.stringify(invoices);
  localStorage.setItem(STORAGE_KEYS.INVOICES, json);
  localStorage.setItem('highphaus_invoices_v12', json);

  // Purge legacy backup keys so deleted invoices never get resurrected
  const legacyKeys = [
    'highphaus_invoices_v10',
    'highphaus_invoices_v9',
    'highphaus_invoices_v8',
    'highphaus_invoices_v7',
    'highphaus_invoices_v6',
    'highphaus_invoices_v5',
    'highphaus_invoices_v4',
    'highphaus_invoices_v3',
    'highphaus_invoices_v2',
    'highphaus_invoices_v1',
    'highphaus_invoices',
    'invoices',
  ];
  for (const k of legacyKeys) {
    try {
      localStorage.removeItem(k);
    } catch {}
  }
};

// --- Bills ---
export const getStoredBills = (): Bill[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BILLS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.filter((b) => !DUMMY_IDS.has(b.id));
    }
    return [];
  } catch {
    return [];
  }
};

export const saveBills = (bills: Bill[]): void => {
  markStorageInitialized();
  const json = JSON.stringify(bills);
  localStorage.setItem(STORAGE_KEYS.BILLS, json);
  localStorage.setItem('highphaus_bills_v12', json);

  const legacyKeys = [
    'highphaus_bills_v10',
    'highphaus_bills_v9',
    'highphaus_bills_v8',
    'highphaus_bills_v7',
    'highphaus_bills_v6',
    'highphaus_bills_v5',
    'highphaus_bills_v4',
    'highphaus_bills_v3',
    'highphaus_bills_v2',
    'highphaus_bills_v1',
    'highphaus_bills',
    'bills',
  ];
  for (const k of legacyKeys) {
    try {
      localStorage.removeItem(k);
    } catch {}
  }
};

// --- Clients / Customers ---
export const getStoredClients = (): Client[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    let list: Client[] = [];
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.filter(
          (c) => !DUMMY_IDS.has(c.id) && !DUMMY_COMPANIES.has((c.company || '').toLowerCase().trim())
        );
      }
    }
    // Ensure real clients (Chef's Cake World, Moothedan, Samudhra Water) are preserved
    let updated = false;
    for (const rClient of RESTORED_CLIENTS) {
      if (
        !list.some(
          (c) =>
            c.id === rClient.id ||
            (c.company && c.company.toLowerCase().trim() === rClient.company.toLowerCase().trim())
        )
      ) {
        list.push(rClient);
        updated = true;
      }
    }
    if (updated || raw === null) {
      saveClients(list);
    }
    return list;
  } catch (err) {
    console.error('Error loading clients:', err);
    return [...RESTORED_CLIENTS];
  }
};

export const saveClients = (clients: Client[]): void => {
  markStorageInitialized();
  const json = JSON.stringify(clients);
  localStorage.setItem(STORAGE_KEYS.CLIENTS, json);
  localStorage.setItem('highphaus_clients_v12', json);

  const legacyKeys = [
    'highphaus_clients_v10',
    'highphaus_clients_v9',
    'highphaus_clients_v8',
    'highphaus_clients_v7',
    'highphaus_clients_v6',
    'highphaus_clients_v5',
    'highphaus_clients_v4',
    'highphaus_clients_v3',
    'highphaus_clients_v2',
    'highphaus_clients_v1',
    'highphaus_clients',
    'clients',
  ];
  for (const k of legacyKeys) {
    try {
      localStorage.removeItem(k);
    } catch {}
  }
};

// --- Products / Services ---
export const getStoredProducts = (): Product[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.filter((p) => !DUMMY_IDS.has(p.id));
    }
    return [];
  } catch {
    return [];
  }
};

export const saveProducts = (products: Product[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
};

// --- Categories / Services ---
export const getStoredCategories = (): Category[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  if (!data) {
    if (isStorageInitialized()) return [];
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(SEED_CATEGORIES));
    markStorageInitialized();
    return SEED_CATEGORIES;
  }
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return SEED_CATEGORIES;
  } catch {
    return SEED_CATEGORIES;
  }
};

export const saveCategories = (categories: Category[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
};

export const createCategory = (cat: Omit<Category, 'id' | 'createdAt'>): Category => {
  const categories = getStoredCategories();
  const newCat: Category = {
    ...cat,
    id: `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    status: cat.status || 'active',
  };
  const updated = [...categories, newCat];
  saveCategories(updated);
  return newCat;
};

export const updateCategory = (id: string, updates: Partial<Category>): Category | null => {
  const categories = getStoredCategories();
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return null;
  const updatedCat: Category = {
    ...categories[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  categories[index] = updatedCat;
  saveCategories(categories);
  return updatedCat;
};

export const archiveCategory = (id: string): void => {
  updateCategory(id, { status: 'archived' });
};

export const restoreCategory = (id: string): void => {
  updateCategory(id, { status: 'active' });
};

// --- Payments ---
export const getStoredPayments = (): Payment[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((p) => !DUMMY_IDS.has(p.id))
        .map((p) => {
          let ref = p.referenceNumber || '';
          let notes = p.notes || '';
          if (ref.trim() === '.') ref = '';
          if (
            notes === 'Advance payment recorded upon invoice issuance' ||
            notes === 'Advance deposit upon invoice issuance' ||
            notes === 'Advance deposit recorded upon invoice issuance' ||
            notes.trim() === '.'
          ) {
            notes = '';
          }
          return { ...p, referenceNumber: ref, notes };
        });
    }
    return [];
  } catch {
    return [];
  }
};

export const savePayments = (payments: Payment[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
};

// --- Expenses ---
export const getStoredExpenses = (): Expense[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.filter((e) => !DUMMY_IDS.has(e.id));
    }
    return [];
  } catch {
    return [];
  }
};

export const saveExpenses = (expenses: Expense[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
};

// --- SaaS Subscription ---
export const getStoredSubscription = (): SaaSSubscriptionState => {
  const data = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
  if (!data) {
    if (isStorageInitialized()) return SEED_SUBSCRIPTION;
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(SEED_SUBSCRIPTION));
    markStorageInitialized();
    return SEED_SUBSCRIPTION;
  }
  try {
    return JSON.parse(data);
  } catch {
    return SEED_SUBSCRIPTION;
  }
};

export const saveSubscription = (sub: SaaSSubscriptionState): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(sub));
};

// --- Team Members ---
export const getStoredTeam = (): TeamMember[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TEAM);
  if (!data) {
    if (isStorageInitialized()) return [];
    localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(SEED_TEAM));
    markStorageInitialized();
    return SEED_TEAM;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveTeam = (team: TeamMember[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(team));
};

// --- Audit Logs ---
export const getStoredAuditLogs = (): AuditLogEntry[] => {
  const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
  if (!data) {
    if (isStorageInitialized()) return [];
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(SEED_AUDIT_LOGS));
    markStorageInitialized();
    return SEED_AUDIT_LOGS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveAuditLogs = (logs: AuditLogEntry[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
};

export const recordAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void => {
  const logs = getStoredAuditLogs();
  const newLog: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  saveAuditLogs([newLog, ...logs.slice(0, 100)]);
};

// --- Quotes ---
export const getStoredQuotes = (): Quote[] => {
  const data = localStorage.getItem(STORAGE_KEYS.QUOTES);
  if (!data) {
    if (isStorageInitialized()) return [];
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

// --- Recurring Retainers ---
export const getStoredRecurring = (): RecurringTemplate[] => {
  const data = localStorage.getItem(STORAGE_KEYS.RECURRING);
  if (!data) {
    if (isStorageInitialized()) return [];
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

// --- Business Settings ---
export const getStoredSettings = (): BusinessSettings => {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!data) {
    if (isStorageInitialized()) return BLANK_SETTINGS;
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

// ----------------------------------------------------------------------------
// DATA RESET & SEED RESTORE
// ----------------------------------------------------------------------------
export const wipeEntireWebsite = () => {
  markStorageInitialized();
  saveInvoices([]);
  saveBills([]);
  saveClients([]);
  saveProducts([]);
  saveCategories([]);
  savePayments([]);
  saveExpenses([]);
  saveQuotes([]);
  saveRecurring([]);
  saveTeam([]);
  saveAuditLogs([]);
  saveSettings(BLANK_SETTINGS);
  return {
    invoices: [],
    bills: [],
    clients: [],
    products: [],
    categories: [],
    payments: [],
    expenses: [],
    quotes: [],
    recurring: [],
    team: [],
    auditLogs: [],
    settings: BLANK_SETTINGS,
    subscription: SEED_SUBSCRIPTION,
  };
};

export const resetToDemoData = () => {
  markStorageInitialized();
  saveInvoices(SEED_INVOICES);
  saveBills(SEED_BILLS);
  saveClients(SEED_CLIENTS);
  saveProducts(SEED_PRODUCTS);
  saveCategories(SEED_CATEGORIES);
  savePayments(SEED_PAYMENTS);
  saveExpenses(SEED_EXPENSES);
  saveQuotes(SEED_QUOTES);
  saveRecurring(SEED_RECURRING);
  saveTeam(SEED_TEAM);
  saveAuditLogs(SEED_AUDIT_LOGS);
  return {
    invoices: SEED_INVOICES,
    bills: SEED_BILLS,
    clients: SEED_CLIENTS,
    products: SEED_PRODUCTS,
    categories: SEED_CATEGORIES,
    payments: SEED_PAYMENTS,
    expenses: SEED_EXPENSES,
    quotes: SEED_QUOTES,
    recurring: SEED_RECURRING,
    team: SEED_TEAM,
    auditLogs: SEED_AUDIT_LOGS,
    settings: DEFAULT_SETTINGS,
    subscription: SEED_SUBSCRIPTION,
  };
};

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

