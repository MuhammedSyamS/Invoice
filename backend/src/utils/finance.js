/**
 * Authoritative Server-Side Financial Calculation Engine
 * Guarantees mathematical integrity for Invoices and Bills.
 * Never trusts unverified client balances or totals.
 */

export const calculateAuthoritativeInvoiceFinancials = (data, existingPayments = []) => {
  const items = Array.isArray(data.items) ? data.items : [];

  let subtotal = 0;
  let taxTotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const sanitizedItems = items.map((item, index) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const taxRate = Math.max(0, Number(item.taxRate) || 0);
    const lineBase = Math.round(qty * unitPrice * 100) / 100;
    const lineTax = Math.round(lineBase * (taxRate / 100) * 100) / 100;

    subtotal += lineBase;
    taxTotal += lineTax;

    if (data.isInterState) {
      igst += lineTax;
    } else {
      cgst += Math.round((lineTax / 2) * 100) / 100;
      sgst += Math.round((lineTax / 2) * 100) / 100;
    }

    return {
      ...item,
      id: item.id || `item-${index + 1}`,
      description: String(item.description || 'Line Item').trim(),
      quantity: qty,
      unitPrice: unitPrice,
      taxRate: taxRate,
      amount: lineBase,
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  taxTotal = Math.round(taxTotal * 100) / 100;
  cgst = Math.round(cgst * 100) / 100;
  sgst = Math.round(sgst * 100) / 100;
  igst = Math.round(igst * 100) / 100;

  const discountRate = Math.max(0, Math.min(100, Number(data.discountRate) || 0));
  const discountTotal = Math.round(subtotal * (discountRate / 100) * 100) / 100;
  const shippingFee = Math.max(0, Number(data.shippingFee) || 0);
  const roundOff = Number(data.roundOff) || 0;

  const rawTotal = subtotal - discountTotal + taxTotal + shippingFee + roundOff;
  const total = Math.max(0, Math.round(rawTotal * 100) / 100);

  // Authoritative payment ledger derivation
  let paidAmount = 0;
  if (Array.isArray(existingPayments) && existingPayments.length > 0) {
    paidAmount = existingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  } else if (typeof data.paidAmount === 'number') {
    paidAmount = Math.max(0, data.paidAmount);
  }
  paidAmount = Math.round(paidAmount * 100) / 100;

  const balanceDue = Math.max(0, Math.round((total - paidAmount) * 100) / 100);

  // Authoritative status derivation
  let status = data.status || 'draft';
  if (balanceDue === 0 && total > 0) {
    status = 'paid';
  } else if (paidAmount > 0 && balanceDue > 0) {
    status = 'partially_paid';
  } else if (data.dueDate && new Date(data.dueDate) < new Date() && balanceDue > 0 && status !== 'cancelled') {
    status = 'overdue';
  }

  return {
    ...data,
    items: sanitizedItems,
    subtotal,
    discountRate,
    discountTotal,
    taxTotal,
    cgst,
    sgst,
    igst,
    shippingFee,
    roundOff,
    total,
    paidAmount,
    balanceDue,
    status,
  };
};

export const calculateAuthoritativeBillFinancials = (data, existingPayments = []) => {
  const items = Array.isArray(data.items) ? data.items : [];

  let subtotal = 0;
  let taxTotal = 0;

  const sanitizedItems = items.map((item, index) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const taxRate = Math.max(0, Number(item.taxRate) || 0);
    const lineBase = Math.round(qty * unitPrice * 100) / 100;
    const lineTax = Math.round(lineBase * (taxRate / 100) * 100) / 100;

    subtotal += lineBase;
    taxTotal += lineTax;

    return {
      ...item,
      id: item.id || `bitem-${index + 1}`,
      description: String(item.description || 'Bill Item').trim(),
      quantity: qty,
      unitPrice: unitPrice,
      taxRate: taxRate,
      amount: lineBase,
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  taxTotal = Math.round(taxTotal * 100) / 100;

  const discountRate = Math.max(0, Math.min(100, Number(data.discountRate) || 0));
  const discountTotal = Math.round(subtotal * (discountRate / 100) * 100) / 100;

  const rawTotal = subtotal - discountTotal + taxTotal;
  const total = Math.max(0, Math.round(rawTotal * 100) / 100);

  let paidAmount = 0;
  if (Array.isArray(existingPayments) && existingPayments.length > 0) {
    paidAmount = existingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  } else if (typeof data.paidAmount === 'number') {
    paidAmount = Math.max(0, data.paidAmount);
  }
  paidAmount = Math.round(paidAmount * 100) / 100;

  const balanceDue = Math.max(0, Math.round((total - paidAmount) * 100) / 100);

  let status = data.status || 'draft';
  if (balanceDue === 0 && total > 0) {
    status = 'paid';
  } else if (paidAmount > 0 && balanceDue > 0) {
    status = 'partially_paid';
  } else if (data.dueDate && new Date(data.dueDate) < new Date() && balanceDue > 0 && status !== 'cancelled') {
    status = 'overdue';
  }

  return {
    ...data,
    items: sanitizedItems,
    subtotal,
    discountRate,
    discountTotal,
    taxTotal,
    total,
    paidAmount,
    balanceDue,
    status,
  };
};
