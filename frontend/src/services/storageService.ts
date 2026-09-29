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
} from '../types/invoice';

const STORAGE_KEYS = {
  INVOICES: 'highphaus_invoices_v11',
  BILLS: 'highphaus_bills_v11',
  CLIENTS: 'highphaus_clients_v11',
  PRODUCTS: 'highphaus_products_v11',
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
};

// ----------------------------------------------------------------------------
// SEED DATA
// ----------------------------------------------------------------------------
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
    taxId: '27APXAP9042K1Z4',
    panNumber: 'APXAP9042K',
    createdAt: '2026-01-10',
    notes: 'Monthly enterprise performance marketing account.',
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
    taxId: '29AAACH8821K1Z5',
    panNumber: 'AAACH8821K',
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
    taxId: '06UCBWC1182K1Z9',
    panNumber: 'UCBWC1182K',
    createdAt: '2026-02-15',
    notes: 'Social media reel shoots & influencer marketing retainer.',
  },
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

const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Performance Marketing (Meta & Google Ads)',
    sku: 'SRV-PERF-01',
    description: 'Full-funnel paid ad campaign strategy, creative optimization, and conversion tracking.',
    price: 125000,
    taxRate: 18,
    hsnSac: '998311',
    unit: 'mo',
    status: 'active',
    createdAt: '2026-01-01',
  },
  {
    id: 'prod-002',
    name: 'Brand Identity & Design System',
    sku: 'SRV-BRAND-02',
    description: 'Comprehensive corporate visual guidelines, logo toolkit, typography, and UI design assets.',
    price: 185000,
    taxRate: 18,
    hsnSac: '998314',
    unit: 'project',
    status: 'active',
    createdAt: '2026-01-05',
  },
  {
    id: 'prod-003',
    name: 'Social Media Video Production (Reels & Shorts)',
    sku: 'SRV-VID-03',
    description: 'High-definition 4K UGC & commercial social reels production including scriptwriting and motion edits.',
    price: 15000,
    taxRate: 18,
    hsnSac: '999611',
    unit: 'video',
    status: 'active',
    createdAt: '2026-01-10',
  },
  {
    id: 'prod-004',
    name: 'Enterprise SEO & Content Marketing Retainer',
    sku: 'SRV-SEO-04',
    description: 'Technical SEO audits, keyword ranking strategy, backlinks, and 8 organic blog posts monthly.',
    price: 65000,
    taxRate: 18,
    hsnSac: '998315',
    unit: 'mo',
    status: 'active',
    createdAt: '2026-01-15',
  },
  {
    id: 'prod-005',
    name: 'Custom Web Application Development',
    sku: 'SRV-WEB-05',
    description: 'Bespoke Next.js / React cloud software engineering, API integration, and cloud hosting deployment.',
    price: 250000,
    taxRate: 18,
    hsnSac: '998313',
    unit: 'project',
    status: 'active',
    createdAt: '2026-02-01',
  },
];

