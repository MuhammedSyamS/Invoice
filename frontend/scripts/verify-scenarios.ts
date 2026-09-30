import { deriveInvoiceFinancials, deriveBillFinancials, calculateDocumentFinancials } from '../src/services/calculationEngine';
import { executeEnterpriseAnalytics } from '../src/services/analyticsEngine';
import type { Invoice, Bill, Payment, Category, Client } from '../src/types/invoice';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('====================================================');
console.log('RUNNING REGRESSION TEST SUITE FOR ADVANCE PAYMENTS,');
console.log('CATEGORIES, FINANCIAL LEDGER AND ENTERPRISE ANALYTICS');
console.log('====================================================\n');

// ----------------------------------------------------------------------------
// SCENARIO 1: ADVANCE PAYMENT & FULL SETTLEMENT LIFECYCLE
// ----------------------------------------------------------------------------
console.log('--- SCENARIO 1: Advance Payment & Step-by-Step Settlement ---');

const categoryWebDev: Category = {
  id: 'cat-web-001',
  name: 'Website Development',
  description: 'Custom web development and engineering',
  color: '#6366f1',
  status: 'active',
  createdAt: '2026-09-30T10:00:00Z',
};

const clientABC: Client = {
  id: 'cli-abc-001',
  name: 'John Doe',
  company: 'ABC Company',
  email: 'john@abc.com',
  phone: '9876543210',
  createdAt: '2026-09-30',
};

// 1. Calculate invoice breakdown: ₹20,000 total (0% tax for simple test)
const breakdown = calculateDocumentFinancials({
  items: [
    {
      description: 'Website Development',
      quantity: 1,
      unitPrice: 20000,
      taxRate: 0,
      categoryId: categoryWebDev.id,
      categoryName: categoryWebDev.name,
    },
  ],
});

assert(breakdown.total === 20000, 'Invoice total calculated to ₹20,000');

let invoice1: Invoice = {
  id: 'inv-test-001',
  invoiceNumber: 'INV-2026001',
  clientId: clientABC.id,
  clientName: clientABC.name,
  clientCompany: clientABC.company,
  issueDate: '2026-09-30',
  dueDate: '2026-10-15',
  items: breakdown.items,
  subtotal: breakdown.subtotal,
  taxTotal: breakdown.taxTotal,
  discountRate: breakdown.discountRate,
  discountTotal: breakdown.discountTotal,
  shippingFee: breakdown.shippingFee,
  total: breakdown.total,
  paidAmount: 0,
  balanceDue: breakdown.total,
  status: 'sent',
  categoryId: categoryWebDev.id,
  categoryName: categoryWebDev.name,
  createdAt: '2026-09-30T10:05:00Z',
};

// 2. Initial state with 0 payments
let ledgerPayments: Payment[] = [];
let finState = deriveInvoiceFinancials(invoice1, ledgerPayments);
assert(finState.paidAmount === 0, 'Initial paid amount is 0');
assert(finState.balanceDue === 20000, 'Initial balance due is ₹20,000');
assert(finState.status === 'sent', 'Initial invoice status is "sent"');

// 3. Client pays Advance: ₹10,000
const advancePayment: Payment = {
  id: 'pay-adv-001',
  documentType: 'invoice',
  documentId: invoice1.id,
  documentNumber: invoice1.invoiceNumber,
  customerId: clientABC.id,
  customerName: clientABC.name,
  customerCompany: clientABC.company,
  amount: 10000,
  paymentDate: '2026-09-30',
  paymentMethod: 'UPI',
  referenceNumber: 'UPI12345',
  notes: 'Advance 50% for Website Development',
  isAdvance: true,
  recordedBy: 'Admin',
  createdAt: '2026-09-30T10:10:00Z',
};

ledgerPayments.push(advancePayment);
invoice1.advancePaymentAmount = advancePayment.amount;
finState = deriveInvoiceFinancials(invoice1, ledgerPayments);

assert(finState.paidAmount === 10000, 'Paid amount after advance is ₹10,000');
assert(finState.balanceDue === 10000, 'Balance due after advance is ₹10,000');
assert(finState.status === 'partially_paid', 'Status automatically derived as "partially_paid"');
assert(finState.matchingPayments.length === 1, 'Payment history contains 1 payment record');

