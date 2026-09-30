// ============================================================================
// ENTERPRISE ANALYTICS & FINANCIAL INTELLIGENCE ENGINE
// Single Source of Truth for Financial Metrics, Category Performance,
// Payment Trends, and Multi-Dimensional Filter Aggregations
// ============================================================================

import type { Invoice, Bill, Payment, Client, Category, LineItem } from '../types/invoice';

export type DateFilterPreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'last_year'
  | 'custom';

export interface AnalyticsFilterParams {
  datePreset: DateFilterPreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  categoryId?: string; // 'all' | categoryId | 'uncategorized'
  customerId?: string; // 'all' | clientId
  documentType?: 'all' | 'invoice' | 'bill';
  paymentStatus?: 'all' | 'paid' | 'partially_paid' | 'unpaid' | 'overdue' | 'cancelled';
  paymentMethod?: 'all' | string;
  searchTerm?: string;
}

export interface KpiMetrics {
  totalRevenue: number;         // Total gross invoiced/billed amount
  amountCollected: number;      // Realized cash received via verified payments
  outstandingAmount: number;    // Pending balances to collect
  overdueAmount: number;        // Overdue pending balances
  invoicesCount: number;        // Total invoice documents
  billsCount: number;           // Total POS / bill documents
  totalTransactionsCount: number;
  paidCount: number;
  partiallyPaidCount: number;
  unpaidCount: number;
  overdueCount: number;
  averageInvoiceValue: number;
  collectionRatePercent: number; // (amountCollected / totalRevenue) * 100
}

export interface CategoryPerformanceRecord {
  categoryId: string;
  categoryName: string;
  color: string;
  revenue: number;           // Line-item attributed gross billed
  collected: number;         // Proportional verified payments realized
  outstanding: number;       // Pending balance
  itemCount: number;         // Number of line items
  documentCount: number;     // Number of distinct invoices/bills containing this category
  revenueSharePercent: number;
  realizationRatePercent: number;
}

export interface RevenueTrendPoint {
  dateKey: string;      // Label, e.g. "2026-09" or "Sep 2026"
  label: string;
  revenue: number;
  collected: number;
  outstanding: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  amount: number;
  count: number;
  sharePercent: number;
}

export interface CustomerPerformanceRecord {
  customerId: string;
  customerName: string;
  customerCompany: string;
  revenue: number;
  collected: number;
  outstanding: number;
  overdue: number;
  documentCount: number;
  averageValue: number;
}

export interface DocumentDrillDownItem {
  id: string;
  type: 'invoice' | 'bill';
  number: string;
  date: string;
  customerName: string;
  customerCompany: string;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  categoryNames: string[];
}

export interface AnalyticsResultSet {
  kpis: KpiMetrics;
  categoryPerformance: CategoryPerformanceRecord[];
  revenueTrend: RevenueTrendPoint[];
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  customerRankings: CustomerPerformanceRecord[];
  statusDistribution: {
    status: string;
    count: number;
    amount: number;
    percent: number;
  }[];
  drillDownDocuments: DocumentDrillDownItem[];
  filterSummary: {
    appliedPreset: string;
    startDate: string;
    endDate: string;
    totalMatchingDocs: number;
  };
}

/**
 * Normalizes date bounds for precise timezone-safe comparisons
 */
export function calculateDateRangeBounds(preset: DateFilterPreset, customStart?: string, customEnd?: string): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const format = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (preset === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }

  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (preset) {
    case 'today': {
      const todayStr = format(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case 'yesterday': {
      const yest = new Date(y, m, d - 1);
      const yStr = format(yest);
      return { startDate: yStr, endDate: yStr };
    }
    case 'this_week': {
      const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
      const distanceToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(y, m, d - distanceToMonday);
      const sunday = new Date(y, m, d - distanceToMonday + 6);
      return { startDate: format(monday), endDate: format(sunday) };
    }
    case 'last_week': {
      const dayOfWeek = now.getDay();
      const distanceToMonday = (dayOfWeek + 6) % 7;
      const lastMonday = new Date(y, m, d - distanceToMonday - 7);
      const lastSunday = new Date(y, m, d - distanceToMonday - 1);
      return { startDate: format(lastMonday), endDate: format(lastSunday) };
    }
    case 'this_month': {
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0); // Include entire current month
      return { startDate: format(firstDay), endDate: format(lastDay) };
    }
    case 'last_month': {
      const firstDayLastMonth = new Date(y, m - 1, 1);
      const lastDayLastMonth = new Date(y, m, 0);
      return { startDate: format(firstDayLastMonth), endDate: format(lastDayLastMonth) };
    }
    case 'this_quarter': {
      const quarterStartMonth = Math.floor(m / 3) * 3;
      const firstDay = new Date(y, quarterStartMonth, 1);
      const lastDay = new Date(y, quarterStartMonth + 3, 0); // Include entire quarter
      return { startDate: format(firstDay), endDate: format(lastDay) };
    }
    case 'this_year': {
      const firstDay = new Date(y, 0, 1);
      const lastDay = new Date(y, 11, 31); // Include entire year
      return { startDate: format(firstDay), endDate: format(lastDay) };
    }
    case 'last_year': {
      const firstDay = new Date(y - 1, 0, 1);
      const lastDay = new Date(y - 1, 11, 31);
      return { startDate: format(firstDay), endDate: format(lastDay) };
    }
    case 'all':
    default: {
      return { startDate: '1970-01-01', endDate: '2099-12-31' };
    }
  }
}

