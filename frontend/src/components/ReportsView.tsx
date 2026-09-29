import React, { useState } from 'react';
import type { Invoice, Bill, Payment, Expense, Client, Product, BusinessSettings } from '../types/invoice';
import { getCurrencySymbol } from '../services/storageService';
import {
  TrendingUp,
  Download,
  Printer,
  FileSpreadsheet,
  Users,
} from 'lucide-react';

interface ReportsViewProps {
  invoices: Invoice[];
  bills: Bill[];
  payments: Payment[];
  expenses: Expense[];
  clients: Client[];
  products: Product[];
  settings: BusinessSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  invoices,
  bills,
  payments,
  expenses,
  clients,
  products,
  settings,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'pnl' | 'gst' | 'clients'>('pnl');
  const currencySymbol = getCurrencySymbol(settings.currency);

  // Financial Calculations
  const totalInvoiced = invoices.reduce((s, i) => s + (i.status !== 'cancelled' ? i.total : 0), 0);
  const totalBilled = bills.reduce((s, b) => s + (b.paymentStatus !== 'cancelled' ? b.total : 0), 0);
  const grossSales = totalInvoiced + totalBilled;

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netOperatingProfit = totalCollected - totalExpenses;
  const marginPercent = totalCollected > 0 ? ((netOperatingProfit / totalCollected) * 100).toFixed(1) : '0.0';

  // GST Breakdown
  const invoiceTaxable = invoices.reduce((s, i) => s + (i.status !== 'cancelled' ? (i.subtotal - i.discountTotal) : 0), 0);
  const billTaxable = bills.reduce((s, b) => s + (b.paymentStatus !== 'cancelled' ? (b.subtotal - b.discountTotal) : 0), 0);
  const totalTaxableTurnover = invoiceTaxable + billTaxable;

  const totalCgst =
    invoices.reduce((s, i) => s + (i.status !== 'cancelled' ? (i.cgst || 0) : 0), 0) +
    bills.reduce((s, b) => s + (b.paymentStatus !== 'cancelled' ? (b.cgst || 0) : 0), 0);

  const totalSgst =
    invoices.reduce((s, i) => s + (i.status !== 'cancelled' ? (i.sgst || 0) : 0), 0) +
    bills.reduce((s, b) => s + (b.paymentStatus !== 'cancelled' ? (b.sgst || 0) : 0), 0);

  const totalIgst =
    invoices.reduce((s, i) => s + (i.status !== 'cancelled' ? (i.igst || 0) : 0), 0) +
    bills.reduce((s, b) => s + (b.paymentStatus !== 'cancelled' ? (b.igst || 0) : 0), 0);

  const totalOutputTax = totalCgst + totalSgst + totalIgst;
  const totalInputTaxCredit = expenses.reduce((s, e) => s + (e.taxAmount || 0), 0);
  const netGstPayable = Math.max(0, totalOutputTax - totalInputTaxCredit);

  // Client Performance Ranking
  const clientRankings = clients.map((c) => {
    const cInvoices = invoices.filter((i) => i.clientId === c.id && i.status !== 'cancelled');
    const cBills = bills.filter((b) => b.customerId === c.id && b.paymentStatus !== 'cancelled');
    const billed = cInvoices.reduce((s, i) => s + i.total, 0) + cBills.reduce((s, b) => s + b.total, 0);

    const cPayments = payments.filter((p) => p.customerId === c.id);
    const paid = cPayments.reduce((s, p) => s + p.amount, 0);
    const pending = Math.max(0, billed - paid);

    return {
      client: c,
      totalBilled: billed,
      totalPaid: paid,
      pending,
      docCount: cInvoices.length + cBills.length,
    };
  }).sort((a, b) => b.totalBilled - a.totalBilled);

