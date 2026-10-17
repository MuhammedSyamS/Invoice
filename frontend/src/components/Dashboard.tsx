import React, { useState, useMemo } from 'react';
import type { Invoice, Bill, Payment, Client, Expense } from '../types/invoice';
import { getCurrencySymbol } from '../services/storageService';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  Eye,
  ArrowUpRight,
  Receipt,
  CreditCard,
  FileText,
  X,
  Search,
  Scale,
  User,
  HelpCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardProps {
  invoices: Invoice[];
  bills: Bill[];
  payments: Payment[];
  expenses?: Expense[];
  clients: Client[];
  onNewInvoice: () => void;
  onNewBill: () => void;
  onNewClient: () => void;
  onNewQuote: () => void;
  onRecordPayment: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onViewBill: (bill: Bill) => void;
  onNavigateTab: (tab: any) => void;
  currencySymbol: string;
}

type MetricModalType = 'collected' | 'outstanding' | 'expenses' | 'net' | null;

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  bills,
  payments,
  expenses = [],
  clients,
  onNewInvoice,
  onNewBill,
  onNewClient,
  onNewQuote,
  onRecordPayment,
  onViewInvoice,
  onViewBill,
  onNavigateTab,
  currencySymbol,
}) => {
  // Modal State for Deep-dive Financial Breakdown
  const [activeMetricModal, setActiveMetricModal] = useState<MetricModalType>(null);
  const [modalSearch, setModalSearch] = useState<string>('');
  const [modalFilter, setModalFilter] = useState<string>('all');

  // Real Financial Calculations
  const totalRevenueCollected = useMemo(() => {
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  // Unpaid Invoices (outstanding receivables)
  const unpaidInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.status === 'cancelled' || inv.status === 'paid') return false;
      const bal = inv.balanceDue !== undefined ? inv.balanceDue : inv.total;
      return bal > 0;
    });
  }, [invoices]);

  const invoiceOutstanding = useMemo(() => {
    return unpaidInvoices.reduce((sum, inv) => {
      const bal = inv.balanceDue !== undefined ? inv.balanceDue : inv.total;
      return sum + bal;
    }, 0);
  }, [unpaidInvoices]);

  // Unpaid Bills (outstanding receivables/payables)
  const unpaidBills = useMemo(() => {
    return bills.filter((b) => {
      if (b.paymentStatus === 'cancelled' || b.paymentStatus === 'paid') return false;
      const bal = b.balanceDue !== undefined ? b.balanceDue : b.total;
      return bal > 0;
    });
  }, [bills]);

  const billOutstanding = useMemo(() => {
    return unpaidBills.reduce((sum, b) => {
      const bal = b.balanceDue !== undefined ? b.balanceDue : b.total;
      return sum + bal;
    }, 0);
  }, [unpaidBills]);

  const totalOutstanding = invoiceOutstanding + billOutstanding;

  // Expenses Calculations
  const validExpenses = useMemo(() => expenses || [], [expenses]);
  const totalExpenses = useMemo(() => {
    return validExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [validExpenses]);

  // Net Cash Flow (Collected Revenue minus Expenses)
  const netCashFlow = totalRevenueCollected - totalExpenses;

  // Overdue Invoices
  const overdueInvoices = useMemo(() => {
    return invoices.filter((inv) => inv.status === 'overdue' && (inv.balanceDue ?? inv.total) > 0);
  }, [invoices]);

  const overdueTotal = useMemo(() => {
    return overdueInvoices.reduce((sum, inv) => sum + (inv.balanceDue ?? inv.total), 0);
  }, [overdueInvoices]);

  // Format Helper
  const formatAmount = (num?: number, code?: string) => {
    const val = typeof num === 'number' && !isNaN(num) ? num : 0;
    const symbol = code ? getCurrencySymbol(code) : currencySymbol;
    return `${symbol}${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // Dynamic Chart Data Calculation (Last 6 Months from actual invoices + bills + payments)
  const getMonthlyData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const mStr = monthNames[mIdx];

      const monthInvoices = invoices.filter((inv) => {
        const invDate = new Date(inv.issueDate);
        return invDate.getMonth() === mIdx && invDate.getFullYear() === yr;
      });

      const monthBills = bills.filter((b) => {
        const bDate = new Date(b.billDate);
        return bDate.getMonth() === mIdx && bDate.getFullYear() === yr;
      });

      const monthPayments = payments.filter((p) => {
        const pDate = new Date(p.paymentDate);
        return pDate.getMonth() === mIdx && pDate.getFullYear() === yr;
      });

      const billed =
        monthInvoices.reduce((s, inv) => s + inv.total, 0) +
        monthBills.reduce((s, b) => s + b.total, 0);

      const collected = monthPayments.reduce((s, p) => s + p.amount, 0);

      result.push({
        month: mStr,
        Billed: billed,
        Collected: collected,
      });
    }

    return result;
  };

  const chartData = getMonthlyData();

  // Combine recent documents (invoices + bills)
  const combinedRecentDocs = [
    ...invoices.map((i) => ({ ...i, docType: 'invoice' as const, date: i.issueDate })),
    ...bills.map((b) => ({
      id: b.id,
      docType: 'bill' as const,
      number: b.billNumber,
      clientCompany: b.customerCompany || b.customerName,
      clientName: b.customerName,
      date: b.billDate,
      dueDate: b.dueDate || b.billDate,
      total: b.total,
      currency: b.currency,
      status: b.paymentStatus,
      rawBill: b,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  // Filtered lists for the active modal
  const searchLower = modalSearch.toLowerCase().trim();

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch =
        !searchLower ||
        (p.customerName && p.customerName.toLowerCase().includes(searchLower)) ||
        (p.customerCompany && p.customerCompany.toLowerCase().includes(searchLower)) ||
        (p.documentNumber && p.documentNumber.toLowerCase().includes(searchLower)) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(searchLower)) ||
        (p.notes && p.notes.toLowerCase().includes(searchLower));

      const matchesFilter =
        modalFilter === 'all' ||
        (modalFilter === 'invoice' && p.documentType === 'invoice') ||
        (modalFilter === 'bill' && p.documentType === 'bill') ||
        p.paymentMethod.toLowerCase() === modalFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [payments, searchLower, modalFilter]);

  const filteredOutstandingInvoices = useMemo(() => {
    if (modalFilter === 'bills') return [];
    return unpaidInvoices.filter((inv) => {
      const matchesSearch =
        !searchLower ||
        inv.invoiceNumber.toLowerCase().includes(searchLower) ||
        inv.clientName.toLowerCase().includes(searchLower) ||
        (inv.clientCompany && inv.clientCompany.toLowerCase().includes(searchLower));
      const matchesOverdue = modalFilter !== 'overdue' || inv.status === 'overdue';
      return matchesSearch && matchesOverdue;
    });
  }, [unpaidInvoices, searchLower, modalFilter]);

  const filteredOutstandingBills = useMemo(() => {
    if (modalFilter === 'invoices' || modalFilter === 'overdue') return [];
    return unpaidBills.filter((b) => {
      const matchesSearch =
        !searchLower ||
        b.billNumber.toLowerCase().includes(searchLower) ||
        b.customerName.toLowerCase().includes(searchLower) ||
        (b.customerCompany && b.customerCompany.toLowerCase().includes(searchLower));
      return matchesSearch;
    });
  }, [unpaidBills, searchLower, modalFilter]);

  const filteredExpenses = useMemo(() => {
    return validExpenses.filter((exp) => {
      const matchesSearch =
        !searchLower ||
        exp.category.toLowerCase().includes(searchLower) ||
        (exp.payee && exp.payee.toLowerCase().includes(searchLower)) ||
        (exp.reason && exp.reason.toLowerCase().includes(searchLower)) ||
        (exp.description && exp.description.toLowerCase().includes(searchLower)) ||
        (exp.createdBy && exp.createdBy.toLowerCase().includes(searchLower)) ||
        (exp.notes && exp.notes.toLowerCase().includes(searchLower));

      const matchesFilter =
        modalFilter === 'all' || exp.category.toLowerCase() === modalFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [validExpenses, searchLower, modalFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 className="page-title">Financial Command Center</h1>
          <p className="page-subtitle">
            Real-time cash flow overview, payment settlements, and billing lifecycle for your enterprise.
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button onClick={onNewInvoice} className="btn btn-primary btn-sm">
            <Plus size={14} />
            <span>Create Invoice</span>
          </button>
          <button onClick={onNewBill} className="btn btn-secondary btn-sm">
            <Receipt size={14} />
            <span>Create Bill</span>
          </button>
          <button onClick={onRecordPayment} className="btn btn-secondary btn-sm">
            <CreditCard size={14} />
            <span>Record Payment</span>
          </button>
          <button onClick={onNewQuote} className="btn btn-secondary btn-sm">
            <FileText size={14} />
            <span>Create Quote</span>
          </button>
          <button onClick={onNewClient} className="btn btn-secondary btn-sm">
            <Users size={14} />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* 4 Interactive Clickable Metric Cards */}
      <div className="grid-4">
        {/* Card 1: Amount We Got (Revenue Collected) */}
        <div
          className="card card-hover clickable-kpi-card"
          onClick={() => {
            setActiveMetricModal('collected');
            setModalSearch('');
            setModalFilter('all');
          }}
          style={{
            cursor: 'pointer',
            position: 'relative',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            transition: 'all 0.2s ease',
          }}
          title="Click to view full rupee breakdown of all payments received"
        >
          <div className="stat-header">
            <span className="stat-label" style={{ fontWeight: 700 }}>
              Amount We Got (Collected)
            </span>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)', marginTop: '0.35rem' }}>
            {formatAmount(totalRevenueCollected)}
          </div>
          <div className="stat-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <TrendingUp size={13} color="var(--success)" />
              <span>{payments.length} verified payment receipt(s)</span>
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--success)',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '2px 7px',
                borderRadius: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <span>🔍 Click to view</span>
            </span>
          </div>
        </div>

        {/* Card 2: Total Outstanding Receivables */}
        <div
          className="card card-hover clickable-kpi-card"
          onClick={() => {
            setActiveMetricModal('outstanding');
            setModalSearch('');
            setModalFilter('all');
          }}
          style={{
            cursor: 'pointer',
            position: 'relative',
            border: totalOutstanding > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color)',
            transition: 'all 0.2s ease',
          }}
          title="Click to view who owes what and why"
        >
          <div className="stat-header">
            <span className="stat-label" style={{ fontWeight: 700 }}>
              Outstanding Amount (Pending)
            </span>
            <div
              className="stat-icon"
              style={{
                background: totalOutstanding > 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)',
                color: totalOutstanding > 0 ? 'var(--warning)' : 'var(--text-muted)',
              }}
            >
              <Clock size={16} />
            </div>
          </div>
          <div
            className="stat-value"
            style={{ color: totalOutstanding > 0 ? 'var(--warning)' : 'var(--text-primary)', marginTop: '0.35rem' }}
          >
            {formatAmount(totalOutstanding)}
          </div>
          <div className="stat-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{unpaidInvoices.length + unpaidBills.length} pending client document(s)</span>
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--warning)',
                background: 'rgba(245, 158, 11, 0.12)',
                padding: '2px 7px',
                borderRadius: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <span>🔍 Click to inspect</span>
            </span>
          </div>
        </div>

        {/* Card 3: Total Expenses Disbursed */}
        <div
          className="card card-hover clickable-kpi-card"
          onClick={() => {
            setActiveMetricModal('expenses');
            setModalSearch('');
            setModalFilter('all');
          }}
          style={{
            cursor: 'pointer',
            position: 'relative',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            transition: 'all 0.2s ease',
          }}
          title="Click to view full details: who spent, why, when, and category"
        >
          <div className="stat-header">
            <span className="stat-label" style={{ fontWeight: 700 }}>
              Total Expenses (Disbursed)
            </span>
            <div className="stat-icon" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#f43f5e', marginTop: '0.35rem' }}>
            {formatAmount(totalExpenses)}
          </div>
          <div className="stat-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{validExpenses.length} audited expense item(s)</span>
            <span
              style={{
                fontSize: '0.72rem',
                color: '#f43f5e',
                background: 'rgba(244, 63, 94, 0.12)',
                padding: '2px 7px',
                borderRadius: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <span>🔍 Click for audit</span>
            </span>
          </div>
        </div>

        {/* Card 4: Net Cash Position (Collected - Expenses) */}
        <div
          className="card card-hover clickable-kpi-card"
          onClick={() => {
            setActiveMetricModal('net');
            setModalSearch('');
            setModalFilter('all');
          }}
          style={{
            cursor: 'pointer',
            position: 'relative',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            transition: 'all 0.2s ease',
          }}
          title="Click to view Net Cash Calculation (Collected minus Expenses)"
        >
          <div className="stat-header">
            <span className="stat-label" style={{ fontWeight: 700 }}>
              Net Cash Flow (In Hand)
            </span>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--info)' }}>
              <Scale size={16} />
            </div>
          </div>
          <div
            className="stat-value"
            style={{ color: netCashFlow >= 0 ? 'var(--info)' : 'var(--danger)', marginTop: '0.35rem' }}
          >
            {formatAmount(netCashFlow)}
          </div>
          <div className="stat-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Revenue minus disbursements</span>
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--info)',
                background: 'rgba(59, 130, 246, 0.12)',
                padding: '2px 7px',
                borderRadius: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <span>🔍 Click formula</span>
            </span>
          </div>
        </div>
      </div>

      {/* Overdue Invoices Alert Banner if any exist */}
      {overdueInvoices.length > 0 && (
        <div
          className="card"
          style={{
            border: '1px solid var(--danger-border)',
            background: 'rgba(239, 68, 68, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem 1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.95rem' }}>
                Action Required: {overdueInvoices.length} Overdue Invoice(s) Detected
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Total past-due collection of {formatAmount(overdueTotal)}. Immediate customer follow-up recommended.
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveMetricModal('outstanding');
              setModalFilter('overdue');
            }}
            className="btn btn-sm"
            style={{
              background: 'var(--danger)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
            }}
          >
            <span>Audit Overdue Invoices</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      )}

      {/* Main Charts & Analytics */}
      <div className="dashboard-layout-grid">
        {/* Revenue Trend Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Billed vs. Realized Cash Flow Trend
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Monthly sales invoicing vs verified collections
              </p>
            </div>
            <span className="badge badge-sent">Fiscal Year 2026</span>
          </div>

          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
                <XAxis dataKey="month" stroke="var(--border-color)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis stroke="var(--border-color)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                  }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="Billed" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBilled)" />
                <Area type="monotone" dataKey="Collected" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCollected)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio Status Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              Portfolio Status Breakdown
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 600 }}>Paid Invoices & Bills</span>
                  <span style={{ fontWeight: 700 }}>
                    {invoices.filter((i) => i.status === 'paid').length + bills.filter((b) => b.paymentStatus === 'paid').length} / {invoices.length + bills.length}
                  </span>
                </div>
                <div style={{ height: '6px', width: '100%', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${((invoices.filter((i) => i.status === 'paid').length + bills.filter((b) => b.paymentStatus === 'paid').length) / Math.max(invoices.length + bills.length, 1)) * 100}%`,
                      background: 'var(--success)',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Pending Sent Invoices</span>
                  <span style={{ fontWeight: 700 }}>
                    {invoices.filter((i) => i.status === 'sent').length}
                  </span>
                </div>
                <div style={{ height: '6px', width: '100%', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(invoices.filter((i) => i.status === 'sent').length / Math.max(invoices.length, 1)) * 100}%`,
                      background: 'var(--info)',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--danger)' }}>Overdue Past Due</span>
                  <span style={{ fontWeight: 700 }}>{overdueInvoices.length}</span>
                </div>
                <div style={{ height: '6px', width: '100%', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(overdueInvoices.length / Math.max(invoices.length, 1)) * 100}%`,
                      background: 'var(--danger)',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Draft Documents</span>
                  <span style={{ fontWeight: 700 }}>
                    {invoices.filter((i) => i.status === 'draft').length}
                  </span>
                </div>
                <div style={{ height: '6px', width: '100%', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(invoices.filter((i) => i.status === 'draft').length / Math.max(invoices.length, 1)) * 100}%`,
                      background: 'var(--text-muted)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('invoices')}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', marginTop: '1.25rem' }}
          >
            <span>View Full Invoices Directory</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Recent Invoices & Bills Activity Feed */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Recent Sales & Billing Activity
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Latest invoices and bills issued across accounts
            </p>
          </div>
          <button onClick={() => onNavigateTab('invoices')} className="btn btn-outline btn-sm">
            View All Ledger
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="table-container responsive-desktop-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Doc #</th>
                <th>Client / Organization</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {combinedRecentDocs.map((doc, idx) => {
                const isInv = doc.docType === 'invoice';
                const docNum = isInv ? (doc as Invoice).invoiceNumber : (doc as any).number;
                return (
                  <tr key={`${doc.docType}-${doc.id || idx}`}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        {isInv ? <FileText size={13} color="var(--info)" /> : <Receipt size={13} color="var(--warning)" />}
                        <span>{isInv ? 'Invoice' : 'Bill'}</span>
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontWeight: 700 }}>
                      {docNum}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{doc.clientCompany || doc.clientName || 'Client'}</div>
                      {doc.clientName && doc.clientName !== doc.clientCompany && (
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>{doc.clientName}</div>
                      )}
                    </td>
                    <td>{doc.date || '-'}</td>
                    <td style={{ fontWeight: 700 }}>
                      {formatAmount(doc.total, doc.currency)}
                    </td>
                    <td>
                      <span className={`badge badge-${doc.status || 'draft'}`}>{(doc.status || 'draft').replace('_', ' ')}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          if (isInv) {
                            onViewInvoice(doc as Invoice);
                          } else {
                            onViewBill((doc as any).rawBill);
                          }
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Touch Cards View */}
        <div className="responsive-mobile-cards">
          {combinedRecentDocs.map((doc, idx) => {
            const isInv = doc.docType === 'invoice';
            const docNum = isInv ? (doc as Invoice).invoiceNumber : (doc as any).number;
            return (
              <div key={`m-${doc.docType}-${doc.id || idx}`} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                      {isInv ? <FileText size={14} color="var(--info)" /> : <Receipt size={14} color="var(--warning)" />}
                      <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {docNum}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {doc.clientCompany || doc.clientName || 'Client'}
                    </div>
                  </div>
                  <span className={`badge badge-${doc.status || 'draft'}`}>
                    {(doc.status || 'draft').replace('_', ' ')}
                  </span>
                </div>

                <div className="mobile-data-card-meta">
                  <div className="mobile-data-card-meta-row">
                    <span className="mobile-data-card-meta-label">Date Issued</span>
                    <span className="mobile-data-card-meta-value">{doc.date || '-'}</span>
                  </div>
                  <div className="mobile-data-card-meta-row">
                    <span className="mobile-data-card-meta-label">Document Total</span>
                    <span className="mobile-data-card-meta-value" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {formatAmount(doc.total, doc.currency)}
                    </span>
                  </div>
                </div>

                <div className="mobile-data-card-actions">
                  <button
                    onClick={() => {
                      if (isInv) {
                        onViewInvoice(doc as Invoice);
                      } else {
                        onViewBill((doc as any).rawBill);
                      }
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', minHeight: '36px' }}
                  >
                    <Eye size={14} />
                    <span>View {isInv ? 'Invoice' : 'Bill'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FINANCIAL AUDIT & RUPEE EXPLANATION MODAL (WHEN USER CLICKS ANY KPI BOX)  */}
      {/* ========================================================================= */}
      {activeMetricModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveMetricModal(null);
          }}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: '960px',
              width: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.75)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1.25rem',
                marginBottom: '1.25rem',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background:
                        activeMetricModal === 'collected'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : activeMetricModal === 'outstanding'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : activeMetricModal === 'expenses'
                          ? 'rgba(244, 63, 94, 0.15)'
                          : 'rgba(59, 130, 246, 0.15)',
                      color:
                        activeMetricModal === 'collected'
                          ? 'var(--success)'
                          : activeMetricModal === 'outstanding'
                          ? 'var(--warning)'
                          : activeMetricModal === 'expenses'
                          ? '#f43f5e'
                          : 'var(--info)',
                    }}
                  >
                    {activeMetricModal === 'collected' && <DollarSign size={20} />}
                    {activeMetricModal === 'outstanding' && <Clock size={20} />}
                    {activeMetricModal === 'expenses' && <TrendingDown size={20} />}
                    {activeMetricModal === 'net' && <Scale size={20} />}
                  </div>

                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {activeMetricModal === 'collected' && 'Amount We Got (Revenue Collected) — Rupee Ledger'}
                      {activeMetricModal === 'outstanding' && 'Outstanding Amount (Receivables Due) — Full Breakdown'}
                      {activeMetricModal === 'expenses' && 'Company Expenses (Disbursements) — Detailed Audit'}
                      {activeMetricModal === 'net' && 'Net Cash Position & Liquidity — Financial Statement'}
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem', margin: 0 }}>
                      Complete mathematical explanation and itemized record of every rupee.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveMetricModal(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.4rem', borderRadius: '50%' }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* ========================================================= */}
            {/* 1. MATHEMATICAL FORMULA EXPLANATION BANNER                 */}
            {/* ========================================================= */}
            <div
              style={{
                borderRadius: '10px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <HelpCircle size={17} color="var(--primary-color)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  How this amount is calculated in your SaaS:
                </span>
              </div>

              {/* Case 1: Collected */}
              {activeMetricModal === 'collected' && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: 'rgba(16, 185, 129, 0.08)',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span>Sum of all {payments.length} verified payment receipt(s)</span>
                    <span style={{ color: 'var(--success)' }}>= {formatAmount(totalRevenueCollected)}</span>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Every single rupee recorded here has been received through verified client settlements against your issued invoices and bills.
                    Below is the itemized transaction ledger displaying the payment date, customer, payment method (UPI, Bank Transfer, Cash), reference numbers, and notes.
                  </p>
                </div>
              )}

              {/* Case 2: Outstanding */}
              {activeMetricModal === 'outstanding' && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.65rem',
                      background: 'rgba(245, 158, 11, 0.08)',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      fontSize: '0.925rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span>Invoice Pending: <strong style={{ color: 'var(--warning)' }}>{formatAmount(invoiceOutstanding)}</strong> ({unpaidInvoices.length} inv)</span>
                    <span style={{ color: 'var(--text-muted)' }}>+</span>
                    <span>Bill Pending: <strong style={{ color: 'var(--warning)' }}>{formatAmount(billOutstanding)}</strong> ({unpaidBills.length} bills)</span>
                    <span style={{ color: 'var(--text-muted)' }}>=</span>
                    <span>Total Outstanding: <strong style={{ color: 'var(--warning)', fontSize: '1.05rem' }}>{formatAmount(totalOutstanding)}</strong></span>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    This ₹{totalOutstanding.toLocaleString('en-IN')} represents the live unpaid balance your clients owe your company. For every document,
                    the formula is: <code>Remaining Balance = Total Amount - Paid/Advance Amount Received</code>.
                  </p>
                </div>
              )}

              {/* Case 3: Expenses */}
              {activeMetricModal === 'expenses' && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: 'rgba(244, 63, 94, 0.08)',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span>Sum of all {validExpenses.length} audited expense line items</span>
                    <span style={{ color: '#f43f5e' }}>= {formatAmount(totalExpenses)}</span>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Every single disbursement is tracked in database with complete audit details: <strong>Who</strong> authorized and logged it,
                    <strong>Why</strong> (business reason/purpose/project), <strong>When & Time</strong> (exact timestamp), category, and payment channel.
                  </p>
                </div>
              )}

              {/* Case 4: Net Position */}
              {activeMetricModal === 'net' && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.65rem',
                      background: 'rgba(59, 130, 246, 0.08)',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      fontSize: '0.925rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span>Amount We Got: <strong style={{ color: 'var(--success)' }}>+{formatAmount(totalRevenueCollected)}</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>−</span>
                    <span>Total Expenses: <strong style={{ color: '#f43f5e' }}>−{formatAmount(totalExpenses)}</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>=</span>
                    <span>Net Operating Cash: <strong style={{ color: netCashFlow >= 0 ? 'var(--info)' : 'var(--danger)', fontSize: '1.05rem' }}>{formatAmount(netCashFlow)}</strong></span>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    This represents your true liquid cash position: all realized collections from customers minus all operational disbursements.
                  </p>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* 2. SUMMARY METRIC PILLS / STATS                           */}
            {/* ========================================================= */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              {activeMetricModal === 'collected' && (
                <>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>UPI Collections</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {formatAmount(payments.filter((p) => p.paymentMethod === 'UPI').reduce((s, p) => s + p.amount, 0))}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bank Transfer / NEFT</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {formatAmount(payments.filter((p) => p.paymentMethod === 'Bank Transfer').reduce((s, p) => s + p.amount, 0))}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cash Receipts</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {formatAmount(payments.filter((p) => p.paymentMethod === 'Cash').reduce((s, p) => s + p.amount, 0))}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Other / Card</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {formatAmount(payments.filter((p) => p.paymentMethod !== 'UPI' && p.paymentMethod !== 'Bank Transfer' && p.paymentMethod !== 'Cash').reduce((s, p) => s + p.amount, 0))}
                    </div>
                  </div>
                </>
              )}

              {activeMetricModal === 'outstanding' && (
                <>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Invoices Pending</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.2rem' }}>
                      {formatAmount(invoiceOutstanding)} ({unpaidInvoices.length})
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bills Pending</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.2rem' }}>
                      {formatAmount(billOutstanding)} ({unpaidBills.length})
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Past Due Overdue</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.2rem' }}>
                      {formatAmount(overdueTotal)} ({overdueInvoices.length})
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Clients with Balances</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {new Set([...unpaidInvoices.map((i) => i.clientName), ...unpaidBills.map((b) => b.customerName)]).size} of {clients.length} Clients
                    </div>
                  </div>
                </>
              )}

              {activeMetricModal === 'expenses' && (
                <>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Distinct Expense Categories</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {new Set(validExpenses.map((e) => e.category)).size} Categories
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Projects / Reasons Logged</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {new Set(validExpenses.map((e) => e.reason || 'General').filter(Boolean)).size} Distinct Reasons
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Team Creators</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {new Set(validExpenses.map((e) => e.createdBy || 'Admin')).size} Members
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Outflow</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f43f5e', marginTop: '0.2rem' }}>
                      {formatAmount(totalExpenses)}
                    </div>
                  </div>
                </>
              )}

              {activeMetricModal === 'net' && (
                <>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gross Revenue Inflow</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.2rem' }}>
                      {formatAmount(totalRevenueCollected)}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gross Operational Outflow</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f43f5e', marginTop: '0.2rem' }}>
                      {formatAmount(totalExpenses)}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Operating Cash Margin</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--info)', marginTop: '0.2rem' }}>
                      {totalRevenueCollected > 0
                        ? `${Math.round(((totalRevenueCollected - totalExpenses) / totalRevenueCollected) * 100)}%`
                        : '0%'}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Net Cash Retained</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: netCashFlow >= 0 ? 'var(--info)' : 'var(--danger)', marginTop: '0.2rem' }}>
                      {formatAmount(netCashFlow)}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ========================================================= */}
            {/* 3. SEARCH & FILTER TOOLBAR INSIDE MODAL                   */}
            {/* ========================================================= */}
            <div
              style={{
                display: 'flex',
                gap: '0.65rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search customer, document #, reason, payee, or notes..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem' }}
                />
              </div>

              {activeMetricModal === 'collected' && (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {['all', 'invoice', 'bill', 'UPI', 'Bank Transfer', 'Cash'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setModalFilter(f)}
                      className={`btn btn-sm ${modalFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
                    >
                      {f === 'all' ? 'All Channels' : f}
                    </button>
                  ))}
                </div>
              )}

              {activeMetricModal === 'outstanding' && (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'All Unpaid' },
                    { id: 'invoices', label: `Invoices (${unpaidInvoices.length})` },
                    { id: 'bills', label: `Bills (${unpaidBills.length})` },
                    { id: 'overdue', label: `Overdue Only (${overdueInvoices.length})` },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setModalFilter(btn.id)}
                      className={`btn btn-sm ${modalFilter === btn.id ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}

              {activeMetricModal === 'expenses' && (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {['all', ...Array.from(new Set(validExpenses.map((e) => e.category)))].slice(0, 5).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setModalFilter(cat)}
                      className={`btn btn-sm ${modalFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {cat === 'all' ? 'All Categories' : cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* 4. ITEMIZED RUPEE LEDGER TABLES                           */}
            {/* ========================================================= */}
            <div
              className="table-container"
              style={{
                maxHeight: '380px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
              }}
            >
              {/* TABLE: AMOUNT WE GOT (COLLECTED) */}
              {activeMetricModal === 'collected' && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer / Payer</th>
                      <th>Linked Document</th>
                      <th>Payment Method</th>
                      <th>Reference / UTR</th>
                      <th style={{ textAlign: 'right' }}>Amount Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          No payment receipts match your search/filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((p) => (
                        <tr key={p.id}>
                          <td>{p.paymentDate}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {p.customerCompany || p.customerName || 'Customer'}
                            </div>
                            {p.customerCompany && p.customerName && p.customerCompany !== p.customerName && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{p.customerName}</div>
                            )}
                          </td>
                          <td>
                            <span
                              className="font-mono"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                              }}
                            >
                              {p.documentType === 'invoice' ? <FileText size={12} color="var(--info)" /> : <Receipt size={12} color="var(--warning)" />}
                              <span>{p.documentNumber || p.documentId}</span>
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-paid" style={{ fontSize: '0.75rem' }}>
                              {p.paymentMethod}
                            </span>
                          </td>
                          <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {p.referenceNumber || '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)', fontSize: '0.95rem' }}>
                            {formatAmount(p.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TABLE: OUTSTANDING AMOUNT */}
              {activeMetricModal === 'outstanding' && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Doc #</th>
                      <th>Customer / Organization</th>
                      <th>Issue / Due Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Total Billed</th>
                      <th style={{ textAlign: 'right' }}>Paid So Far</th>
                      <th style={{ textAlign: 'right' }}>Pending Balance</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOutstandingInvoices.length === 0 && filteredOutstandingBills.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          No pending outstanding documents match your filter.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {filteredOutstandingInvoices.map((inv) => {
                          const bal = inv.balanceDue !== undefined ? inv.balanceDue : inv.total;
                          const paid = inv.paidAmount || (inv.total - bal);
                          const isOver = inv.status === 'overdue';
                          return (
                            <tr key={inv.id} style={{ background: isOver ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
                              <td className="font-mono" style={{ fontWeight: 700 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <FileText size={12} color="var(--info)" />
                                  <span>{inv.invoiceNumber}</span>
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{inv.clientCompany || inv.clientName}</div>
                                {inv.clientCompany && inv.clientName !== inv.clientCompany && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{inv.clientName}</div>
                                )}
                              </td>
                              <td style={{ fontSize: '0.8rem' }}>
                                <div>{inv.issueDate}</div>
                                <div style={{ color: isOver ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: isOver ? 700 : 400 }}>
                                  Due: {inv.dueDate || '-'}
                                </div>
                              </td>
                              <td>
                                <span className={`badge badge-${inv.status}`}>{inv.status.replace('_', ' ')}</span>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatAmount(inv.total, inv.currency)}</td>
                              <td style={{ textAlign: 'right', color: 'var(--success)' }}>{formatAmount(paid, inv.currency)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--warning)', fontSize: '0.95rem' }}>
                                {formatAmount(bal, inv.currency)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMetricModal(null);
                                    onViewInvoice(inv);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                                >
                                  <Eye size={12} />
                                  <span>Inspect</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredOutstandingBills.map((b) => {
                          const bal = b.balanceDue !== undefined ? b.balanceDue : b.total;
                          const paid = b.paidAmount || (b.total - bal);
                          return (
                            <tr key={b.id}>
                              <td className="font-mono" style={{ fontWeight: 700 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Receipt size={12} color="var(--warning)" />
                                  <span>{b.billNumber}</span>
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{b.customerCompany || b.customerName}</div>
                              </td>
                              <td style={{ fontSize: '0.8rem' }}>
                                <div>{b.billDate}</div>
                                <div style={{ color: 'var(--text-secondary)' }}>Due: {b.dueDate || '-'}</div>
                              </td>
                              <td>
                                <span className={`badge badge-${b.paymentStatus}`}>{b.paymentStatus.replace('_', ' ')}</span>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatAmount(b.total, b.currency)}</td>
                              <td style={{ textAlign: 'right', color: 'var(--success)' }}>{formatAmount(paid, b.currency)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--warning)', fontSize: '0.95rem' }}>
                                {formatAmount(bal, b.currency)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMetricModal(null);
                                    onViewBill(b);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                                >
                                  <Eye size={12} />
                                  <span>Inspect</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </tbody>
                </table>
              )}

              {/* TABLE: EXPENSES DISBURSED */}
              {activeMetricModal === 'expenses' && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Payee / Vendor</th>
                      <th>Category</th>
                      <th>Why / Reason (Purpose)</th>
                      <th>Payment Method</th>
                      <th>Who Logged It</th>
                      <th>When & Time</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          No expense disbursements match your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((exp) => (
                        <tr key={exp.id}>
                          <td>{exp.date}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{exp.payee || 'Vendor'}</td>
                          <td>
                            <span className="badge badge-draft" style={{ fontSize: '0.75rem' }}>
                              {exp.category}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                background: 'rgba(99, 102, 241, 0.12)',
                                color: '#818cf8',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              {exp.reason || 'General Overhead'}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-paid" style={{ fontSize: '0.72rem' }}>
                              {exp.paymentMethod || 'UPI'}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                              <User size={12} color="var(--info)" />
                              <span>{exp.createdBy || 'Admin'}</span>
                            </span>
                          </td>
                          <td style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {formatDateTime(exp.createdAt || exp.date)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#f43f5e', fontSize: '0.95rem' }}>
                            {formatAmount(exp.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TABLE: NET CASH FLOW STATEMENT */}
              {activeMetricModal === 'net' && (
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    {/* Inflows column */}
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          color: 'var(--success)',
                          marginBottom: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <TrendingUp size={16} />
                        <span>Recent Realized Inflows (+{formatAmount(totalRevenueCollected)})</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {payments.slice(0, 6).map((p) => (
                          <div
                            key={p.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.5rem 0.75rem',
                              background: 'var(--bg-input)',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>{p.customerName || p.customerCompany}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                {p.paymentDate} • {p.paymentMethod}
                              </div>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>+{formatAmount(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Outflows column */}
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          color: '#f43f5e',
                          marginBottom: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <TrendingDown size={16} />
                        <span>Recent Outflows (−{formatAmount(totalExpenses)})</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {validExpenses.slice(0, 6).map((e) => (
                          <div
                            key={e.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.5rem 0.75rem',
                              background: 'var(--bg-input)',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>{e.payee || e.category}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                {e.date} • {e.reason || e.category}
                              </div>
                            </div>
                            <span style={{ fontWeight: 700, color: '#f43f5e' }}>−{formatAmount(e.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.25rem',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {activeMetricModal === 'collected' && `Showing ${filteredPayments.length} of ${payments.length} verified receipts`}
                {activeMetricModal === 'outstanding' && `Showing ${filteredOutstandingInvoices.length + filteredOutstandingBills.length} pending document(s)`}
                {activeMetricModal === 'expenses' && `Showing ${filteredExpenses.length} of ${validExpenses.length} audited expense items`}
                {activeMetricModal === 'net' && `Calculated from ${payments.length} receipts and ${validExpenses.length} disbursements`}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {activeMetricModal === 'outstanding' && (
                  <button
                    onClick={() => {
                      setActiveMetricModal(null);
                      onRecordPayment();
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    <CreditCard size={14} />
                    <span>Record Payment Receipt</span>
                  </button>
                )}
                {activeMetricModal === 'expenses' && (
                  <button
                    onClick={() => {
                      setActiveMetricModal(null);
                      onNavigateTab('expenses');
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus size={14} />
                    <span>Open Expenses Center</span>
                  </button>
                )}
                <button onClick={() => setActiveMetricModal(null)} className="btn btn-secondary btn-sm">
                  Close Audit View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
