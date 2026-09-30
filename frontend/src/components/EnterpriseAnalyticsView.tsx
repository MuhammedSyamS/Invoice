import React, { useState, useMemo } from 'react';
import type { Invoice, Bill, Payment, Client, Category, BusinessSettings } from '../types/invoice';
import {
  executeEnterpriseAnalytics,
  type AnalyticsFilterParams,
  type DateFilterPreset,
  type DocumentDrillDownItem,
  type CategoryPerformanceRecord,
} from '../services/analyticsEngine';
import { getCurrencySymbol } from '../services/storageService';
import {
  TrendingUp,
  Download,
  Filter,
  X,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Users,
  Clock,
  Layers,
  Search,
  Eye,
  RefreshCw,
  ChevronRight,
  SlidersHorizontal,
  Bookmark,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface EnterpriseAnalyticsViewProps {
  invoices: Invoice[];
  bills: Bill[];
  payments: Payment[];
  clients: Client[];
  categories: Category[];
  settings: BusinessSettings;
  onViewInvoice?: (invoice: Invoice) => void;
  onViewBill?: (bill: Bill) => void;
}

// Custom theme-aware tooltips outside render to prevent Recharts 'null' / 'void' issue and black font color issue
const CategoryBarTooltip = ({ active, payload, label, currencySymbol = '₹' }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '0.65rem 0.85rem',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
        color: 'var(--text-primary)',
        fontSize: '0.8rem',
        minWidth: '190px',
      }}
    >
      <div
        style={{
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: '0.4rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.25rem',
          fontSize: '0.85rem',
        }}
      >
        {label || 'Category Performance'}
      </div>
      {payload.map((entry: any, idx: number) => {
        const val = Number(entry.value) || 0;
        const seriesName =
          entry.name && entry.name !== 'undefined' && entry.name !== 'null'
            ? entry.name
            : entry.dataKey === 'revenue'
            ? 'Invoiced Revenue'
            : 'Realized Collections';
        const dotColor = entry.fill || entry.color || (entry.dataKey === 'revenue' ? '#3b82f6' : '#10b981');
        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '0.3rem',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: dotColor }} />
              {seriesName}:
            </span>
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {currencySymbol}{val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
        );
      })}
    </div>
  );
};

const TrendAreaTooltip = ({ active, payload, label, currencySymbol = '₹' }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '0.65rem 0.85rem',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
        color: 'var(--text-primary)',
        fontSize: '0.8rem',
        minWidth: '190px',
      }}
    >
      <div
        style={{
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: '0.4rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.25rem',
          fontSize: '0.85rem',
        }}
      >
        {label && label !== 'undefined NaN' && !label.includes('undefined') && !label.includes('NaN') ? label : 'Trend Period'}
      </div>
      {payload.map((entry: any, idx: number) => {
        const raw = Number(entry.value);
        const val = isNaN(raw) ? 0 : raw;
        const seriesName =
          entry.name && entry.name !== 'undefined' && entry.name !== 'null'
            ? entry.name
            : entry.dataKey === 'revenue'
            ? 'Invoiced Revenue'
            : 'Cash Collected';
        const dotColor = entry.stroke || entry.fill || entry.color || (entry.dataKey === 'revenue' ? '#3b82f6' : '#10b981');
        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '0.3rem',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: dotColor }} />
              {seriesName}:
            </span>
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {currencySymbol}{val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
        );
      })}
    </div>
  );
};

