export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'overdue' | 'paid' | 'cancelled';
export type BillStatus = 'paid' | 'partially_paid' | 'unpaid' | 'cancelled';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';
export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'annually';

export type PaymentMethod =
  | 'Cash'
  | 'UPI'
  | 'Card'
  | 'Bank Transfer'
  | 'Cheque'
  | 'Other';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

// ----------------------------------------------------------------------------
// CATEGORY / SERVICE MODEL
// ----------------------------------------------------------------------------
export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string; // Hex color code for badges & charts (e.g. #3b82f6)
  icon?: string;
  sortOrder?: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt?: string;
}

export interface LineItem {
  id: string;
  productId?: string;
  categoryId?: string; // Links line item to a Category for granular analytics
  categoryName?: string; // Denormalized category name for resilience
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // percentage, e.g. 18 for 18%
  hsnSac?: string; // Indian HSN/SAC Code
  unit?: string; // 'unit', 'hrs', 'pcs', 'mo', etc.
  amount: number;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  pincode?: string;
  taxId: string; // GSTIN / PAN / Tax ID
  panNumber?: string;
  createdAt: string;
  notes?: string;
}

// ----------------------------------------------------------------------------
// PRODUCT / SERVICE CATALOG
// ----------------------------------------------------------------------------
export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  taxRate: number;
  hsnSac: string;
  unit: string;
  categoryId?: string; // Default category assigned to product
  categoryName?: string;
  status: 'active' | 'archived';
  createdAt: string;
}

// ----------------------------------------------------------------------------
// PAYMENT RECORD
// ----------------------------------------------------------------------------
export interface Payment {
  id: string;
  documentType: 'invoice' | 'bill';
  documentId: string;
  documentNumber: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  notes?: string;
  isAdvance?: boolean; // Flag identifying initial advance receipt
  recordedBy?: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// INVOICE DOCUMENT
// ----------------------------------------------------------------------------
export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress: string;
  clientPincode?: string;
  clientTaxId?: string;
  issueDate: string;
  dueDate: string;
  items: LineItem[];
  subtotal: number;
  taxTotal: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  isInterState?: boolean;
  discountRate: number; // percentage
  discountTotal: number;
  shippingFee: number;
  roundOff?: number;
  total: number;
  paidAmount?: number;
  balanceDue?: number;
  advancePaymentAmount?: number;
  categoryId?: string; // Invoice-level default category
  categoryName?: string;
  status: InvoiceStatus;
  notes: string;
  terms: string;
  paymentTermsDays?: number;
  currency: string;
  paidAt?: string;
  paymentMethod?: string;
  createdAt: string;

  // Invoice-specific Sender & Company Details (Editable in Invoice Editor)
  companyName?: string;
  companyTagline?: string;
  companyAddress?: string;
  companyPincode?: string;
  companyTaxId?: string;
  companyLogoUrl?: string;
  showCompanyLogo?: boolean;

  // Invoice-specific Payment & Banking Details (Editable in Invoice Editor)
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifscSwift?: string;
  upiId?: string;

  // Invoice-specific Footer & Signatory (Editable in Invoice Editor)
  contactPhone?: string;
  contactEmail?: string;
  contactWebsite?: string;
  signatoryTitle?: string;
}

// ----------------------------------------------------------------------------
// BILL DOCUMENT (Sales Bill / Receipt / POS)
// ----------------------------------------------------------------------------
export interface Bill {
  id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstin?: string;
  billDate: string;
  dueDate?: string;
  items: LineItem[];
  subtotal: number;
  discountRate: number;
  discountTotal: number;
  taxTotal: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  isInterState?: boolean;
  roundOff?: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  categoryId?: string;
  categoryName?: string;
  paymentStatus: BillStatus;
  paymentMethod: PaymentMethod;
  notes: string;
  currency: string;
  createdAt: string;

  // Business Details Override
  companyName?: string;
  companyAddress?: string;
  companyTaxId?: string;
  companyPhone?: string;
  companyEmail?: string;
  signatoryTitle?: string;
}