// 4. Client pays final installment: ₹10,000
const finalPayment: Payment = {
  id: 'pay-fin-002',
  documentType: 'invoice',
  documentId: invoice1.id,
  documentNumber: invoice1.invoiceNumber,
  customerId: clientABC.id,
  customerName: clientABC.name,
  customerCompany: clientABC.company,
  amount: 10000,
  paymentDate: '2026-10-05',
  paymentMethod: 'Bank Transfer',
  referenceNumber: 'NEFT88990',
  notes: 'Final project milestone settlement',
  isAdvance: false,
  recordedBy: 'Admin',
  createdAt: '2026-10-05T14:00:00Z',
};

ledgerPayments.push(finalPayment);
finState = deriveInvoiceFinancials(invoice1, ledgerPayments);

assert(finState.paidAmount === 20000, 'Paid amount after final payment is ₹20,000');
assert(finState.balanceDue === 0, 'Balance due is ₹0');
assert(finState.status === 'paid', 'Status automatically derived as "paid"');
assert(finState.matchingPayments.length === 2, 'Payment history has both transactions preserved');

// ----------------------------------------------------------------------------
// SCENARIO 2: MULTI-CATEGORY INVOICE & PROPORTIONAL REALIZATION ANALYTICS
// ----------------------------------------------------------------------------
console.log('\n--- SCENARIO 2: Multi-Category Line Items & Revenue Analytics Isolation ---');

const catSocial: Category = {
  id: 'cat-social-002',
  name: 'Social Media Management',
  status: 'active',
  createdAt: '2026-09-30T10:00:00Z',
};
const catBrand: Category = {
  id: 'cat-brand-003',
  name: 'Brand Kit',
  status: 'active',
  createdAt: '2026-09-30T10:00:00Z',
};

const multiBreakdown = calculateDocumentFinancials({
  items: [
    {
      description: 'Social Media Management',
      quantity: 1,
      unitPrice: 30000,
      taxRate: 0,
      categoryId: catSocial.id,
      categoryName: catSocial.name,
    },
    {
      description: 'Brand Kit',
      quantity: 1,
      unitPrice: 10000,
      taxRate: 0,
      categoryId: catBrand.id,
      categoryName: catBrand.name,
    },
    {
      description: 'Website Development',
      quantity: 1,
      unitPrice: 20000,
      taxRate: 0,
      categoryId: categoryWebDev.id,
      categoryName: categoryWebDev.name,
    },
  ],
});

assert(multiBreakdown.total === 60000, 'Multi-category invoice total is ₹60,000 (30k + 10k + 20k)');

const multiInvoice: Invoice = {
  id: 'inv-multi-002',
  invoiceNumber: 'INV-2026002',
  clientId: clientABC.id,
  clientName: clientABC.name,
  clientCompany: clientABC.company,
  issueDate: '2026-09-15',
  dueDate: '2026-09-30',
  items: multiBreakdown.items,
  subtotal: multiBreakdown.subtotal,
  taxTotal: multiBreakdown.taxTotal,
  discountRate: 0,
  discountTotal: 0,
  shippingFee: 0,
  total: multiBreakdown.total,
  paidAmount: 30000, // 50% paid overall
  balanceDue: 30000,
  status: 'partially_paid',
  createdAt: '2026-09-15T10:00:00Z',
};

const multiPayments: Payment[] = [
  {
    id: 'pay-multi-001',
    documentType: 'invoice',
    documentId: multiInvoice.id,
    documentNumber: multiInvoice.invoiceNumber,
    customerId: clientABC.id,
    customerName: clientABC.name,
    customerCompany: clientABC.company,
    amount: 30000,
    paymentDate: '2026-09-20',
    paymentMethod: 'UPI',
    referenceNumber: 'UPI-MULTI-999',
    createdAt: '2026-09-20T11:00:00Z',
  },
];

const allCategories = [categoryWebDev, catSocial, catBrand];

// Test 2A: Filter by 'Social Media Management'
const socialAnalytics = executeEnterpriseAnalytics({
  invoices: [multiInvoice],
  bills: [],
  payments: multiPayments,
  clients: [clientABC],
  categories: allCategories,
  filters: {
    categoryId: catSocial.id,
    datePreset: 'all',
    documentType: 'all',
  },
});

assert(socialAnalytics.kpis.totalRevenue === 30000, 'Social Media revenue is strictly ₹30,000');
assert(socialAnalytics.kpis.amountCollected === 15000, 'Social Media collected (50% share of 30k) is ₹15,000');
assert(socialAnalytics.kpis.outstandingAmount === 15000, 'Social Media outstanding is ₹15,000');