export const EnterpriseAnalyticsView: React.FC<EnterpriseAnalyticsViewProps> = ({
  invoices,
  bills,
  payments,
  clients,
  categories,
  settings,
  onViewInvoice,
  onViewBill,
}) => {
  const currencySymbol = getCurrencySymbol(settings.currency);

  // Filter state
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [customerId, setCustomerId] = useState<string>('all');
  const [documentType, setDocumentType] = useState<'all' | 'invoice' | 'bill'>('all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'partially_paid' | 'unpaid' | 'overdue' | 'cancelled'>('all');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Mobile Filter Drawer State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Drill-Down Modal State
  const [drillDownTarget, setDrillDownTarget] = useState<{
    title: string;
    description: string;
    items: DocumentDrillDownItem[];
  } | null>(null);

  // Saved Filter Presets (simple local state)
  const [savedFilterName, setSavedFilterName] = useState<string>('');
  const [savedPresets, setSavedPresets] = useState<{ name: string; filters: AnalyticsFilterParams }[]>(() => [
    {
      name: 'Unpaid Invoices',
      filters: {
        datePreset: 'all',
        categoryId: 'all',
        customerId: 'all',
        documentType: 'invoice',
        paymentStatus: 'unpaid',
        paymentMethod: 'all',
      },
    },
    {
      name: 'This Quarter All',
      filters: {
        datePreset: 'this_quarter',
        categoryId: 'all',
        customerId: 'all',
        documentType: 'all',
        paymentStatus: 'all',
        paymentMethod: 'all',
      },
    },
  ]);

  // Construct active filter params object
  const activeFilters = useMemo<AnalyticsFilterParams>(() => ({
    datePreset,
    startDate: customStart || undefined,
    endDate: customEnd || undefined,
    categoryId,
    customerId,
    documentType,
    paymentStatus,
    paymentMethod,
    searchTerm,
  }), [datePreset, customStart, customEnd, categoryId, customerId, documentType, paymentStatus, paymentMethod, searchTerm]);

  // Execute single authoritative enterprise calculation engine
  const report = useMemo(() => {
    return executeEnterpriseAnalytics({
      invoices,
      bills,
      payments,
      categories,
      clients,
      filters: activeFilters,
    });
  }, [invoices, bills, payments, categories, clients, activeFilters]);

  const { kpis, categoryPerformance, revenueTrend, paymentMethodBreakdown, customerRankings, statusDistribution, drillDownDocuments, filterSummary } = report;

  // Active filter chips count
  const activeFilterChips = useMemo(() => {
    const chips: { label: string; onClear: () => void }[] = [];

    if (datePreset !== 'all') {
      const presetLabels: Record<DateFilterPreset, string> = {
        all: 'All Time',
        today: 'Today',
        yesterday: 'Yesterday',
        this_week: 'This Week',
        last_week: 'Last Week',
        this_month: 'This Month',
        last_month: 'Last Month',
        this_quarter: 'This Quarter',
        this_year: 'This Year',
        last_year: 'Last Year',
        custom: customStart && customEnd ? `${customStart} → ${customEnd}` : 'Custom Date',
      };
      chips.push({
        label: `Date: ${presetLabels[datePreset]}`,
        onClear: () => {
          setDatePreset('all');
          setCustomStart('');
          setCustomEnd('');
        },
      });
    }

    if (categoryId !== 'all') {
      const cat = categories.find((c) => c.id === categoryId);
      chips.push({
        label: `Category: ${cat ? cat.name : 'Uncategorized'}`,
        onClear: () => setCategoryId('all'),
      });
    }

    if (customerId !== 'all') {
      const cust = clients.find((c) => c.id === customerId);
      chips.push({
        label: `Client: ${cust ? cust.company || cust.name : customerId}`,
        onClear: () => setCustomerId('all'),
      });
    }

    if (documentType !== 'all') {
      chips.push({
        label: `Type: ${documentType === 'invoice' ? 'Invoices Only' : 'Bills Only'}`,
        onClear: () => setDocumentType('all'),
      });
    }

    if (paymentStatus !== 'all') {
      chips.push({
        label: `Status: ${paymentStatus.replace('_', ' ')}`,
        onClear: () => setPaymentStatus('all'),
      });
    }

    if (paymentMethod !== 'all') {
      chips.push({
        label: `Method: ${paymentMethod}`,
        onClear: () => setPaymentMethod('all'),
      });
    }

    if (searchTerm.trim()) {
      chips.push({
        label: `Search: "${searchTerm}"`,
        onClear: () => setSearchTerm(''),
      });
    }

    return chips;
  }, [datePreset, customStart, customEnd, categoryId, customerId, documentType, paymentStatus, paymentMethod, searchTerm, categories, clients]);

  const handleResetFilters = () => {
    setDatePreset('all');
    setCustomStart('');
    setCustomEnd('');
    setCategoryId('all');
    setCustomerId('all');
    setDocumentType('all');
    setPaymentStatus('all');
    setPaymentMethod('all');
    setSearchTerm('');
  };

  const handleSaveCurrentFilter = () => {
    const name = savedFilterName.trim() || `Filter ${savedPresets.length + 1}`;
    setSavedPresets((prev) => [...prev, { name, filters: { ...activeFilters } }]);
    setSavedFilterName('');
  };

  const handleApplySavedPreset = (presetFilters: AnalyticsFilterParams) => {
    setDatePreset(presetFilters.datePreset);
    setCustomStart(presetFilters.startDate || '');
    setCustomEnd(presetFilters.endDate || '');
    setCategoryId(presetFilters.categoryId || 'all');
    setCustomerId(presetFilters.customerId || 'all');
    setDocumentType(presetFilters.documentType || 'all');
    setPaymentStatus(presetFilters.paymentStatus || 'all');
    setPaymentMethod(presetFilters.paymentMethod || 'all');
    setSearchTerm(presetFilters.searchTerm || '');
    setIsMobileFilterOpen(false);
  };

  // Export Filtered Analytics CSV
  const handleExportCSV = () => {
    const headers = [
      'Document Type',
      'Document Number',
      'Date',
      'Client / Customer',
      'Categories',
      'Total Amount',
      'Settled Amount',
      'Balance Due',
      'Status',
    ];

    const rows = drillDownDocuments.map((doc) => [
      doc.type.toUpperCase(),
      doc.number,
      doc.date,
      `"${doc.customerCompany || doc.customerName}"`,
      `"${doc.categoryNames.join(', ') || 'Uncategorized'}"`,
      doc.total,
      doc.paidAmount,
      doc.balanceDue,
      doc.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `# HIGHPHAUS ENTERPRISE ANALYTICS REPORT (${new Date().toISOString().slice(0, 10)})`,
        `# Active Preset: ${filterSummary.appliedPreset} (${filterSummary.startDate} to ${filterSummary.endDate})`,
        `# Total Gross Revenue: ${currencySymbol}${kpis.totalRevenue} | Cash Collected: ${currencySymbol}${kpis.amountCollected} | Balance Outstanding: ${currencySymbol}${kpis.outstandingAmount}`,
        '',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `analytics_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatAmount = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Category drill-down trigger
  const handleCategoryDrillDown = (cat: CategoryPerformanceRecord) => {
    const matchedDocs = drillDownDocuments.filter((d) =>
      d.categoryNames.includes(cat.categoryName)
    );
    setDrillDownTarget({
      title: `${cat.categoryName} — Audit & Transaction Drill-Down`,
      description: `Showing all underlying invoices and bills attributed to ${cat.categoryName}. Total Revenue: ${formatAmount(cat.revenue)} | Realized: ${formatAmount(cat.collected)} | Outstanding: ${formatAmount(cat.outstanding)}`,
      items: matchedDocs,
    });
  };

  // Only display categories with non-zero activity in the visual bar chart
  const activeBarCategories = useMemo(() => {
    const withActivity = categoryPerformance.filter(
      (c) => (Number(c.revenue) || 0) > 0 || (Number(c.collected) || 0) > 0
    );
    const source = withActivity.length > 0 ? withActivity : categoryPerformance.slice(0, 6);
    return source.map((c) => ({
      ...c,
      categoryName: c.categoryName || 'Category',
      revenue: Number(c.revenue) || 0,
      collected: Number(c.collected) || 0,
      outstanding: Number(c.outstanding) || 0,
    }));
  }, [categoryPerformance]);



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Enterprise Financial Analytics
            </h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              Live Ledger Aggregation
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Multi-dimensional intelligence across service categories, cash collections, and receivable risk.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Mobile Filter Button */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="btn btn-secondary hide-desktop"
            style={{ position: 'relative' }}
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {activeFilterChips.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--primary-color, #6366f1)',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeFilterChips.length}
              </span>
            )}
          </button>

          {activeFilterChips.length > 0 && (
            <button type="button" onClick={handleResetFilters} className="btn btn-secondary btn-sm" title="Clear all active filters">
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
          )}

          <button type="button" onClick={handleExportCSV} className="btn btn-secondary btn-sm" title="Export CSV of filtered documents">
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Desktop Filter Toolbar */}
      <div className="card hide-mobile" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Date Preset Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '170px' }}>
            <Calendar size={15} color="var(--text-muted)" />
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DateFilterPreset)}
              className="form-select"
              style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem' }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="last_year">Last Year</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* Custom Date Inputs if 'custom' */}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="form-input"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="form-input"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
              />
            </div>
          )}

          {/* Category Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '170px' }}>
            <Layers size={15} color="var(--text-muted)" />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem' }}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="uncategorized">Uncategorized</option>
            </select>
          </div>

          {/* Customer Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '170px' }}>
            <Users size={15} color="var(--text-muted)" />
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem' }}
            >
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Document Type Selector */}
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as any)}
            className="form-select"
            style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem', maxWidth: '140px' }}
          >
            <option value="all">All Doc Types</option>
            <option value="invoice">Invoices Only</option>
            <option value="bill">Bills Only</option>
          </select>

          {/* Payment Status Selector */}
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as any)}
            className="form-select"
            style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem', maxWidth: '140px' }}
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid in Full</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Payment Method Selector */}
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="form-select"
            style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem', maxWidth: '140px' }}
          >
            <option value="all">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Wire</option>
            <option value="Card">Card</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
          </select>

          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by invoice # or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.1rem', fontSize: '0.825rem', padding: '0.45rem 0.65rem 0.45rem 2.1rem' }}
            />
          </div>
        </div>

        {/* Quick Saved Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Bookmark size={13} /> Saved Views:
          </span>
          {savedPresets.map((sp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplySavedPreset(sp.filters)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.725rem', padding: '0.2rem 0.55rem' }}
            >
              {sp.name}
            </button>
          ))}

          <div style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Save current view as..."
              value={savedFilterName}
              onChange={(e) => setSavedFilterName(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.5rem', width: '160px' }}
            />
            <button
              type="button"
              onClick={handleSaveCurrentFilter}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.5rem' }}
            >
              Save View
            </button>
          </div>
        </div>
      </div>

      {/* 3. Active Filter Chips */}
      {activeFilterChips.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Active Filters ({activeFilterChips.length}):
          </span>
          {activeFilterChips.map((chip, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '3px 8px',
                borderRadius: '12px',
                background: 'var(--bg-card-light)',
                border: '1px solid var(--border-color)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onClear}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary-color, #6366f1)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '2px 4px',
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* 4. Top KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* KPI 1: Gross Billed Revenue */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Gross Revenue
            </span>
            <span style={{ padding: '6px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <DollarSign size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {formatAmount(kpis.totalRevenue)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Across {kpis.totalTransactionsCount} documents ({kpis.invoicesCount} invoices, {kpis.billsCount} bills)
          </div>
        </div>

        {/* KPI 2: Cash Realized / Collected */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cash Collected
            </span>
            <span style={{ padding: '6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <TrendingUp size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#10b981' }}>
            {formatAmount(kpis.amountCollected)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
            <span style={{ fontWeight: 800, color: '#10b981' }}>{kpis.collectionRatePercent}%</span>
            <span style={{ color: 'var(--text-muted)' }}>collection realization rate</span>
          </div>
        </div>

        {/* KPI 3: Outstanding Receivables */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Outstanding Balance
            </span>
            <span style={{ padding: '6px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Clock size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: kpis.outstandingAmount > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
            {formatAmount(kpis.outstandingAmount)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Pending across {kpis.unpaidCount + kpis.partiallyPaidCount} open documents
          </div>
        </div>

        {/* KPI 4: Overdue Receivables */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Overdue Risk
            </span>
            <span style={{ padding: '6px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <AlertTriangle size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: kpis.overdueAmount > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {formatAmount(kpis.overdueAmount)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {kpis.overdueCount} document{kpis.overdueCount === 1 ? '' : 's'} past contractual due date
          </div>
        </div>
      </div>

      {/* Status Distribution Ribbon */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--bg-input)',
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Portfolio Status Distribution
        </span>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {statusDistribution.map((sd, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{sd.status}:</span>
              <span
                style={{
                  fontWeight: 800,
                  color:
                    sd.status.includes('Paid in Full')
                      ? '#10b981'
                      : sd.status.includes('Overdue')
                      ? '#ef4444'
                      : sd.status.includes('Partially Paid')
                      ? '#f59e0b'
                      : 'var(--text-primary)',
                }}
              >
                {sd.count} ({sd.percent}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Revenue & Collections Trend Chart */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Revenue & Collections Trend
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Comparing gross invoiced amounts vs realized cash collections over time.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#3b82f6' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#3b82f6' }} /> Revenue
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} /> Collected
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f59e0b' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b' }} /> Outstanding
            </span>
          </div>
        </div>

        {revenueTrend.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No trend points available for the selected filters.
          </div>
        ) : (
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis
                  dataKey="label"
                  stroke="var(--border-color)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--border-color)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip content={<TrendAreaTooltip currencySymbol={currencySymbol} />} />
                <Area type="monotone" dataKey="revenue" name="Invoiced Revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="collected" name="Cash Collected" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCol)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 6. Category Performance Section */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} />
              <span>Service Category Performance & Revenue Share</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Line-item attributed gross billing, proportional realized payments, and outstanding balances per service category.
            </p>
          </div>
        </div>

        {/* Category Visual Bar Chart */}
        {activeBarCategories.length > 0 && (
          <div style={{ height: '240px', width: '100%', marginBottom: '1.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeBarCategories} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis
                  dataKey="categoryName"
                  stroke="var(--border-color)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  interval={0}
                  tickLine={false}
                  angle={-15}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  stroke="var(--border-color)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip content={<CategoryBarTooltip currencySymbol={currencySymbol} />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                <Bar dataKey="revenue" name="Invoiced Revenue" radius={[4, 4, 0, 0]}>
                  {activeBarCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} name="Invoiced Revenue" />
                  ))}
                </Bar>
                <Bar dataKey="collected" name="Realized Collections" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category Performance Table */}
        <div className="table-container responsive-desktop-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Service Category</th>
                <th style={{ textAlign: 'right' }}>Revenue</th>
                <th style={{ textAlign: 'right' }}>Collected</th>
                <th style={{ textAlign: 'right' }}>Outstanding</th>
                <th style={{ textAlign: 'center' }}>Docs</th>
                <th style={{ textAlign: 'right' }}>Share</th>
                <th style={{ textAlign: 'right' }}>Realization</th>
                <th style={{ textAlign: 'right' }}>Audit</th>
              </tr>
            </thead>
            <tbody>
              {categoryPerformance.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No category data matches the active filters.
                  </td>
                </tr>
              ) : (
                categoryPerformance.map((cat) => (
                  <tr key={cat.categoryId} style={{ cursor: 'pointer' }} onClick={() => handleCategoryDrillDown(cat)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color }} />
                        <strong style={{ color: 'var(--text-primary)' }}>{cat.categoryName}</strong>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {formatAmount(cat.revenue)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                      {formatAmount(cat.collected)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: cat.outstanding > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                      {formatAmount(cat.outstanding)}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                      {cat.documentCount}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.8rem', fontWeight: 600 }}>
                      {cat.revenueSharePercent}%
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: cat.realizationRatePercent >= 80 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: cat.realizationRatePercent >= 80 ? '#10b981' : '#f59e0b',
                        }}
                      >
                        {cat.realizationRatePercent}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryDrillDown(cat);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                      >
                        <span>Drill-Down</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Category Cards */}
        <div className="responsive-mobile-cards">
          {categoryPerformance.map((cat) => (
            <div
              key={cat.categoryId}
              className="card"
              onClick={() => handleCategoryDrillDown(cat)}
              style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color }} />
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{cat.categoryName}</strong>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-color, #6366f1)' }}>
                  {cat.revenueSharePercent}% Share
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.5rem', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Revenue</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatAmount(cat.revenue)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Collected</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>{formatAmount(cat.collected)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Due</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: cat.outstanding > 0 ? '#f59e0b' : 'var(--text-muted)' }}>{formatAmount(cat.outstanding)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Bottom Grid: Payment Channels & Customer Intelligence */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Payment Methods Breakdown */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <CreditCard size={17} />
              <span>Payment Methods Realization</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Total: {formatAmount(kpis.amountCollected)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {paymentMethodBreakdown.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No payment transactions recorded for this period.
              </div>
            ) : (
              paymentMethodBreakdown.map((pm, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{pm.method}</span>
                    <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                      {formatAmount(pm.amount)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({pm.sharePercent}%)</span>
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pm.sharePercent}%`,
                        height: '100%',
                        background: idx === 0 ? '#10b981' : idx === 1 ? '#3b82f6' : idx === 2 ? '#6366f1' : '#f59e0b',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Customer Performance */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Users size={17} />
              <span>Top Clients by Billed Revenue</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Top {customerRankings.length} accounts
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {customerRankings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No client transactions match the selected filters.
              </div>
            ) : (
              customerRankings.slice(0, 5).map((cust) => (
                <div
                  key={cust.customerId}
                  onClick={() => {
                    const clientDocs = drillDownDocuments.filter((d) => d.customerCompany === cust.customerCompany);
                    setDrillDownTarget({
                      title: `${cust.customerCompany} — Client Ledger`,
                      description: `Total Billed: ${formatAmount(cust.revenue)} | Realized: ${formatAmount(cust.collected)} | Outstanding: ${formatAmount(cust.outstanding)}`,
                      items: clientDocs,
                    });
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0.75rem',
                    background: 'var(--bg-input)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {cust.customerCompany}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                      {cust.documentCount} doc{cust.documentCount === 1 ? '' : 's'} • Realized: {formatAmount(cust.collected)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {formatAmount(cust.revenue)}
                    </div>
                    {cust.outstanding > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>
                        Due: {formatAmount(cust.outstanding)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 8. Traceable Document Ledger & Drill-Down Button */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Underlying Transactions Ledger ({drillDownDocuments.length})
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Every analytics calculation is 100% traceable to these active records.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDrillDownTarget({
                title: 'All Active Filtered Documents',
                description: `Showing all ${drillDownDocuments.length} underlying documents matching current filter criteria.`,
                items: drillDownDocuments,
              });
            }}
            className="btn btn-secondary btn-sm"
          >
            <Eye size={14} />
            <span>Full Ledger Modal</span>
          </button>
        </div>

        {/* Recent 5 Records Inline */}
        <div className="table-container responsive-desktop-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Doc #</th>
                <th>Client / Company</th>
                <th>Date</th>
                <th>Categories</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Settled</th>
                <th style={{ textAlign: 'right' }}>Balance Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {drillDownDocuments.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No underlying documents match the current filter selection.
                  </td>
                </tr>
              ) : (
                drillDownDocuments.slice(0, 8).map((doc) => (
                  <tr key={`${doc.type}-${doc.id}`}>
                    <td>
                      <span className={`badge badge-${doc.type === 'invoice' ? 'sent' : 'paid'}`} style={{ fontSize: '0.65rem' }}>
                        {doc.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                      {doc.number}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.customerCompany}</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>{doc.customerName}</div>
                    </td>
                    <td>{doc.date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {doc.categoryNames.map((cn, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border-color)',
                              fontWeight: 600,
                            }}
                          >
                            {cn}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {formatAmount(doc.total)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                      {formatAmount(doc.paidAmount)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: doc.balanceDue > 0 ? '#ef4444' : '#10b981' }}>
                      {formatAmount(doc.balanceDue)}
                    </td>
                    <td>
                      <span className={`badge badge-${doc.status}`} style={{ textTransform: 'capitalize' }}>
                        {doc.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 9. Drill-Down Document Modal */}
      {drillDownTarget && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {drillDownTarget.title}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {drillDownTarget.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrillDownTarget(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.35rem 0.5rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }} className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Doc #</th>
                    <th>Date</th>
                    <th>Client / Customer</th>
                    <th>Categories</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Settled</th>
                    <th style={{ textAlign: 'right' }}>Balance Due</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {drillDownTarget.items.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No underlying documents found.
                      </td>
                    </tr>
                  ) : (
                    drillDownTarget.items.map((doc) => (
                      <tr key={`${doc.type}-${doc.id}`}>
                        <td>
                          <span className={`badge badge-${doc.type === 'invoice' ? 'sent' : 'paid'}`}>
                            {doc.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="font-mono" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          {doc.number}
                        </td>
                        <td>{doc.date}</td>
                        <td>{doc.customerCompany}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {doc.categoryNames.map((cn, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: 'var(--bg-input)',
                                  border: '1px solid var(--border-color)',
                                  fontWeight: 600,
                                }}
                              >
                                {cn}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {formatAmount(doc.total)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                          {formatAmount(doc.paidAmount)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: doc.balanceDue > 0 ? '#ef4444' : '#10b981' }}>
                          {formatAmount(doc.balanceDue)}
                        </td>
                        <td>
                          <span className={`badge badge-${doc.status}`} style={{ textTransform: 'capitalize' }}>
                            {doc.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {doc.type === 'invoice' && onViewInvoice && (
                            <button
                              type="button"
                              onClick={() => {
                                const found = invoices.find((i) => i.id === doc.id);
                                if (found) {
                                  setDrillDownTarget(null);
                                  onViewInvoice(found);
                                }
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}
                            >
                              View PDF
                            </button>
                          )}
                          {doc.type === 'bill' && onViewBill && (
                            <button
                              type="button"
                              onClick={() => {
                                const found = bills.find((b) => b.id === doc.id);
                                if (found) {
                                  setDrillDownTarget(null);
                                  onViewBill(found);
                                }
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}
                            >
                              View Bill
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <button type="button" onClick={() => setDrillDownTarget(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Mobile Filter Bottom Drawer / Modal */}
      {isMobileFilterOpen && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={18} color="var(--primary-color, #6366f1)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Analytics Filters
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.35rem 0.5rem' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Date Presets */}
              <div className="form-group">
                <label className="form-label">Date Range</label>
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DateFilterPreset)}
                  className="form-select"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="last_week">Last Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Year</option>
                  <option value="last_year">Last Year</option>
                  <option value="custom">Custom Range...</option>
                </select>
              </div>

              {datePreset === 'custom' && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              {/* Service Category */}
              <div className="form-group">
                <label className="form-label">Service Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="form-select"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="uncategorized">Uncategorized</option>
                </select>
              </div>

              {/* Client */}
              <div className="form-group">
                <label className="form-label">Client Account</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="form-select"
                >
                  <option value="all">All Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company || c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Type */}
              <div className="form-group">
                <label className="form-label">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as any)}
                  className="form-select"
                >
                  <option value="all">All Documents</option>
                  <option value="invoice">Invoices Only</option>
                  <option value="bill">Bills Only</option>
                </select>
              </div>

              {/* Payment Status */}
              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="form-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid in Full</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label className="form-label">Payment Channel</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-select"
                >
                  <option value="all">All Methods</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Wire</option>
                  <option value="Card">Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleResetFilters();
                    setIsMobileFilterOpen(false);
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Reset All
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
