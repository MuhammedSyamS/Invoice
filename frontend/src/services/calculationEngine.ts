// ============================================================================
// FINANCIAL CALCULATION & VALIDATION ENGINE
// Single Source of Truth for Invoices, Bills, Quotes, and Retainers
// ============================================================================

import type { Invoice, Bill, Payment, InvoiceStatus, BillStatus } from '../types/invoice';

export interface DocumentLineItem {
  id: string;
  productId?: string;
  categoryId?: string;
  categoryName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // percentage (e.g. 18 for 18%)
  hsnSac?: string; // HSN/SAC Code for Indian GST compliance
  unit?: string; // 'unit', 'hrs', 'pcs', 'mo', etc.
  amount: number; // quantity * unitPrice
}

export interface CalculationBreakdown {
  subtotal: number;
  discountRate: number;
  discountTotal: number;
  taxableAmount: number;
  taxTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  isInterState: boolean;
  shippingFee: number;
  roundOff: number;
  total: number;
  items: DocumentLineItem[];
}

/**
 * Calculates line items and document financial breakdown with strict verification.
 * Prevents negative values, invalid discount rates, and rounding errors.
 */
export function calculateDocumentFinancials(params: {
  items: Array<Partial<DocumentLineItem>>;
  discountRate?: number;
  shippingFee?: number;
  isInterState?: boolean;
  enableRoundOff?: boolean;
}): CalculationBreakdown {
  const {
    discountRate: rawDiscountRate = 0,
    shippingFee: rawShipping = 0,
    isInterState = false,
    enableRoundOff = false,
  } = params;

  // Sanitize discount rate: 0% to 100%
  const discountRate = Math.min(100, Math.max(0, Number(rawDiscountRate) || 0));
  const shippingFee = Math.max(0, Number(rawShipping) || 0);

  // Sanitize and calculate line items
  const items: DocumentLineItem[] = (params.items || []).map((item, idx) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const taxRate = Math.min(100, Math.max(0, Number(item.taxRate) || 0));
    const amount = Number((qty * unitPrice).toFixed(2));

    return {
      id: item.id || `item-${Date.now()}-${idx}`,
      productId: item.productId,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      description: item.description || '',
      quantity: qty,
      unitPrice,
      taxRate,
      hsnSac: item.hsnSac || '',
      unit: item.unit || 'unit',
      amount,
    };
  });

  const subtotal = Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
  const discountTotal = Number(((subtotal * discountRate) / 100).toFixed(2));
  const taxableAmount = Math.max(0, Number((subtotal - discountTotal).toFixed(2)));

  // Pro-rata discount distribution for exact item tax calculation
  let taxTotal = 0;
  items.forEach((item) => {
    const itemDiscountShare = subtotal > 0 ? (item.amount * discountTotal) / subtotal : 0;
    const itemTaxable = Math.max(0, item.amount - itemDiscountShare);
    const itemTax = (itemTaxable * (item.taxRate || 0)) / 100;
    taxTotal += itemTax;
  });

  taxTotal = Number(taxTotal.toFixed(2));

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    igst = taxTotal;
  } else {
    cgst = Number((taxTotal / 2).toFixed(2));
    sgst = Number((taxTotal - cgst).toFixed(2));
  }

  const rawGrandTotal = taxableAmount + taxTotal + shippingFee;
  let roundOff = 0;
  let total = rawGrandTotal;

  if (enableRoundOff) {
    const rounded = Math.round(rawGrandTotal);
    roundOff = Number((rounded - rawGrandTotal).toFixed(2));
    total = rounded;
  } else {
    total = Number(rawGrandTotal.toFixed(2));
  }

  return {
    subtotal,
    discountRate,
    discountTotal,
    taxableAmount,
    taxTotal,
    cgst,
    sgst,
    igst,
    isInterState,
    shippingFee,
    roundOff,
    total,
    items,
  };
}

/**
 * Validates document amounts and payments
 */