  const formatAmount = (num: number) => {
    return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportCurrentReport = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    if (activeReportTab === 'pnl') {
      filename = `pnl_report_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ['Metric', 'Amount (INR)'];
      rows = [
        ['Total Invoiced Sales', totalInvoiced],
        ['Total POS / Quick Bills', totalBilled],
        ['Gross Sales Turnover', grossSales],
        ['Realized Cash Collections', totalCollected],
        ['Total Operating Expenses', totalExpenses],
        ['Net Operating Profit', netOperatingProfit],
        ['Operating Profit Margin (%)', marginPercent],
      ];
    } else if (activeReportTab === 'gst') {
      filename = `gst_tax_summary_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ['GST Tax Head', 'Amount (INR)'];
      rows = [
        ['Total Taxable Sales Turnover', totalTaxableTurnover],
        ['Central GST (CGST) Output', totalCgst],
        ['State GST (SGST) Output', totalSgst],
        ['Integrated GST (IGST) Output', totalIgst],
        ['Total Output Tax Liability', totalOutputTax],
        ['Eligible Input Tax Credit (ITC)', totalInputTaxCredit],
        ['Net GST Cash Payable', netGstPayable],
      ];
    } else {
      filename = `client_revenue_analysis_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ['Client / Company', 'Documents', 'Total Billed', 'Collected', 'Outstanding'];
      rows = clientRankings.map((r) => [
        `"${r.client.company || r.client.name}"`,
        r.docCount,
        r.totalBilled,
        r.totalPaid,
        r.pending,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Executive Financial Reports & Audit</h1>
          <p className="page-subtitle">
            Real-time financial analytics, Profit & Loss statements, Indian GST compliance summaries, and customer ledger breakdown.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportCurrentReport} className="btn btn-secondary">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button onClick={() => window.print()} className="btn btn-secondary">
            <Printer size={15} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="card" style={{ padding: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveReportTab('pnl')}
            className={`btn btn-sm ${activeReportTab === 'pnl' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
          >
            <TrendingUp size={14} />
            <span>Profit & Loss Statement</span>
          </button>
          <button
            onClick={() => setActiveReportTab('gst')}
            className={`btn btn-sm ${activeReportTab === 'gst' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
          >
            <FileSpreadsheet size={14} />
            <span>GST Tax Summary</span>
          </button>
          <button
            onClick={() => setActiveReportTab('clients')}
            className={`btn btn-sm ${activeReportTab === 'clients' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
          >
            <Users size={14} />
            <span>Client Revenue Analysis</span>
          </button>
        </div>
      </div>

      {/* REPORT 1: P&L Statement */}
      {activeReportTab === 'pnl' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="grid-3">
            <div className="card">
              <div className="stat-label">Realized Revenue Collected</div>
              <div className="stat-value" style={{ color: 'var(--success)', marginTop: '0.25rem' }}>
                {formatAmount(totalCollected)}
              </div>
              <div className="stat-footer">Gross invoiced volume: {formatAmount(grossSales)} ({products.length} catalog items)</div>
            </div>

            <div className="card">
              <div className="stat-label">Total Operating Expenses</div>
              <div className="stat-value" style={{ color: 'var(--danger)', marginTop: '0.25rem' }}>
                {formatAmount(totalExpenses)}
              </div>
              <div className="stat-footer">Software, contractor & ad overhead</div>
            </div>

            <div className="card">
              <div className="stat-label">Net Operating Margin</div>
              <div className="stat-value" style={{ marginTop: '0.25rem' }}>
                {marginPercent}%
              </div>
              <div className="stat-footer">
                Net Operating Profit: <strong style={{ color: 'var(--text-primary)' }}>{formatAmount(netOperatingProfit)}</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Fiscal Year 2026 Profit & Loss Ledger
            </h3>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Financial Account & Revenue Head</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Total (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Commercial Client Invoices Issued</td>
                    <td><span className="badge badge-sent">Sales Revenue</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totalInvoiced)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Quick Sales Bills & Retail Receipts</td>
                    <td><span className="badge badge-sent">Sales Revenue</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totalBilled)}</td>
                  </tr>
                  <tr style={{ background: 'var(--bg-card-light)', fontWeight: 800 }}>
                    <td>Total Gross Sales Turnover</td>
                    <td>Top-Line Invoiced</td>
                    <td style={{ textAlign: 'right' }}>{formatAmount(grossSales)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>Realized Cash Inflow (Actual Settlements)</td>
                    <td><span className="badge badge-paid">Realized Inflow</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{formatAmount(totalCollected)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: 'var(--danger)' }}>Operating Outflows & Software Overheads</td>
                    <td><span className="badge badge-overdue">Expenses</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>-{formatAmount(totalExpenses)}</td>
                  </tr>
                  <tr style={{ background: 'var(--bg-input)', fontWeight: 900, borderTop: '2px solid var(--border-color)' }}>
                    <td style={{ fontSize: '1rem' }}>NET OPERATING PROFIT</td>
                    <td>Bottom-Line Profit</td>
                    <td style={{ textAlign: 'right', fontSize: '1.1rem', color: netOperatingProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {formatAmount(netOperatingProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: Indian GST Compliance Report */}
      {activeReportTab === 'gst' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="grid-3">
            <div className="card">
              <div className="stat-label">Taxable Sales Turnover</div>
              <div className="stat-value" style={{ marginTop: '0.25rem' }}>
                {formatAmount(totalTaxableTurnover)}
              </div>
              <div className="stat-footer">Pre-tax invoice & bill volume</div>
            </div>

            <div className="card">
              <div className="stat-label">Total Output GST Collected</div>
              <div className="stat-value" style={{ color: 'var(--info)', marginTop: '0.25rem' }}>
                {formatAmount(totalOutputTax)}
              </div>
              <div className="stat-footer">CGST + SGST + IGST liability</div>
            </div>

            <div className="card">
              <div className="stat-label">Net GST Cash Payable</div>
              <div className="stat-value" style={{ color: 'var(--warning)', marginTop: '0.25rem' }}>
                {formatAmount(netGstPayable)}
              </div>
              <div className="stat-footer">After {formatAmount(totalInputTaxCredit)} ITC offset</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              GST Output vs Input Tax Return Ledger
            </h3>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tax Component</th>
                    <th>Rate Basis</th>
                    <th>Jurisdiction</th>
                    <th style={{ textAlign: 'right' }}>Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Central GST (CGST)</td>
                    <td>50% of 18% GST</td>
                    <td>Intra-State Sales</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totalCgst)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>State GST (SGST)</td>
                    <td>50% of 18% GST</td>
                    <td>Intra-State Sales</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totalSgst)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Integrated GST (IGST)</td>
                    <td>Full 18% GST</td>
                    <td>Inter-State Sales</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totalIgst)}</td>
                  </tr>
                  <tr style={{ background: 'var(--bg-card-light)', fontWeight: 800 }}>
                    <td>Total Output Tax Collected</td>
                    <td colSpan={2}>Gross Tax Billed to Clients</td>
                    <td style={{ textAlign: 'right' }}>{formatAmount(totalOutputTax)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>Less: Input Tax Credit (ITC) on Expenses</td>
                    <td colSpan={2}>Vendor GST Paid</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>-{formatAmount(totalInputTaxCredit)}</td>
                  </tr>
                  <tr style={{ background: 'var(--bg-input)', fontWeight: 900, borderTop: '2px solid var(--border-color)' }}>
                    <td style={{ fontSize: '1rem' }}>NET GST PAYABLE TO GOVERNMENT</td>
                    <td colSpan={2}>Due before 20th of succeeding month</td>
                    <td style={{ textAlign: 'right', fontSize: '1.1rem', color: 'var(--warning)' }}>{formatAmount(netGstPayable)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 3: Client Revenue Analysis */}
      {activeReportTab === 'clients' && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Client Account Valuation & Settlement Ranking
          </h3>

          <div className="table-container responsive-desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Client / Organization</th>
                  <th>GSTIN</th>
                  <th>Docs Issued</th>
                  <th>Total Billed</th>
                  <th>Total Paid</th>
                  <th>Outstanding Due</th>
                </tr>
              </thead>
              <tbody>
                {clientRankings.map((r, idx) => (
                  <tr key={r.client.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.client.company || r.client.name}</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>{r.client.email}</div>
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.75rem' }}>{r.client.taxId || '-'}</td>
                    <td>{r.docCount} documents</td>
                    <td style={{ fontWeight: 700 }}>{formatAmount(r.totalBilled)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>{formatAmount(r.totalPaid)}</td>
                    <td style={{ fontWeight: 700, color: r.pending > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {formatAmount(r.pending)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="responsive-mobile-cards">
            {clientRankings.map((r, idx) => (
              <div key={`m-rank-${r.client.id}`} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span className="badge badge-draft" style={{ fontWeight: 800 }}>#{idx + 1}</span>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {r.client.company || r.client.name}
                      </span>
                    </div>
                    {r.client.email && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {r.client.email}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {formatAmount(r.totalBilled)}
                  </div>
                </div>

                <div className="mobile-data-card-meta">
                  <div className="mobile-data-card-meta-row">
                    <span className="mobile-data-card-meta-label">Documents & GSTIN</span>
                    <span className="mobile-data-card-meta-value font-mono" style={{ fontSize: '0.75rem' }}>
                      {r.docCount} docs {r.client.taxId ? `• ${r.client.taxId}` : ''}
                    </span>
                  </div>
                  <div className="mobile-data-card-meta-row">
                    <span className="mobile-data-card-meta-label">Total Settled</span>
                    <span className="mobile-data-card-meta-value" style={{ color: 'var(--success)' }}>
                      {formatAmount(r.totalPaid)}
                    </span>
                  </div>
                  <div className="mobile-data-card-meta-row">
                    <span className="mobile-data-card-meta-label">Outstanding Due</span>
                    <span className="mobile-data-card-meta-value" style={{ color: r.pending > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {formatAmount(r.pending)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
