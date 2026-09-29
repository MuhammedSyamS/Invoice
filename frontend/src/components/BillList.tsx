import React, { useState } from 'react';
import type { Bill, BillStatus } from '../types/invoice';
import { getCurrencySymbol } from '../services/storageService';
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  Receipt,
  Download,
  CreditCard,
} from 'lucide-react';

interface BillListProps {
  bills: Bill[];
  onNewBill: () => void;
  onViewBill: (bill: Bill) => void;
  onEditBill: (bill: Bill) => void;
  onDuplicateBill: (bill: Bill) => void;
  onDeleteBill: (billId: string) => void;
  onRecordPayment: (bill: Bill) => void;
}

export const BillList: React.FC<BillListProps> = ({
  bills,
  onNewBill,
  onViewBill,
  onEditBill,
  onDuplicateBill,
  onDeleteBill,
  onRecordPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.customerCompany && bill.customerCompany.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || bill.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (st: string) => {
    if (st === 'all') return bills.length;
    return bills.filter((b) => b.paymentStatus === st).length;
  };

  const formatAmount = (num: number, currencyCode: string = 'INR') => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportToCSV = () => {
    const headers = ['Bill #', 'Customer', 'Date', 'Payment Method', 'Total', 'Paid', 'Balance', 'Status'];
    const rows = filteredBills.map((b) => [
      b.billNumber,
      `"${b.customerCompany || b.customerName}"`,
      b.billDate,
      b.paymentMethod,
      b.total,
      b.paidAmount,
      b.balanceDue,
      b.paymentStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_bills_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Quick Sales Bills & Cash Receipts</h1>
          <p className="page-subtitle">
            Create immediate POS sales bills, cash receipts, and direct tax invoices with instant payment reconciliation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportToCSV} className="btn btn-secondary">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button onClick={onNewBill} className="btn btn-primary">
            <Plus size={16} />
            <span>Create Bill</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Status Tabs */}
          <div className="filter-tabs-scroll">
            {(['all', 'paid', 'partially_paid', 'unpaid', 'cancelled'] as Array<'all' | BillStatus>).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`filter-tab-btn ${statusFilter === st ? 'active' : ''}`}
                style={{ textTransform: 'capitalize' }}
              >
                {st === 'all' ? 'All Bills' : st.replace('_', ' ')} ({getStatusCount(st)})
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search
              size={15}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by bill # or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.2rem' }}
            />
          </div>
        </div>
      </div>

      {/* Bills Table */}
      {/* Bills Desktop Table View */}
      <div className="table-container responsive-desktop-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bill #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Payment Method</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Receipt size={24} />
                    </div>
                    <div className="empty-state-title">No bills found</div>
                    <div className="empty-state-desc">
                      Create quick sales receipts and retail/counter bills with automatic tax calculation and payment recording.
                    </div>
                    <button onClick={onNewBill} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
                      <Plus size={14} />
                      <span>Create First Bill</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredBills.map((bill) => (
                <tr key={bill.id}>
                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {bill.billNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{bill.customerCompany || bill.customerName}</div>
                    {bill.customerCompany && (
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>{bill.customerName}</div>
                    )}
                  </td>
                  <td>{bill.billDate}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {bill.paymentMethod}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatAmount(bill.total, bill.currency)}</td>
                  <td style={{ color: 'var(--success)' }}>{formatAmount(bill.paidAmount, bill.currency)}</td>
                  <td style={{ fontWeight: 600, color: bill.balanceDue > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {formatAmount(bill.balanceDue, bill.currency)}
                  </td>
                  <td>
                    <span className={`badge badge-${bill.paymentStatus}`}>
                      {bill.paymentStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                      <button
                        onClick={() => onViewBill(bill)}
                        className="btn btn-secondary btn-sm"
                        title="View / Print Bill"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => onEditBill(bill)}
                        className="btn btn-secondary btn-sm"
                        title="Edit Bill"
                      >
                        <Edit size={13} />
                      </button>
                      {bill.balanceDue > 0 && (
                        <button
                          onClick={() => onRecordPayment(bill)}
                          className="btn btn-primary btn-sm"
                          title="Record Payment"
                        >
                          <CreditCard size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => onDuplicateBill(bill)}
                        className="btn btn-secondary btn-sm"
                        title="Duplicate Bill"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteBill(bill.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete Bill"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bills Mobile Cards View */}
      <div className="responsive-mobile-cards">
        {filteredBills.length === 0 ? (
          <div className="card empty-state" style={{ padding: '2.5rem 1rem' }}>
            <div className="empty-state-icon">
              <Receipt size={24} />
            </div>
            <div className="empty-state-title">No bills found</div>
            <div className="empty-state-desc">
              Create quick sales receipts and counter bills with instant payment logging.
            </div>
            <button onClick={onNewBill} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
              <Plus size={14} />
              <span>Create First Bill</span>
            </button>
          </div>
        ) : (
          filteredBills.map((bill) => (
            <div key={bill.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {bill.billNumber}
                </span>
                <span className={`badge badge-${bill.paymentStatus}`}>
                  {bill.paymentStatus.replace('_', ' ')}
                </span>
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {bill.customerCompany || bill.customerName}
                </div>
                {bill.customerCompany && (
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>{bill.customerName}</div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {bill.billDate} • {bill.paymentMethod}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem', background: 'var(--bg-input)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total</div>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>{formatAmount(bill.total, bill.currency)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Paid</div>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--success)' }}>{formatAmount(bill.paidAmount, bill.currency)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Balance</div>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', color: bill.balanceDue > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {formatAmount(bill.balanceDue, bill.currency)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: bill.balanceDue > 0 ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)', gap: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)' }}>
                <button onClick={() => onViewBill(bill)} className="btn btn-secondary btn-sm" style={{ width: '100%', padding: '0.45rem 0' }} title="View / Print">
                  <Eye size={15} />
                </button>
                <button onClick={() => onEditBill(bill)} className="btn btn-secondary btn-sm" style={{ width: '100%', padding: '0.45rem 0' }} title="Edit Bill">
                  <Edit size={15} />
                </button>
                {bill.balanceDue > 0 && (
                  <button onClick={() => onRecordPayment(bill)} className="btn btn-primary btn-sm" style={{ width: '100%', padding: '0.45rem 0' }} title="Record Payment">
                    <CreditCard size={15} />
                  </button>
                )}
                <button onClick={() => onDuplicateBill(bill)} className="btn btn-secondary btn-sm" style={{ width: '100%', padding: '0.45rem 0' }} title="Duplicate">
                  <Copy size={15} />
                </button>
                <button onClick={() => onDeleteBill(bill.id)} className="btn btn-danger btn-sm" style={{ width: '100%', padding: '0.45rem 0' }} title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
