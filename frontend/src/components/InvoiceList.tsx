import React, { useState } from 'react';
import type { Invoice } from '../types/invoice';
import { getCurrencySymbol } from '../services/storageService';
import {
  Search,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  Download,
  Copy,
  Trash2,
  FileText,
} from 'lucide-react';

interface InvoiceListProps {
  invoices: Invoice[];
  onNewInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onMarkPaid: (invoiceId: string) => void;
  onDuplicateInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  onNewInvoice,
  onViewInvoice,
  onEditInvoice,
  onMarkPaid,
  onDuplicateInvoice,
  onDeleteInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ['Invoice Number', 'Client Company', 'Client Name', 'Issue Date', 'Due Date', 'Total', 'Currency', 'Status'];
    const rows = filteredInvoices.map((inv) => [
      inv.invoiceNumber,
      `"${inv.clientCompany}"`,
      `"${inv.clientName}"`,
      inv.issueDate,
      inv.dueDate,
      inv.total,
      inv.currency,
      inv.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `highphaus_invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return invoices.length;
    return invoices.filter((i) => i.status === status).length;
  };

  const formatAmount = (num: number, currencyCode: string) => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Invoice Directory & Ledger
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Manage invoices, status updates, PDF downloads, and payments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={exportToCSV} className="btn btn-secondary">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button onClick={onNewInvoice} className="btn btn-primary">
            <Plus size={18} />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Status Tabs */}
          <div className="filter-tabs-scroll">
            {['all', 'draft', 'sent', 'overdue', 'paid', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: statusFilter === st ? 'var(--text-primary)' : 'transparent',
                  background: statusFilter === st ? 'var(--bg-card-light)' : 'var(--bg-input)',
                  color: statusFilter === st ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {st} ({getStatusCount(st)})
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by invoice # or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.3rem' }}
            />
          </div>
        </div>
      </div>

      {/* Invoices Desktop Table View */}
      <div className="table-container responsive-desktop-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client / Company</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <FileText size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <div>No invoices match your filter criteria.</div>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-mono" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                    {inv.invoiceNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.clientCompany}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{inv.clientName}</div>
                  </td>
                  <td>{inv.issueDate}</td>
                  <td>{inv.dueDate}</td>
                  <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatAmount(inv.total, inv.currency)}
                  </td>
                  <td>
                    <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="btn btn-secondary btn-sm"
                        title="View / Download PDF"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => onEditInvoice(inv)}
                        className="btn btn-secondary btn-sm"
                        title="Edit Invoice"
                      >
                        <Edit size={14} />
                      </button>
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => onMarkPaid(inv.id)}
                          className="btn btn-secondary btn-sm"
                          title="Mark as Paid"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => onDuplicateInvoice(inv)}
                        className="btn btn-secondary btn-sm"
                        title="Duplicate Invoice"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteInvoice(inv.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete Invoice"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoices Mobile Cards View */}
      <div className="responsive-mobile-cards">
        {filteredInvoices.length === 0 ? (
          <div className="card empty-state" style={{ padding: '2.5rem 1rem' }}>
            <FileText size={36} style={{ opacity: 0.3 }} />
            <div className="empty-state-title">No invoices found</div>
            <div className="empty-state-desc">No invoices match your filter criteria.</div>
            <button onClick={onNewInvoice} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
              <Plus size={14} />
              <span>Create First Invoice</span>
            </button>
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <div key={inv.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {inv.invoiceNumber}
                </span>
                <span className={`badge badge-${inv.status}`}>{inv.status}</span>
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{inv.clientCompany}</div>
                {inv.clientName && inv.clientName !== inv.clientCompany && (
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>{inv.clientName}</div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Due Date</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{inv.dueDate}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Amount</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatAmount(inv.total, inv.currency)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: inv.status !== 'paid' ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)', gap: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)' }}>
                <button onClick={() => onViewInvoice(inv)} className="btn btn-secondary btn-sm" style={{ width: '100%', padding: '0.45rem 0' }} title="View / Download PDF">
                  <Eye size={15} />
                </button>
                <button onClick={() => onEditInvoice(inv)} className="btn btn-secondary btn-sm" style={{ width: '100%', padding: '0.45rem 0' }} title="Edit Invoice">
                  <Edit size={15} />
                </button>
                {inv.status !== 'paid' && (
                  <button onClick={() => onMarkPaid(inv.id)} className="btn btn-primary btn-sm" style={{ width: '100%', padding: '0.45rem 0' }} title="Mark as Paid">
                    <CheckCircle size={15} />
                  </button>
                )}
                <button onClick={() => onDuplicateInvoice(inv)} className="btn btn-secondary btn-sm" style={{ width: '100%', padding: '0.45rem 0' }} title="Duplicate Invoice">
                  <Copy size={15} />
                </button>
                <button onClick={() => onDeleteInvoice(inv.id)} className="btn btn-danger btn-sm" style={{ width: '100%', padding: '0.45rem 0' }} title="Delete Invoice">
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
