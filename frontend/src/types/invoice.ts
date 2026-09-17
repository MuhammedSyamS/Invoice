export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'paid' | 'cancelled';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';
export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'annually';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // percentage, e.g. 18 for 18%
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
  taxId: string;
  createdAt: string;
  notes?: string;
}

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
  discountRate: number; // percentage
  discountTotal: number;
  shippingFee: number;
  total: number;
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
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscSwift: string;
  upiId: string;
  currency: string;
  defaultTaxRate: number;
  defaultPaymentTermsDays: number;
  notesFooter: string;
}

