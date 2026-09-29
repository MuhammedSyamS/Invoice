// ============================================================================
// FINANCIAL CALCULATION & VALIDATION ENGINE
// Single Source of Truth for Invoices, Bills, Quotes, and Retainers
// ============================================================================

export interface DocumentLineItem {
  id: string;
  productId?: string;
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
