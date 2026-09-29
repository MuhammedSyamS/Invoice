import React from 'react';
import type { Invoice, Bill, Payment, Client } from '../types/invoice';
import { getCurrencySymbol } from '../services/storageService';
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  Eye,
  ArrowUpRight,
  Receipt,
  CreditCard,
  FileText,
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

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  bills,
  payments,
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
  // Real Financial Calculations
  const totalRevenueCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  const invoiceOutstanding = invoices
    .filter((inv) => inv.status !== 'cancelled' && inv.status !== 'paid')
    .reduce((sum, inv) => sum + (inv.balanceDue !== undefined ? inv.balanceDue : inv.total), 0);

  const billOutstanding = bills
    .filter((b) => b.paymentStatus !== 'cancelled' && b.paymentStatus !== 'paid')
    .reduce((sum, b) => sum + b.balanceDue, 0);

  const totalOutstanding = invoiceOutstanding + billOutstanding;

  const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue');
  const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + (inv.balanceDue ?? inv.total), 0);

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

  const formatAmount = (num?: number, code?: string) => {
    const val = typeof num === 'number' && !isNaN(num) ? num : 0;
    const symbol = code ? getCurrencySymbol(code) : currencySymbol;
    return `${symbol}${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

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

      {/* 4 Metric Cards */}
      <div className="grid-4">
        {/* Card 1: Total Revenue Collected */}
        <div className="card card-hover">
          <div className="stat-header">
            <span className="stat-label">Realized Revenue Collected</span>
            <div className="stat-icon">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)', marginTop: '0.35rem' }}>
            {formatAmount(totalRevenueCollected)}
          </div>
          <div className="stat-footer">
            <TrendingUp size={13} color="var(--success)" />
            <span>Across verified payment receipts</span>
          </div>
        </div>

        {/* Card 2: Total Outstanding */}
        <div className="card card-hover">
          <div className="stat-header">
            <span className="stat-label">Outstanding Receivables</span>
            <div className="stat-icon">
              <Clock size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ color: totalOutstanding > 0 ? 'var(--warning)' : 'var(--text-primary)', marginTop: '0.35rem' }}>
            {formatAmount(totalOutstanding)}
          </div>
          <div className="stat-footer">Pending client settlement</div>
        </div>

        {/* Card 3: Overdue Alerts */}
        <div className="card card-hover" style={{ borderColor: overdueInvoices.length > 0 ? 'var(--danger-border)' : undefined }}>
          <div className="stat-header">
            <span className="stat-label">Overdue Invoices</span>
            <div className="stat-icon" style={{ color: overdueInvoices.length > 0 ? 'var(--danger)' : undefined }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ color: overdueInvoices.length > 0 ? 'var(--danger)' : 'var(--text-primary)', marginTop: '0.35rem' }}>
            {formatAmount(overdueTotal)}
          </div>
          <div className="stat-footer">{overdueInvoices.length} invoice(s) past due terms</div>
        </div>

        {/* Card 4: Active Clients */}
        <div className="card card-hover">
          <div className="stat-header">
            <span className="stat-label">Active Customer Accounts</span>
            <div className="stat-icon">
              <Users size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ marginTop: '0.35rem' }}>
            {clients.length}
          </div>
          <div
            onClick={onNewClient}
            style={{ fontSize: '0.75rem', color: 'var(--text-primary)', marginTop: '0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}
          >
            <span>+ Add new customer profile</span>
            <ArrowUpRight size={13} />
          </div>
        </div>
      </div>

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
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
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
    </div>
  );
};