export function calculatePaymentStatus(total: number, paidAmount: number): {
  status: 'paid' | 'partially_paid' | 'unpaid' | 'overpaid';
  balanceDue: number;
} {
  const safeTotal = Math.max(0, Number(total.toFixed(2)));
  const safePaid = Math.max(0, Number(paidAmount.toFixed(2)));
  const balanceDue = Math.max(0, Number((safeTotal - safePaid).toFixed(2)));

  if (safePaid <= 0) {
    return { status: 'unpaid', balanceDue: safeTotal };
  }
  if (safePaid >= safeTotal) {
    return {
      status: safePaid > safeTotal ? 'overpaid' : 'paid',
      balanceDue: 0,
    };
  }
  return { status: 'partially_paid', balanceDue };
}

/**
 * Authoritative Invoice Financial State Calculator
 * Derives paidAmount, balanceDue, and status directly from the verified payment ledger.
 */
export function deriveInvoiceFinancials(
  invoice: Invoice,
  payments: Payment[]
): {
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
  matchingPayments: Payment[];
} {
  // Find all verified payments for this invoice
  const matchingPayments = payments.filter(
    (p) =>
      p.documentType === 'invoice' &&
      (p.documentId === invoice.id || (invoice.invoiceNumber && p.documentNumber === invoice.invoiceNumber))
  );

  const ledgerPaid = matchingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const fallbackPaid = Number(invoice.advancePaymentAmount) || Number(invoice.paidAmount) || 0;
  const rawPaid = matchingPayments.length > 0 ? ledgerPaid : fallbackPaid;
  const paidAmount = Number(rawPaid.toFixed(2));
  const total = Number(invoice.total.toFixed(2));
  const balanceDue = Math.max(0, Number((total - paidAmount).toFixed(2)));

  let status: InvoiceStatus = invoice.status;

  if (invoice.status === 'cancelled') {
    status = 'cancelled';
  } else if (paidAmount >= total && total > 0) {
    status = 'paid';
  } else if (paidAmount > 0 && paidAmount < total) {
    status = 'partially_paid';
  } else {
    // paidAmount <= 0
    if (invoice.status === 'draft') {
      status = 'draft';
    } else {
      // Check overdue based on due date
      const todayStr = new Date().toISOString().slice(0, 10);
      if (invoice.dueDate && invoice.dueDate < todayStr) {
        status = 'overdue';
      } else {
        status = 'sent';
      }
    }
  }

  // If no matching payments in ledger but invoice has recorded advancePaymentAmount/paidAmount, synthesize a display record
  const displayPayments = [...matchingPayments];
  if (displayPayments.length === 0 && fallbackPaid > 0) {
    displayPayments.push({
      id: `PAY-ADV-${invoice.id}`,
      documentType: 'invoice',
      documentId: invoice.id,
      documentNumber: invoice.invoiceNumber,
      customerId: invoice.clientId,
      customerName: invoice.clientName,
      customerCompany: invoice.clientCompany,
      amount: fallbackPaid,
      paymentDate: invoice.paidAt || invoice.issueDate || new Date().toISOString().slice(0, 10),
      paymentMethod: (invoice.paymentMethod as any) || 'UPI / Advance',
      referenceNumber: '',
      notes: '',
      isAdvance: true,
      createdAt: invoice.createdAt || new Date().toISOString(),
    });
  }

  return {
    paidAmount,
    balanceDue,
    status,
    matchingPayments: displayPayments,
  };
}

/**
 * Authoritative Bill Financial State Calculator
 * Derives paidAmount, balanceDue, and status directly from the verified payment ledger.
 */
export function deriveBillFinancials(
  bill: Bill,
  payments: Payment[]
): {
  paidAmount: number;
  balanceDue: number;
  status: BillStatus;
  matchingPayments: Payment[];
} {
  const matchingPayments = payments.filter(
    (p) =>
      p.documentType === 'bill' &&
      (p.documentId === bill.id || (bill.billNumber && p.documentNumber === bill.billNumber))
  );

  const rawPaid = matchingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paidAmount = Number(rawPaid.toFixed(2));
  const total = Number(bill.total.toFixed(2));
  const balanceDue = Math.max(0, Number((total - paidAmount).toFixed(2)));

  let status: BillStatus = bill.paymentStatus;

  if (bill.paymentStatus === 'cancelled') {
    status = 'cancelled';
  } else if (paidAmount >= total && total > 0) {
    status = 'paid';
  } else if (paidAmount > 0 && paidAmount < total) {
    status = 'partially_paid';
  } else {
    status = 'unpaid';
  }

  return {
    paidAmount,
    balanceDue,
    status,
    matchingPayments,
  };
}
