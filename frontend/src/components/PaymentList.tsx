import React, { useState } from 'react';
import type { Payment, Invoice, Bill, BusinessSettings } from '../types/invoice';
import { getCurrencySymbol } from '../services/storageService';
import {
  CreditCard,
  Search,
  Plus,
  Download,
  Trash2,
  Receipt,
  FileText,
} from 'lucide-react';

interface PaymentListProps {
  payments: Payment[];
  invoices: Invoice[];
  bills: Bill[];
  settings: BusinessSettings;
  onOpenRecordPayment: () => void;
  onDeletePayment: (paymentId: string) => void;
}

export const PaymentList: React.FC<PaymentListProps> = ({
  payments,
  invoices,
  bills,
  settings,
  onOpenRecordPayment,
  onDeletePayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const currencySymbol = getCurrencySymbol(settings.currency);

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  const totalOutstanding =
    invoices
      .filter((i) => i.status !== 'cancelled' && i.status !== 'paid')
      .reduce((s, i) => s + (i.balanceDue !== undefined ? i.balanceDue : i.total), 0) +
    bills
      .filter((b) => b.paymentStatus !== 'cancelled' && b.paymentStatus !== 'paid')
      .reduce((s, b) => s + b.balanceDue, 0);

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.customerCompany && p.customerCompany.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const exportToCSV = () => {
    const headers = ['Payment ID', 'Document Type', 'Document #', 'Customer', 'Amount', 'Date', 'Method', 'Reference #'];
    const rows = filteredPayments.map((p) => [
      p.id,
      p.documentType,
      p.documentNumber,
      `"${p.customerCompany || p.customerName}"`,
      p.amount,
      p.paymentDate,
      p.paymentMethod,
      `"${p.referenceNumber}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payment_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const methodsList = ['all', 'UPI', 'Bank Transfer', 'Card', 'Cash', 'Cheque'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Payments Ledger & Settlements</h1>
          <p className="page-subtitle">
            Comprehensive audit trail of all customer settlements, partial receipts, UPI transactions, and bank wires.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportToCSV} className="btn btn-secondary">
            <Download size={15} />
            <span>Export Ledger CSV</span>
          </button>
          <button onClick={onOpenRecordPayment} className="btn btn-primary">
            <Plus size={16} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid-3">
        <div className="card">
          <div className="stat-label">Total Realized Inflow</div>
          <div className="stat-value" style={{ color: 'var(--success)', marginTop: '0.25rem' }}>
            {currencySymbol}{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-footer">Across {payments.length} verified transactions</div>
        </div>

        <div className="card">
          <div className="stat-label">Total Payment Transactions</div>
          <div className="stat-value" style={{ marginTop: '0.25rem' }}>
            {payments.length}
          </div>
          <div className="stat-footer">Bank wire, UPI, POS & Cash collections</div>
        </div>

        <div className="card">
          <div className="stat-label">Pending Receivables Balance</div>
          <div className="stat-value" style={{ color: totalOutstanding > 0 ? 'var(--warning)' : 'var(--text-primary)', marginTop: '0.25rem' }}>
            {currencySymbol}{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-footer">Across unpaid invoices & bills</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card" style={{ padding: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="filter-tabs-scroll">
            {methodsList.map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`filter-tab-btn ${methodFilter === m ? 'active' : ''}`}
              >
                {m === 'all' ? 'All Channels' : m}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search
              size={15}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by doc #, customer, ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.2rem' }}
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Receipt / ID</th>
              <th>Document #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Method</th>
              <th>Reference #</th>
              <th>Amount Settled</th>
              <th>Notes</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <CreditCard size={24} />
                    </div>
                    <div className="empty-state-title">No payment records found</div>
                    <div className="empty-state-desc">
                      Record client payments, partial settlements, or bank transfers against open invoices or bills.
                    </div>
                    <button onClick={onOpenRecordPayment} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
                      <Plus size={14} />
                      <span>Record Payment</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {p.id}
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                      {p.documentType === 'invoice' ? <FileText size={13} color="var(--info)" /> : <Receipt size={13} color="var(--warning)" />}
                      <span>{p.documentNumber}</span>
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.customerCompany || p.customerName}</div>
                  </td>
                  <td>{p.paymentDate}</td>
                  <td>
                    <span className="badge badge-draft">{p.paymentMethod}</span>
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {p.referenceNumber || '-'}
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--success)' }}>
                    {currencySymbol}{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.notes || '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => onDeletePayment(p.id)}
                      className="btn btn-danger btn-sm"
                      title="Delete Payment Entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