// ----------------------------------------------------------------------------
// QUOTES & PROPOSALS
// ----------------------------------------------------------------------------
export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  issueDate: string;
  validUntil: string;
  items: LineItem[];
  subtotal: number;
  taxTotal: number;
  discountRate: number;
  discountTotal: number;
  total: number;
  status: QuoteStatus;
  notes: string;
  terms: string;
  currency: string;
  convertedInvoiceId?: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// RECURRING SUBSCRIPTIONS / CLIENT RETAINERS
// ----------------------------------------------------------------------------
export interface RecurringTemplate {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  clientCompany: string;
  frequency: Frequency;
  items: LineItem[];
  amount: number;
  currency: string;
  nextDueDate: string;
  lastGeneratedDate?: string;
  status: 'active' | 'paused';
}

// ----------------------------------------------------------------------------
// EXPENSES
// ----------------------------------------------------------------------------
export interface Expense {
  id: string;
  category: 'Software & Subscriptions' | 'Marketing & Ads' | 'Office & Supplies' | 'Contractors & Freelancers' | 'Utilities' | 'Travel' | 'Other';
  payee: string;
  amount: number;
  taxAmount?: number;
  date: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  status: 'paid' | 'pending';
  createdAt: string;
}

// ----------------------------------------------------------------------------
// SAAS BILLING & SUBSCRIPTION (Application Subscription)
// ----------------------------------------------------------------------------
export interface SaaSSubscriptionPlan {
  id: 'free' | 'starter' | 'pro' | 'enterprise';
  name: string;
  priceMonthlyINR: number;
  priceAnnualINR: number;
  features: string[];
  maxInvoicesPerMonth: number;
  maxTeamMembers: number;
  hasCustomBranding: boolean;
  hasPrioritySupport: boolean;
  hasGstReports: boolean;
}

export interface SaaSSubscriptionState {
  currentPlanId: 'free' | 'starter' | 'pro' | 'enterprise';
  billingCycle: 'monthly' | 'annually';
  subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'cancelled';
  nextBillingDate: string;
  paymentMethodSummary: string;
  invoicesIssuedThisMonth: number;
  storageUsedMB: number;
}

// ----------------------------------------------------------------------------
// USER & TEAM MANAGEMENT
// ----------------------------------------------------------------------------
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Accountant' | 'Viewer';
  status: 'active' | 'invited';
  joinedDate: string;
}

// ----------------------------------------------------------------------------
// AUDIT LOG
// ----------------------------------------------------------------------------
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  entityType: 'Invoice' | 'Bill' | 'Customer' | 'Product' | 'Payment' | 'Expense' | 'Settings' | 'Category';
  entityId: string;
  details: string;
}

// ----------------------------------------------------------------------------
// BUSINESS SETTINGS
// ----------------------------------------------------------------------------
export interface BusinessSettings {
  companyName: string;
  tagline: string;
  logoText: string;
  logoUrl?: string;
  showLogo?: boolean;
  email: string;
  phone: string;
  website: string;
  address: string;
  pincode?: string;
  taxId: string;
  panNumber?: string;
  invoicePrefix?: string;
  billPrefix?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscSwift: string;
  upiId: string;
  currency: string;
  defaultTaxRate: number;
  isGstRegistered?: boolean;
  defaultPaymentTermsDays: number;
  notesFooter: string;
  billNotesFooter?: string;

  // PDF Template Styling & Customization
  pdfPrimaryColor?: string;
  pdfAccentColor?: string;
  pdfBalanceTheme?: 'brown' | 'espresso' | 'soft-red' | 'slate';
  pdfFontFamily?: 'Plus Jakarta Sans' | 'Inter' | 'Outfit' | 'Playfair' | 'Roboto';
  pdfShowPaymentHistory?: boolean;
  pdfShowAmountInWords?: boolean;
  pdfShowSignatory?: boolean;
  pdfSignatoryTitle?: string;
  pdfFooterSeparator?: string;
  pdfFooterDisclaimer?: string;
}