const SEED_INVOICES: Invoice[] = [
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
    items: [
      {
        id: 'item-mth-1',
        productId: 'prod-003',
        description: 'Full Video Production & Post-Production — 4 Deliverables',
        quantity: 1,
        unitPrice: 20000,
        taxRate: 0,
        amount: 20000,
      },
      {
        id: 'item-mth-2',
        description: 'Travel Expenses',
        quantity: 1,
        unitPrice: 1200,
        taxRate: 0,
        amount: 1200,
      },
      {
        id: 'item-mth-3',
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
    items: [
      {
        id: 'item-ccw-1',
        productId: 'prod-001',
        description: 'Monthly Content & Management Package',
        quantity: 1,
        unitPrice: 30000,
        taxRate: 0,
        amount: 30000,
      },
      {
        id: 'item-ccw-2',
        productId: 'prod-001',
        description: 'Meta Ads Management',
        quantity: 1,
        unitPrice: 3000,
        taxRate: 0,
        amount: 3000,
      },
      {
        id: 'item-ccw-3',
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
    items: [
      {
        id: 'item-sws-1',
        productId: 'prod-005',
        description: 'Industrial Water Treatment Solutions Brand Portal & Product Catalog',
        quantity: 1,
        unitPrice: 85000,
        taxRate: 0,
        amount: 85000,
      },
      {
        id: 'item-sws-2',
        productId: 'prod-003',
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

const SEED_BILLS: Bill[] = [
  {
    id: 'bill-2001',
    billNumber: 'HPBILL-2026001',
    customerId: 'cli-003',
    customerName: 'Michael Chang',
    customerCompany: 'Urban Craft Beverages',
    customerPhone: '+91 99880 77665',
    customerEmail: 'mchang@urbancraft.co',
    customerAddress: '88 Cyber City Tower B, Gurugram, Haryana',
    customerGstin: '06UCBWC1182K1Z9',
    billDate: '2026-08-25',
    dueDate: '2026-08-25',
    items: [
      {
        id: 'bitem-1',
        productId: 'prod-003',
        description: 'Emergency Ad Video Reel Shoot on Location',
        quantity: 2,
        unitPrice: 15000,
        taxRate: 18,
        hsnSac: '999611',
        unit: 'video',
        amount: 30000,
      },
    ],
    subtotal: 30000,
    discountRate: 0,
    discountTotal: 0,
    taxTotal: 5400,
    cgst: 0,
    sgst: 0,
    igst: 5400,
    isInterState: true,
    roundOff: 0,
    total: 35400,
    paidAmount: 35400,
    balanceDue: 0,
    paymentStatus: 'paid',
    paymentMethod: 'UPI',
    notes: 'Walk-in production billing settled via UPI payment scan.',
    currency: 'INR',
    createdAt: '2026-08-25T14:30:00Z',
  },
  {
    id: 'bill-2002',
    billNumber: 'HPBILL-2026002',
    customerId: 'cli-001',
    customerName: 'Robert Sterling',
    customerCompany: 'Apex Apparel & Lifestyle',
    customerPhone: '+91 98200 11223',
    customerEmail: 'r.sterling@apexlifestyle.com',
    customerAddress: '102 Fashion Avenue, Lower Parel, Mumbai',
    customerGstin: '27APXAP9042K1Z4',
    billDate: '2026-09-02',
    items: [
      {
        id: 'bitem-2',
        productId: 'prod-004',
        description: 'Urgent SEO Sprint & Landing Page Copywriting',
        quantity: 1,
        unitPrice: 45000,
        taxRate: 18,
        hsnSac: '998315',
        unit: 'sprint',
        amount: 45000,
      },
    ],
    subtotal: 45000,
    discountRate: 0,
    discountTotal: 0,
    taxTotal: 8100,
    cgst: 4050,
    sgst: 4050,
    igst: 0,
    isInterState: false,
    roundOff: 0,
    total: 53100,
    paidAmount: 25000,
    balanceDue: 28100,
    paymentStatus: 'partially_paid',
    paymentMethod: 'Card',
    notes: 'Advance 50% charged at POS card swipe. Remaining balance due on completion.',
    currency: 'INR',
    createdAt: '2026-09-02T11:00:00Z',
  },
];

const SEED_PAYMENTS: Payment[] = [
  {
    id: 'pay-001',
    documentType: 'invoice',
    documentId: 'inv-1002',
    documentNumber: 'HPINV-2026002',
    customerId: 'cli-002',
    customerName: 'Dr. Ananya Sharma',
    customerCompany: 'Nexus HealthTech',
    amount: 218300,
    paymentDate: '2026-08-12',
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'NEFT-HDFC-993821094',
    notes: 'Full settlement for UI/UX Design Contract.',
    createdAt: '2026-08-12T16:00:00Z',
  },
  {
    id: 'pay-002',
    documentType: 'invoice',
    documentId: 'inv-1001',
    documentNumber: 'HPINV-2026001',
    customerId: 'cli-001',
    customerName: 'Robert Sterling',
    customerCompany: 'Apex Apparel & Lifestyle',
    amount: 100000,
    paymentDate: '2026-08-20',
    paymentMethod: 'UPI',
    referenceNumber: 'UPI-78391028471@icici',
    notes: 'Part payment 1 received.',
    createdAt: '2026-08-20T10:45:00Z',
  },
  {
    id: 'pay-003',
    documentType: 'bill',
    documentId: 'bill-2001',
    documentNumber: 'HPBILL-2026001',
    customerId: 'cli-003',
    customerName: 'Michael Chang',
    customerCompany: 'Urban Craft Beverages',
    amount: 35400,
    paymentDate: '2026-08-25',
    paymentMethod: 'UPI',
    referenceNumber: 'UPI-99281729011@okhdfcbank',
    notes: 'Instant settlement for Bill HPBILL-2026001.',
    createdAt: '2026-08-25T14:35:00Z',
  },
  {
    id: 'pay-004',
    documentType: 'bill',
    documentId: 'bill-2002',
    documentNumber: 'HPBILL-2026002',
    customerId: 'cli-001',
    customerName: 'Robert Sterling',
    customerCompany: 'Apex Apparel & Lifestyle',
    amount: 25000,
    paymentDate: '2026-09-02',
    paymentMethod: 'Card',
    referenceNumber: 'POS-TXN-491823',
    notes: 'Card payment advance for SEO sprint.',
    createdAt: '2026-09-02T11:05:00Z',
  },
];

const SEED_EXPENSES: Expense[] = [
  {
    id: 'exp-001',
    category: 'Software & Subscriptions',
    payee: 'Figma Inc & Adobe Creative Cloud',
    amount: 14500,
    taxAmount: 2610,
    date: '2026-08-05',
    paymentMethod: 'Card',
    referenceNumber: 'SUB-FIGMA-8841',
    notes: 'Monthly design team enterprise licenses.',
    status: 'paid',
    createdAt: '2026-08-05T09:00:00Z',
  },
  {
    id: 'exp-002',
    category: 'Marketing & Ads',
    payee: 'Google Ads & Meta Advertising',
    amount: 45000,
    taxAmount: 8100,
    date: '2026-08-18',
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'WIRE-META-0049',
    notes: 'Agency self-promotion campaign ad spend.',
    status: 'paid',
    createdAt: '2026-08-18T12:00:00Z',
  },
  {
    id: 'exp-003',
    category: 'Contractors & Freelancers',
    payee: 'Rahul K. (3D Animator)',
    amount: 35000,
    taxAmount: 0,
    date: '2026-08-28',
    paymentMethod: 'UPI',
    referenceNumber: 'UPI-RAHUL-3D',
    notes: 'Freelance 3D asset modeling for client commercial.',
    status: 'paid',
    createdAt: '2026-08-28T15:00:00Z',
  },
];

const SEED_SUBSCRIPTION: SaaSSubscriptionState = {
  currentPlanId: 'pro',
  billingCycle: 'monthly',
  subscriptionStatus: 'active',
  nextBillingDate: '2026-10-15',
  paymentMethodSummary: 'Visa ending in 4242 (Auto-debit enabled)',
  invoicesIssuedThisMonth: 14,
  storageUsedMB: 48,
};

const SEED_TEAM: TeamMember[] = [
  {
    id: 'team-01',
    name: 'Muhammed Syam',
    email: 'syam@highphaus.com',
    role: 'Owner',
    status: 'active',
    joinedDate: '2025-01-01',
  },
  {
    id: 'team-02',
    name: 'Priya Nambiar',
    email: 'priya@highphaus.com',
    role: 'Accountant',
    status: 'active',
    joinedDate: '2025-03-15',
  },
  {
    id: 'team-03',
    name: 'Arjun Verma',
    email: 'arjun@highphaus.com',
    role: 'Admin',
    status: 'active',
    joinedDate: '2025-06-20',
  },
];

const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-01',
    timestamp: '2026-09-02T11:05:00Z',
    userName: 'Muhammed Syam',
    action: 'Payment Recorded',
    entityType: 'Payment',
    entityId: 'pay-004',
    details: 'Recorded ₹25,000 via Card for Bill HPBILL-2026002.',
  },
  {
    id: 'aud-02',
    timestamp: '2026-09-02T11:00:00Z',
    userName: 'Muhammed Syam',
    action: 'Bill Generated',
    entityType: 'Bill',
    entityId: 'bill-2002',
    details: 'Created sales bill HPBILL-2026002 for Apex Apparel & Lifestyle (₹53,100).',
  },
  {
    id: 'aud-03',
    timestamp: '2026-08-25T14:35:00Z',
    userName: 'Priya Nambiar',
    action: 'Payment Recorded',
    entityType: 'Payment',
    entityId: 'pay-003',
    details: 'Received ₹35,400 via UPI for Bill HPBILL-2026001.',
  },
  {
    id: 'aud-04',
    timestamp: '2026-08-20T10:45:00Z',
    userName: 'Priya Nambiar',
    action: 'Partial Payment Logged',
    entityType: 'Payment',
    entityId: 'pay-002',
    details: 'Logged ₹1,00,000 partial payment for invoice HPINV-2026001. Remaining balance: ₹1,07,385.',
  },
];

const SEED_QUOTES: Quote[] = [
  {
    id: 'quo-501',
    quoteNumber: 'HPQUO-2026001',
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
        hsnSac: '998311',
        amount: 350000,
      },
    ],
    subtotal: 350000,
    discountRate: 5,
    discountTotal: 17500,
    taxTotal: 59850,
    total: 392350,
    status: 'sent',
    notes: 'Highphaus proposal valid for 30 days.',
    terms: 'Standard Highphaus Quotation Terms Apply.',
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
        productId: 'prod-001',
        description: 'Monthly Performance Marketing Management & Ad Optimization',
        quantity: 1,
        unitPrice: 125000,
        taxRate: 18,
        hsnSac: '998311',
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

// ----------------------------------------------------------------------------
// STORAGE GETTERS & SETTERS
// ----------------------------------------------------------------------------
export const isStorageInitialized = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true';
};

export const markStorageInitialized = (): void => {
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
};

// Helper to recover invoices from all possible localStorage versions and backup keys
const recoverAllStoredInvoices = (): Invoice[] => {
  const versionKeys = [
    'highphaus_invoices_v11',
    'highphaus_invoices_v12',
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

  const resultMap = new Map<string, Invoice>();

  const isInvoiceValid = (item: any): item is Invoice => {
    return (
      item &&
      typeof item === 'object' &&
      typeof item.invoiceNumber === 'string' &&
      Array.isArray(item.items) &&
      typeof item.total === 'number'
    );
  };

  for (const k of versionKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (isInvoiceValid(item)) {
              const key = item.id || item.invoiceNumber;
              if (!resultMap.has(key)) {
                resultMap.set(key, item);
              }
            }
          }
        }
      }
    } catch {}
  }

  return Array.from(resultMap.values());
};

// Helper to recover clients from all possible localStorage versions
const recoverAllStoredClients = (): Client[] => {
  const versionKeys = [
    'highphaus_clients_v11',
    'highphaus_clients_v12',
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

  const resultMap = new Map<string, Client>();

  const isClientValid = (item: any): item is Client => {
    return (
      item &&
      typeof item === 'object' &&
      (typeof item.company === 'string' || typeof item.name === 'string') &&
      !Array.isArray(item.items)
    );
  };

  for (const k of versionKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (isClientValid(item)) {
              const key = item.id || item.company || item.name;
              if (!resultMap.has(key)) {
                resultMap.set(key, item);
              }
            }
          }
        }
      }
    } catch {}
  }

  return Array.from(resultMap.values());
};