// Test 2B: Filter by 'Brand Kit'
const brandAnalytics = executeEnterpriseAnalytics({
  invoices: [multiInvoice],
  bills: [],
  payments: multiPayments,
  clients: [clientABC],
  categories: allCategories,
  filters: {
    categoryId: catBrand.id,
    datePreset: 'all',
    documentType: 'all',
  },
});

assert(brandAnalytics.kpis.totalRevenue === 10000, 'Brand Kit revenue is strictly ₹10,000');
assert(brandAnalytics.kpis.amountCollected === 5000, 'Brand Kit collected (50% share of 10k) is ₹5,000');
assert(brandAnalytics.kpis.outstandingAmount === 5000, 'Brand Kit outstanding is ₹5,000');

// Test 2C: Filter by 'Website Development'
const webAnalytics = executeEnterpriseAnalytics({
  invoices: [multiInvoice],
  bills: [],
  payments: multiPayments,
  clients: [clientABC],
  categories: allCategories,
  filters: {
    categoryId: categoryWebDev.id,
    datePreset: 'all',
    documentType: 'all',
  },
});

assert(webAnalytics.kpis.totalRevenue === 20000, 'Website Development revenue is strictly ₹20,000');
assert(webAnalytics.kpis.amountCollected === 10000, 'Website Development collected (50% share of 20k) is ₹10,000');
assert(webAnalytics.kpis.outstandingAmount === 10000, 'Website Development outstanding is ₹10,000');

// Test 2D: Filter 'All' - Totals must match sum without double-counting
const combinedAnalytics = executeEnterpriseAnalytics({
  invoices: [multiInvoice],
  bills: [],
  payments: multiPayments,
  clients: [clientABC],
  categories: allCategories,
  filters: {
    categoryId: 'all',
    datePreset: 'all',
    documentType: 'all',
  },
});

assert(combinedAnalytics.kpis.totalRevenue === 60000, 'Combined revenue is exactly ₹60,000');
assert(combinedAnalytics.kpis.amountCollected === 30000, 'Combined collected is exactly ₹30,000');
assert(combinedAnalytics.kpis.outstandingAmount === 30000, 'Combined outstanding is exactly ₹30,000');

// Verify Category Performance breakdown in combined analytics
const catRows = combinedAnalytics.categoryPerformance;
const sumCatRevenue = catRows.reduce((sum, r) => sum + r.revenue, 0);
assert(sumCatRevenue === 60000, 'Sum of category revenues in table matches gross revenue (₹60,000)');

// ----------------------------------------------------------------------------
// SCENARIO 3: PAYMENT DELETION & BALANCE RESTORATION
// ----------------------------------------------------------------------------
console.log('\n--- SCENARIO 3: Payment Reversal / Deletion Ledger Integrity ---');

// Reversing the final payment from Scenario 1
const activeLedgerAfterDelete = ledgerPayments.filter((p) => p.id !== finalPayment.id);
const reversedFinState = deriveInvoiceFinancials(invoice1, activeLedgerAfterDelete);

assert(reversedFinState.paidAmount === 10000, 'After deleting final payment, paid amount drops back to ₹10,000');
assert(reversedFinState.balanceDue === 10000, 'After deleting final payment, balance due is restored to ₹10,000');
assert(reversedFinState.status === 'partially_paid', 'Status automatically returns to "partially_paid"');

// Reversing advance payment as well
const activeLedgerEmpty = activeLedgerAfterDelete.filter((p) => p.id !== advancePayment.id);
const zeroFinState = deriveInvoiceFinancials(invoice1, activeLedgerEmpty);

assert(zeroFinState.paidAmount === 0, 'After deleting advance payment, paid amount drops to ₹0');
assert(zeroFinState.balanceDue === 20000, 'Balance due is fully restored to ₹20,000');
// ----------------------------------------------------------------------------
// SCENARIO 4: BILL FINANCIAL DERIVATION & PAYMENT LEDGER
// ----------------------------------------------------------------------------
console.log('\n--- SCENARIO 4: Bill Financial Derivations & POS Settlements ---');