/**
 * Helper to determine category of a line item
 */
function resolveItemCategory(
  item: LineItem,
  docCategoryId?: string,
  docCategoryName?: string,
  categoryMap?: Map<string, Category>
): { categoryId: string; categoryName: string; color: string } {
  let catId = item?.categoryId || docCategoryId || 'uncategorized';
  let catName = item?.categoryName || docCategoryName || '';

  if (categoryMap && categoryMap.has(catId)) {
    const meta = categoryMap.get(catId)!;
    return {
      categoryId: meta.id,
      categoryName: meta.name,
      color: meta.color || '#64748b',
    };
  }

  if (catId === 'uncategorized' || !catId) {
    return {
      categoryId: 'uncategorized',
      categoryName: catName || 'General / Uncategorized',
      color: '#94a3b8',
    };
  }

  return {
    categoryId: catId,
    categoryName: catName || 'Uncategorized',
    color: '#64748b',
  };
}

/**
 * Unified Query & Aggregation Execution
 * Resolves all metrics consistently from a single authoritative source.
 */
export function executeEnterpriseAnalytics(params: {
  invoices: Invoice[];
  bills: Bill[];
  payments: Payment[];
  categories: Category[];
  clients: Client[];
  filters: AnalyticsFilterParams;
}): AnalyticsResultSet {
  const { invoices, bills, payments, categories, clients, filters } = params;

  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const clientMap = new Map<string, Client>();
  clients.forEach((c) => clientMap.set(c.id, c));

  // 1. Calculate Date Range Bounds
  const { startDate, endDate } = calculateDateRangeBounds(
    filters.datePreset,
    filters.startDate,
    filters.endDate
  );

  // 2. Pre-filter Payments by document
  const invoicePaymentsMap = new Map<string, Payment[]>();
  const billPaymentsMap = new Map<string, Payment[]>();

  payments.forEach((p) => {
    if (p.documentType === 'invoice') {
      const list = invoicePaymentsMap.get(p.documentId) || [];
      list.push(p);
      invoicePaymentsMap.set(p.documentId, list);
    } else {
      const list = billPaymentsMap.get(p.documentId) || [];
      list.push(p);
      billPaymentsMap.set(p.documentId, list);
    }
  });

  // 3. Document Filter Validation (normalized to YYYY-MM-DD for accurate comparison)
  const isInvoiceIncluded = (inv: Invoice): boolean => {
    if (filters.documentType === 'bill') return false;

    // Date check (issueDate or createdAt, normalized to 10-character YYYY-MM-DD)
    const rawDate = inv.issueDate || inv.createdAt;
    const docDate = rawDate ? String(rawDate).trim().slice(0, 10) : '';
    if (docDate && (docDate < startDate || docDate > endDate)) return false;

    // Customer check
    if (filters.customerId && filters.customerId !== 'all' && inv.clientId !== filters.customerId) {
      return false;
    }

    // Payment Status check
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (filters.paymentStatus === 'overdue') {
        const isOverdue = inv.status === 'overdue' || ((inv.balanceDue ?? inv.total) > 0 && inv.dueDate < todayStr);
        if (!isOverdue) return false;
      } else if (filters.paymentStatus === 'partially_paid') {
        const isPartial = inv.status === 'partially_paid' || ((inv.paidAmount || 0) > 0 && (inv.balanceDue ?? inv.total) > 0);
        if (!isPartial) return false;
      } else if (filters.paymentStatus === 'paid') {
        if (inv.status !== 'paid' && (inv.balanceDue ?? 0) > 0) return false;
      } else if (filters.paymentStatus === 'unpaid') {
        if ((inv.paidAmount || 0) > 0 || inv.status === 'paid' || inv.status === 'cancelled') return false;
      } else if (filters.paymentStatus === 'cancelled') {
        if (inv.status !== 'cancelled') return false;
      }
    }

    // Category filter check (Line item level OR doc level)
    if (filters.categoryId && filters.categoryId !== 'all') {
      const items = inv.items && inv.items.length > 0 ? inv.items : [];
      if (items.length > 0) {
        const matchesCategory = items.some((item) => {
          const resolved = resolveItemCategory(item, inv.categoryId, inv.categoryName, categoryMap);
          return resolved.categoryId === filters.categoryId;
        });
        if (!matchesCategory) return false;
      } else {
        const resolved = resolveItemCategory({} as any, inv.categoryId, inv.categoryName, categoryMap);
        if (resolved.categoryId !== filters.categoryId) return false;
      }
    }

    // Search term check
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const term = filters.searchTerm.toLowerCase();
      const match =
        inv.invoiceNumber.toLowerCase().includes(term) ||
        (inv.clientCompany && inv.clientCompany.toLowerCase().includes(term)) ||
        (inv.clientName && inv.clientName.toLowerCase().includes(term));
      if (!match) return false;
    }

    return true;
  };

  const isBillIncluded = (b: Bill): boolean => {
    if (filters.documentType === 'invoice') return false;

    // Date check (billDate or createdAt, normalized to 10-character YYYY-MM-DD)
    const rawDate = b.billDate || b.createdAt;
    const docDate = rawDate ? String(rawDate).trim().slice(0, 10) : '';
    if (docDate && (docDate < startDate || docDate > endDate)) return false;

    // Customer check
    if (filters.customerId && filters.customerId !== 'all' && b.customerId !== filters.customerId) {
      return false;
    }

    // Payment Status check
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      if (filters.paymentStatus === 'paid') {
        if (b.paymentStatus !== 'paid' && b.balanceDue > 0) return false;
      } else if (filters.paymentStatus === 'partially_paid') {
        if (b.paymentStatus !== 'partially_paid' && !(b.paidAmount > 0 && b.balanceDue > 0)) return false;
      } else if (filters.paymentStatus === 'unpaid') {
        if (b.paidAmount > 0 || b.paymentStatus === 'paid') return false;
      } else if (filters.paymentStatus === 'cancelled') {
        if (b.paymentStatus !== 'cancelled') return false;
      }
    }

    // Category filter check
    if (filters.categoryId && filters.categoryId !== 'all') {
      const items = b.items && b.items.length > 0 ? b.items : [];
      if (items.length > 0) {
        const matchesCategory = items.some((item) => {
          const resolved = resolveItemCategory(item, b.categoryId, b.categoryName, categoryMap);
          return resolved.categoryId === filters.categoryId;
        });
        if (!matchesCategory) return false;
      } else {
        const resolved = resolveItemCategory({} as any, b.categoryId, b.categoryName, categoryMap);
        if (resolved.categoryId !== filters.categoryId) return false;
      }
    }

    // Search term check
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const term = filters.searchTerm.toLowerCase();
      const match =
        b.billNumber.toLowerCase().includes(term) ||
        (b.customerCompany && b.customerCompany.toLowerCase().includes(term)) ||
        (b.customerName && b.customerName.toLowerCase().includes(term));
      if (!match) return false;
    }

    return true;
  };

  const filteredInvoices = invoices.filter(isInvoiceIncluded);
  const filteredBills = bills.filter(isBillIncluded);

  // 4. Calculate Authoritative Category Performance with Exact Line-Item Proportionality
  const categoryStatsMap = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      color: string;
      revenue: number;
      collected: number;
      outstanding: number;
      itemCount: number;
      docIds: Set<string>;
    }
  >();

  const getOrCreateCategoryStat = (id: string, name: string, color: string) => {
    if (!categoryStatsMap.has(id)) {
      categoryStatsMap.set(id, {
        categoryId: id,
        categoryName: name,
        color,
        revenue: 0,
        collected: 0,
        outstanding: 0,
        itemCount: 0,
        docIds: new Set<string>(),
      });
    }
    return categoryStatsMap.get(id)!;
  };

  // Process Invoices for Category Performance
  filteredInvoices.forEach((inv) => {
    if (inv.status === 'cancelled') return;

    const docTotal = Number(inv.total) || 0;
    const docPaid = Number(inv.paidAmount) || (inv.status === 'paid' ? docTotal : 0);
    const docSubtotal = Number(inv.subtotal) || 0;

    const items = inv.items && inv.items.length > 0 ? inv.items : null;

    if (!items) {
      // Attribute entire doc to doc-level category or uncategorized
      const { categoryId, categoryName, color } = resolveItemCategory(
        {} as any,
        inv.categoryId,
        inv.categoryName,
        categoryMap
      );
      if (!filters.categoryId || filters.categoryId === 'all' || categoryId === filters.categoryId) {
        const stat = getOrCreateCategoryStat(categoryId, categoryName, color);
        stat.itemCount += 1;
        stat.docIds.add(inv.id);
        stat.revenue += docTotal;
        stat.collected += docPaid;
        stat.outstanding += Math.max(0, docTotal - docPaid);
      }
      return;
    }

    // Compute sum of item values to handle missing item.amount safely
    let computedItemsTotal = 0;
    const resolvedItems = items.map((item) => {
      const rawAmt = Number(item.amount);
      const computedAmt =
        !isNaN(rawAmt) && rawAmt > 0
          ? rawAmt
          : (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
      computedItemsTotal += computedAmt;
      const cat = resolveItemCategory(item, inv.categoryId, inv.categoryName, categoryMap);
      return { item, computedAmt, cat };
    });

    const baseSubtotal =
      docSubtotal > 0
        ? docSubtotal
        : computedItemsTotal > 0
        ? computedItemsTotal
        : docTotal > 0
        ? docTotal
        : 1;

    resolvedItems.forEach(({ item, computedAmt, cat }) => {
      if (filters.categoryId && filters.categoryId !== 'all' && cat.categoryId !== filters.categoryId) {
        return;
      }

      const stat = getOrCreateCategoryStat(cat.categoryId, cat.categoryName, cat.color);
      stat.itemCount += Number(item.quantity) || 1;
      stat.docIds.add(inv.id);

      const itemShareRatio = baseSubtotal > 0 ? computedAmt / baseSubtotal : 1 / resolvedItems.length;
      const itemAllocatedRevenue = Number((docTotal * itemShareRatio).toFixed(2));
      const itemAllocatedPaid = Number((docPaid * itemShareRatio).toFixed(2));
      const itemAllocatedBalance = Math.max(0, Number((itemAllocatedRevenue - itemAllocatedPaid).toFixed(2)));

      stat.revenue += itemAllocatedRevenue;
      stat.collected += itemAllocatedPaid;
      stat.outstanding += itemAllocatedBalance;
    });
  });

  // Process Bills for Category Performance
  filteredBills.forEach((b) => {
    if (b.paymentStatus === 'cancelled') return;

    const docTotal = Number(b.total) || 0;
    const docPaid = Number(b.paidAmount) || (b.paymentStatus === 'paid' ? docTotal : 0);
    const docSubtotal = Number(b.subtotal) || 0;

    const items = b.items && b.items.length > 0 ? b.items : null;

    if (!items) {
      const { categoryId, categoryName, color } = resolveItemCategory(
        {} as any,
        b.categoryId,
        b.categoryName,
        categoryMap
      );
      if (!filters.categoryId || filters.categoryId === 'all' || categoryId === filters.categoryId) {
        const stat = getOrCreateCategoryStat(categoryId, categoryName, color);
        stat.itemCount += 1;
        stat.docIds.add(b.id);
        stat.revenue += docTotal;
        stat.collected += docPaid;
        stat.outstanding += Math.max(0, docTotal - docPaid);
      }
      return;
    }

    let computedItemsTotal = 0;
    const resolvedItems = items.map((item) => {
      const rawAmt = Number(item.amount);
      const computedAmt =
        !isNaN(rawAmt) && rawAmt > 0
          ? rawAmt
          : (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
      computedItemsTotal += computedAmt;
      const cat = resolveItemCategory(item, b.categoryId, b.categoryName, categoryMap);
      return { item, computedAmt, cat };
    });

    const baseSubtotal =
      docSubtotal > 0
        ? docSubtotal
        : computedItemsTotal > 0
        ? computedItemsTotal
        : docTotal > 0
        ? docTotal
        : 1;

    resolvedItems.forEach(({ item, computedAmt, cat }) => {
      if (filters.categoryId && filters.categoryId !== 'all' && cat.categoryId !== filters.categoryId) {
        return;
      }

      const stat = getOrCreateCategoryStat(cat.categoryId, cat.categoryName, cat.color);
      stat.itemCount += Number(item.quantity) || 1;
      stat.docIds.add(b.id);

      const itemShareRatio = baseSubtotal > 0 ? computedAmt / baseSubtotal : 1 / resolvedItems.length;
      const itemAllocatedRevenue = Number((docTotal * itemShareRatio).toFixed(2));
      const itemAllocatedPaid = Number((docPaid * itemShareRatio).toFixed(2));
      const itemAllocatedBalance = Math.max(0, Number((itemAllocatedRevenue - itemAllocatedPaid).toFixed(2)));

      stat.revenue += itemAllocatedRevenue;
      stat.collected += itemAllocatedPaid;
      stat.outstanding += itemAllocatedBalance;
    });
  });

  // Ensure all active database categories appear in the list (even with 0 revenue) when filter is 'all'
  if (!filters.categoryId || filters.categoryId === 'all') {
    categories
      .filter((c) => c.status === 'active')
      .forEach((c) => {
        getOrCreateCategoryStat(c.id, c.name, c.color || '#3b82f6');
      });
  }

  // Calculate Category totals
  let totalAggregatedRevenue = 0;
  let totalAggregatedCollected = 0;
  let totalAggregatedOutstanding = 0;

  const categoryPerformance: CategoryPerformanceRecord[] = Array.from(categoryStatsMap.values())
    .map((stat) => {
      const rev = Number(stat.revenue.toFixed(2));
      const col = Number(stat.collected.toFixed(2));
      const out = Number(stat.outstanding.toFixed(2));
      totalAggregatedRevenue += rev;
      totalAggregatedCollected += col;
      totalAggregatedOutstanding += out;

      return {
        categoryId: stat.categoryId,
        categoryName: stat.categoryName,
        color: stat.color,
        revenue: rev,
        collected: col,
        outstanding: out,
        itemCount: stat.itemCount,
        documentCount: stat.docIds.size,
        revenueSharePercent: 0,
        realizationRatePercent: rev > 0 ? Number(((col / rev) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Compute revenue share %
  categoryPerformance.forEach((cp) => {
    cp.revenueSharePercent =
      totalAggregatedRevenue > 0
        ? Number(((cp.revenue / totalAggregatedRevenue) * 100).toFixed(1))
        : 0;
  });

  // 5. Calculate Global KPIs & Status Grouping Amounts
  const isCategoryFiltered = Boolean(filters.categoryId && filters.categoryId !== 'all');

  let totalRev = 0;
  let totalCol = 0;
  let totalOut = 0;
  let overdueAmt = 0;
  let paidCount = 0;
  let partiallyPaidCount = 0;
  let unpaidCount = 0;
  let overdueCount = 0;

  let paidTotalAmt = 0;
  let partialPaidTotalAmt = 0;
  let partialRemainingAmt = 0;
  let unpaidTotalAmt = 0;

  const todayStr = new Date().toISOString().slice(0, 10);

  if (isCategoryFiltered) {
    totalRev = totalAggregatedRevenue;
    totalCol = totalAggregatedCollected;
    totalOut = totalAggregatedOutstanding;
  } else {
    filteredInvoices.forEach((inv) => {
      if (inv.status === 'cancelled') return;
      const t = Number(inv.total) || 0;
      const p = Number(inv.paidAmount) || (inv.status === 'paid' ? t : 0);
      const b = inv.balanceDue !== undefined ? Number(inv.balanceDue) : Math.max(0, t - p);

      totalRev += t;
      totalCol += p;
      totalOut += b;

      if (inv.status === 'paid' || b <= 0) {
        paidCount++;
        paidTotalAmt += t;
      } else if (p > 0 && b > 0) {
        partiallyPaidCount++;
        partialPaidTotalAmt += p;
        partialRemainingAmt += b;
      } else {
        unpaidCount++;
        unpaidTotalAmt += t;
      }

      if (b > 0 && inv.dueDate && inv.dueDate < todayStr) {
        overdueAmt += b;
        overdueCount++;
      }
    });

    filteredBills.forEach((bill) => {
      if (bill.paymentStatus === 'cancelled') return;
      const t = Number(bill.total) || 0;
      const p = Number(bill.paidAmount) || (bill.paymentStatus === 'paid' ? t : 0);
      const b = Number(bill.balanceDue) || Math.max(0, t - p);

      totalRev += t;
      totalCol += p;
      totalOut += b;

      if (bill.paymentStatus === 'paid' || b <= 0) {
        paidCount++;
        paidTotalAmt += t;
      } else if (p > 0 && b > 0) {
        partiallyPaidCount++;
        partialPaidTotalAmt += p;
        partialRemainingAmt += b;
      } else {
        unpaidCount++;
        unpaidTotalAmt += t;
      }
    });
  }

  const totalDocuments = filteredInvoices.length + filteredBills.length;
  const avgVal = totalDocuments > 0 ? Number((totalRev / totalDocuments).toFixed(2)) : 0;
  const collectionRate = totalRev > 0 ? Number(((totalCol / totalRev) * 100).toFixed(1)) : 0;

  const kpis: KpiMetrics = {
    totalRevenue: Number(totalRev.toFixed(2)),
    amountCollected: Number(totalCol.toFixed(2)),
    outstandingAmount: Number(totalOut.toFixed(2)),
    overdueAmount: Number(overdueAmt.toFixed(2)),
    invoicesCount: filteredInvoices.length,
    billsCount: filteredBills.length,
    totalTransactionsCount: totalDocuments,
    paidCount,
    partiallyPaidCount,
    unpaidCount,
    overdueCount,
    averageInvoiceValue: avgVal,
    collectionRatePercent: collectionRate,
  };

  // 6. Revenue Trend Calculation (Dynamic time aggregation based on document date span)
  const trendMap = new Map<string, { label: string; revenue: number; collected: number; outstanding: number }>();

  // Determine span in days across filtered documents
  let minDate = '9999-99-99';
  let maxDate = '0000-00-00';

  filteredInvoices.forEach((inv) => {
    if (inv.status === 'cancelled') return;
    const d = (inv.issueDate || inv.createdAt || '').slice(0, 10);
    if (d && d.length === 10) {
      if (d < minDate) minDate = d;
      if (d > maxDate) maxDate = d;
    }
  });

  filteredBills.forEach((b) => {
    if (b.paymentStatus === 'cancelled') return;
    const d = (b.billDate || b.createdAt || '').slice(0, 10);
    if (d && d.length === 10) {
      if (d < minDate) minDate = d;
      if (d > maxDate) maxDate = d;
    }
  });

  const spanDays =
    minDate !== '9999-99-99' && maxDate !== '0000-00-00'
      ? Math.max(0, (new Date(maxDate).getTime() - new Date(minDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  const isDaily =
    filters.datePreset === 'today' ||
    filters.datePreset === 'yesterday' ||
    filters.datePreset === 'this_week' ||
    filters.datePreset === 'last_week' ||
    filters.datePreset === 'this_month' ||
    filters.datePreset === 'last_month' ||
    spanDays <= 45;

  const formatTrendKey = (dateStr?: string | null) => {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return 'No Date';
    const clean = dateStr.trim().slice(0, 10);
    if (isDaily) return clean;
    return clean.slice(0, 7); // YYYY-MM
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatTrendLabel = (dateStr?: string | null) => {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim() || dateStr === 'No Date') return 'Undated';
    const clean = dateStr.trim();
    if (isDaily) {
      const parts = clean.slice(0, 10).split('-');
      if (parts.length === 3) {
        const mIdx = Number(parts[1]) - 1;
        const d = parts[2];
        if (mIdx >= 0 && mIdx < 12) {
          return `${d} ${monthNames[mIdx]}`;
        }
      }
      return clean.slice(0, 10);
    }
    const ym = clean.slice(0, 7);
    const parts = ym.split('-');
    if (parts.length === 2) {
      const year = Number(parts[0]);
      const monthIdx = Number(parts[1]) - 1;
      if (!isNaN(year) && !isNaN(monthIdx) && monthIdx >= 0 && monthIdx < 12) {
        return `${monthNames[monthIdx]} ${year}`;
      }
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const m = d.getMonth();
      const y = d.getFullYear();
      if (!isNaN(m) && !isNaN(y) && m >= 0 && m < 12) {
        return `${monthNames[m]} ${y}`;
      }
    }
    return clean;
  };

  filteredInvoices.forEach((inv) => {
    if (inv.status === 'cancelled') return;
    const dKey = formatTrendKey(inv.issueDate || inv.createdAt);
    if (!trendMap.has(dKey)) {
      trendMap.set(dKey, {
        label: formatTrendLabel(inv.issueDate || inv.createdAt || dKey),
        revenue: 0,
        collected: 0,
        outstanding: 0,
      });
    }
    const pt = trendMap.get(dKey)!;
    const rawTotal = Number(inv.total);
    const t = isNaN(rawTotal) ? 0 : rawTotal;
    const rawPaid = Number(inv.paidAmount);
    const p = isNaN(rawPaid) ? (inv.status === 'paid' ? t : 0) : rawPaid;
    const rawBal = inv.balanceDue !== undefined ? Number(inv.balanceDue) : Math.max(0, t - p);
    const b = isNaN(rawBal) ? Math.max(0, t - p) : rawBal;

    pt.revenue += t;
    pt.collected += p;
    pt.outstanding += b;
  });

  filteredBills.forEach((bill) => {
    if (bill.paymentStatus === 'cancelled') return;
    const dKey = formatTrendKey(bill.billDate || bill.createdAt);
    if (!trendMap.has(dKey)) {
      trendMap.set(dKey, {
        label: formatTrendLabel(bill.billDate || bill.createdAt || dKey),
        revenue: 0,
        collected: 0,
        outstanding: 0,
      });
    }
    const pt = trendMap.get(dKey)!;
    const rawTotal = Number(bill.total);
    const t = isNaN(rawTotal) ? 0 : rawTotal;
    const rawPaid = Number(bill.paidAmount);
    const p = isNaN(rawPaid) ? (bill.paymentStatus === 'paid' ? t : 0) : rawPaid;
    const rawBal = Number(bill.balanceDue);
    const b = isNaN(rawBal) ? Math.max(0, t - p) : rawBal;

    pt.revenue += t;
    pt.collected += p;
    pt.outstanding += b;
  });

  const revenueTrend: RevenueTrendPoint[] = Array.from(trendMap.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, val]) => ({
      dateKey: key,
      label: val.label,
      revenue: Number((isNaN(val.revenue) ? 0 : val.revenue).toFixed(2)),
      collected: Number((isNaN(val.collected) ? 0 : val.collected).toFixed(2)),
      outstanding: Number((isNaN(val.outstanding) ? 0 : val.outstanding).toFixed(2)),
    }));

  // If there is only 1 data point, create a baseline anchor point at the start so the AreaChart renders an authentic area curve
  if (revenueTrend.length === 1) {
    const single = revenueTrend[0];
    if (isDaily && single.dateKey.length === 10) {
      const d = new Date(single.dateKey);
      const prevD = new Date(d.getTime() - 86400000);
      const prevKey = prevD.toISOString().slice(0, 10);
      revenueTrend.unshift({
        dateKey: prevKey,
        label: formatTrendLabel(prevKey),
        revenue: 0,
        collected: 0,
        outstanding: 0,
      });
    } else {
      revenueTrend.unshift({
        dateKey: 'start',
        label: 'Baseline',
        revenue: 0,
        collected: 0,
        outstanding: 0,
      });
    }
  }

  // 7. Payment Methods Breakdown (Matches both documentId and documentNumber)
  const methodMap = new Map<string, { amount: number; count: number }>();
  let totalPaymentsCollected = 0;

  const validDocIdSet = new Set<string>();
  const validDocNumSet = new Set<string>();
  filteredInvoices.forEach((i) => {
    validDocIdSet.add(i.id);
    if (i.invoiceNumber) validDocNumSet.add(i.invoiceNumber.trim().toLowerCase());
  });
  filteredBills.forEach((b) => {
    validDocIdSet.add(b.id);
    if (b.billNumber) validDocNumSet.add(b.billNumber.trim().toLowerCase());
  });

  payments.forEach((p) => {
    const isDocMatch =
      validDocIdSet.has(p.documentId) ||
      (p.documentNumber && validDocNumSet.has(p.documentNumber.trim().toLowerCase()));

    if (!isDocMatch) return;

    const amt = Number(p.amount) || 0;
    const m = p.paymentMethod || 'Other';
    totalPaymentsCollected += amt;

    const current = methodMap.get(m) || { amount: 0, count: 0 };
    methodMap.set(m, {
      amount: current.amount + amt,
      count: current.count + 1,
    });
  });

  const paymentMethodBreakdown: PaymentMethodBreakdown[] = Array.from(methodMap.entries())
    .map(([method, data]) => ({
      method,
      amount: Number(data.amount.toFixed(2)),
      count: data.count,
      sharePercent:
        totalPaymentsCollected > 0
          ? Number(((data.amount / totalPaymentsCollected) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 8. Customer Performance Ranking
  const customerMap = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      customerCompany: string;
      revenue: number;
      collected: number;
      outstanding: number;
      overdue: number;
      docCount: number;
    }
  >();

  filteredInvoices.forEach((inv) => {
    if (inv.status === 'cancelled') return;
    const cId = inv.clientId || 'custom';
    if (!customerMap.has(cId)) {
      customerMap.set(cId, {
        customerId: cId,
        customerName: inv.clientName || 'Client',
        customerCompany: inv.clientCompany || inv.clientName || 'Client',
        revenue: 0,
        collected: 0,
        outstanding: 0,
        overdue: 0,
        docCount: 0,
      });
    }
    const cStat = customerMap.get(cId)!;
    const t = Number(inv.total) || 0;
    const p = Number(inv.paidAmount) || (inv.status === 'paid' ? t : 0);
    const b = inv.balanceDue !== undefined ? Number(inv.balanceDue) : Math.max(0, t - p);

    cStat.revenue += t;
    cStat.collected += p;
    cStat.outstanding += b;
    cStat.docCount += 1;

    if (b > 0 && inv.dueDate && inv.dueDate < todayStr) {
      cStat.overdue += b;
    }
  });

  filteredBills.forEach((b) => {
    if (b.paymentStatus === 'cancelled') return;
    const cId = b.customerId || 'custom';
    if (!customerMap.has(cId)) {
      customerMap.set(cId, {
        customerId: cId,
        customerName: b.customerName || 'Customer',
        customerCompany: b.customerCompany || b.customerName || 'Walk-in',
        revenue: 0,
        collected: 0,
        outstanding: 0,
        overdue: 0,
        docCount: 0,
      });
    }
    const cStat = customerMap.get(cId)!;
    const t = Number(b.total) || 0;
    const p = Number(b.paidAmount) || (b.paymentStatus === 'paid' ? t : 0);
    const bl = Number(b.balanceDue) || Math.max(0, t - p);

    cStat.revenue += t;
    cStat.collected += p;
    cStat.outstanding += bl;
    cStat.docCount += 1;
  });

  const customerRankings: CustomerPerformanceRecord[] = Array.from(customerMap.values())
    .map((c) => ({
      customerId: c.customerId,
      customerName: c.customerName,
      customerCompany: c.customerCompany,
      revenue: Number(c.revenue.toFixed(2)),
      collected: Number(c.collected.toFixed(2)),
      outstanding: Number(c.outstanding.toFixed(2)),
      overdue: Number(c.overdue.toFixed(2)),
      documentCount: c.docCount,
      averageValue: c.docCount > 0 ? Number((c.revenue / c.docCount).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // 9. Status Distribution (Mathematically sound percentages based on total active documents)
  const statusDistribution = [
    {
      status: 'Paid in Full',
      count: paidCount,
      amount: Number(paidTotalAmt.toFixed(2)),
      percent: totalDocuments > 0 ? Number(((paidCount / totalDocuments) * 100).toFixed(1)) : 0,
    },
    {
      status: 'Partially Paid',
      count: partiallyPaidCount,
      amount: Number(partialRemainingAmt.toFixed(2)),
      percent: totalDocuments > 0 ? Number(((partiallyPaidCount / totalDocuments) * 100).toFixed(1)) : 0,
    },
    {
      status: 'Unpaid / Pending',
      count: unpaidCount,
      amount: Number(unpaidTotalAmt.toFixed(2)),
      percent: totalDocuments > 0 ? Number(((unpaidCount / totalDocuments) * 100).toFixed(1)) : 0,
    },
    {
      status: 'Overdue',
      count: overdueCount,
      amount: Number(overdueAmt.toFixed(2)),
      percent: totalDocuments > 0 ? Number(((overdueCount / totalDocuments) * 100).toFixed(1)) : 0,
    },
  ];

  // 10. Traceable Drill-Down Documents
  const drillDownDocuments: DocumentDrillDownItem[] = [
    ...filteredInvoices.map((inv) => ({
      id: inv.id,
      type: 'invoice' as const,
      number: inv.invoiceNumber,
      date: inv.issueDate || (inv.createdAt ? inv.createdAt.slice(0, 10) : ''),
      customerName: inv.clientName,
      customerCompany: inv.clientCompany,
      total: inv.total,
      paidAmount: inv.paidAmount || (inv.status === 'paid' ? inv.total : 0),
      balanceDue: inv.balanceDue !== undefined ? inv.balanceDue : (inv.status === 'paid' ? 0 : inv.total),
      status: inv.status,
      categoryNames:
        inv.items && inv.items.length > 0
          ? Array.from(
              new Set(
                inv.items.map(
                  (i) => resolveItemCategory(i, inv.categoryId, inv.categoryName, categoryMap).categoryName
                )
              )
            )
          : [resolveItemCategory({} as any, inv.categoryId, inv.categoryName, categoryMap).categoryName],
    })),
    ...filteredBills.map((b) => ({
      id: b.id,
      type: 'bill' as const,
      number: b.billNumber,
      date: b.billDate || (b.createdAt ? b.createdAt.slice(0, 10) : ''),
      customerName: b.customerName,
      customerCompany: b.customerCompany || b.customerName,
      total: b.total,
      paidAmount: b.paidAmount,
      balanceDue: b.balanceDue,
      status: b.paymentStatus,
      categoryNames:
        b.items && b.items.length > 0
          ? Array.from(
              new Set(
                b.items.map(
                  (i) => resolveItemCategory(i, b.categoryId, b.categoryName, categoryMap).categoryName
                )
              )
            )
          : [resolveItemCategory({} as any, b.categoryId, b.categoryName, categoryMap).categoryName],
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return {
    kpis,
    categoryPerformance,
    revenueTrend,
    paymentMethodBreakdown,
    customerRankings,
    statusDistribution,
    drillDownDocuments,
    filterSummary: {
      appliedPreset: filters.datePreset,
      startDate,
      endDate,
      totalMatchingDocs: totalDocuments,
    },
  };
}