// --- Invoices ---
export const getStoredInvoices = (): Invoice[] => {
  try {
    const recovered = recoverAllStoredInvoices();
    let invoices = [...recovered].filter(
      (inv) =>
        inv &&
        typeof inv === 'object' &&
        typeof inv.invoiceNumber === 'string' &&
        Array.isArray(inv.items) &&
        typeof inv.total === 'number'
    );

    // Upsert official issued invoices (HPINV-202601, HPINV-202602, HPINV-202603)
    for (const official of SEED_INVOICES) {
      const existingIndex = invoices.findIndex(
        (inv) =>
          inv &&
          (inv.invoiceNumber === official.invoiceNumber ||
            inv.id === official.id ||
            (typeof inv.clientCompany === 'string' &&
              typeof official.clientCompany === 'string' &&
              inv.clientCompany.toLowerCase().includes(official.clientCompany.toLowerCase().slice(0, 8))))
      );
      if (existingIndex >= 0) {
        invoices[existingIndex] = {
          ...invoices[existingIndex],
          ...official,
        };
      } else {
        invoices.unshift(official);
      }
    }

    if (invoices.length === 0) {
      invoices = [...SEED_INVOICES];
    }

    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
      localStorage.setItem('highphaus_invoices_v12', JSON.stringify(invoices));
    } catch {}

    return invoices;
  } catch (err) {
    console.error('Error loading invoices, fallback to seeds:', err);
    return SEED_INVOICES;
  }
};