const testBill: Bill = {
  id: 'bill-test-001',
  billNumber: 'HPBILL-2026001',
  customerId: clientABC.id,
  customerName: clientABC.name,
  billDate: '2026-09-28',
  dueDate: '2026-10-10',
  items: [
    {
      id: 'b-item-1',
      description: 'Brand Consultation',
      quantity: 1,
      unitPrice: 15000,
      taxRate: 0,
      amount: 15000,
      categoryId: catBrand.id,
      categoryName: catBrand.name,
    },
  ],
  subtotal: 15000,
  taxTotal: 0,
  discountRate: 0,
  discountTotal: 0,
  total: 15000,
  paidAmount: 0,
  balanceDue: 15000,
  paymentStatus: 'unpaid',
  createdAt: '2026-09-28T12:00:00Z',
};

const billLedger: Payment[] = [
  {
    id: 'pay-bill-001',
    documentType: 'bill',
    documentId: testBill.id,
    documentNumber: testBill.billNumber,
    customerId: clientABC.id,
    customerName: clientABC.name,
    amount: 5000,
    paymentDate: '2026-09-29',
    paymentMethod: 'Cash',
    referenceNumber: 'CASH-001',
    createdAt: '2026-09-29T12:00:00Z',
  },
];

const billDerived1 = deriveBillFinancials(testBill, billLedger);
assert(billDerived1.paidAmount === 5000, 'Bill partial payment recorded as ₹5,000');
assert(billDerived1.balanceDue === 10000, 'Bill balance due calculated as ₹10,000');
assert(billDerived1.status === 'partially_paid', 'Bill status is "partially_paid"');

billLedger.push({
  id: 'pay-bill-002',
  documentType: 'bill',
  documentId: testBill.id,
  documentNumber: testBill.billNumber,
  customerId: clientABC.id,
  customerName: clientABC.name,
  amount: 10000,
  paymentDate: '2026-10-01',
  paymentMethod: 'UPI',
  referenceNumber: 'UPI-BILL-002',
  createdAt: '2026-10-01T12:00:00Z',
});

const billDerived2 = deriveBillFinancials(testBill, billLedger);
assert(billDerived2.paidAmount === 15000, 'Bill fully paid with ₹15,000');
assert(billDerived2.balanceDue === 0, 'Bill balance due is ₹0');
assert(billDerived2.status === 'paid', 'Bill status derived as "paid"');
testBill.paidAmount = billDerived2.paidAmount;
testBill.balanceDue = billDerived2.balanceDue;
testBill.paymentStatus = billDerived2.status;

// ----------------------------------------------------------------------------
// SCENARIO 5: MULTI-CHANNEL PAYMENT BREAKDOWN & CUSTOMER METRICS
// ----------------------------------------------------------------------------
console.log('\n--- SCENARIO 5: Payment Channels Breakdown & Customer Rankings ---');

const combinedDatasetAnalytics = executeEnterpriseAnalytics({
  invoices: [multiInvoice],
  bills: [testBill],
  payments: [...multiPayments, ...billLedger],
  clients: [clientABC],
  categories: allCategories,
  filters: {
    datePreset: 'all',
    documentType: 'all',
    categoryId: 'all',
  },
});

assert(combinedDatasetAnalytics.kpis.totalRevenue === 75000, 'Combined Invoices + Bills total revenue is ₹75,000 (60k + 15k)');
assert(combinedDatasetAnalytics.kpis.amountCollected === 45000, 'Combined collected is ₹45,000 (30k invoice + 15k bill)');
assert(combinedDatasetAnalytics.kpis.outstandingAmount === 30000, 'Combined outstanding is ₹30,000');

// Verify payment channels
const upiChannel = combinedDatasetAnalytics.paymentMethodBreakdown.find((p) => p.method === 'UPI');
const cashChannel = combinedDatasetAnalytics.paymentMethodBreakdown.find((p) => p.method === 'Cash');
assert(upiChannel?.amount === 40000, 'UPI collected amount is ₹40,000 (30k invoice + 10k bill)');
assert(cashChannel?.amount === 5000, 'Cash collected amount is ₹5,000 (bill)');

// Verify customer ranking
const topCustomer = combinedDatasetAnalytics.customerRankings[0];
assert(topCustomer?.customerCompany === 'ABC Company', 'Top customer is ABC Company');
assert(topCustomer?.revenue === 75000, 'ABC Company total revenue is ₹75,000');
assert(topCustomer?.collected === 45000, 'ABC Company collected is ₹45,000');

console.log('\n====================================================');
console.log('ALL REGRESSION TESTS (SCENARIOS 1-5) PASSED 100%!');
console.log('====================================================\n');