export const saveInvoices = (invoices: Invoice[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  localStorage.setItem('highphaus_invoices_v12', JSON.stringify(invoices));
};

// --- Bills ---
export const getStoredBills = (): Bill[] => {
  const data = localStorage.getItem(STORAGE_KEYS.BILLS) || localStorage.getItem('highphaus_bills_v12');
  if (!data) {
    if (isStorageInitialized()) return [];
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(SEED_BILLS));
    markStorageInitialized();
    return SEED_BILLS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveBills = (bills: Bill[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  localStorage.setItem('highphaus_bills_v12', JSON.stringify(bills));
};

// --- Clients / Customers ---
export const getStoredClients = (): Client[] => {
  const recovered = recoverAllStoredClients();
  let clients = [...recovered];

  // Upsert official client profiles (Moothedan, Chef's Cake World, Samudhra)
  for (const seed of SEED_CLIENTS) {
    const existingIndex = clients.findIndex(
      (c) =>
        c.id === seed.id ||
        (c.company && seed.company && c.company.toLowerCase().includes(seed.company.toLowerCase().slice(0, 8))) ||
        (c.name && seed.name && c.name.toLowerCase().includes(seed.name.toLowerCase().slice(0, 8)))
    );
    if (existingIndex >= 0) {
      clients[existingIndex] = {
        ...clients[existingIndex],
        ...seed,
      };
    } else {
      clients.push(seed);
    }
  }

  if (clients.length === 0) {
    if (isStorageInitialized()) return [];
    clients = [...SEED_CLIENTS];
  }

  try {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    localStorage.setItem('highphaus_clients_v12', JSON.stringify(clients));
  } catch {}

  return clients;
};

export const saveClients = (clients: Client[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  localStorage.setItem('highphaus_clients_v12', JSON.stringify(clients));
};

// --- Products / Services ---
export const getStoredProducts = (): Product[] => {
  const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (!data) {
    if (isStorageInitialized()) return [];
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(SEED_PRODUCTS));
    markStorageInitialized();
    return SEED_PRODUCTS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveProducts = (products: Product[]): void => {
  markStorageInitialized();
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
};

// --- Payments ---
export const getStoredPayments = (): Payment[] => {
  const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
  if (!data) {
    if (isStorageInitialized()) return [];
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(SEED_PAYMENTS));
    markStorageInitialized();
    return SEED_PAYMENTS;
  }
  try {
    return JSON.parse(data);
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
  const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
  if (!data) {
    if (isStorageInitialized()) return [];
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(SEED_EXPENSES));
    markStorageInitialized();
    return SEED_EXPENSES;
  }
  try {
    return JSON.parse(data);
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

