import React, { useState } from 'react';
import type { Expense, PaymentMethod, BusinessSettings } from '../types/invoice';
import { getCurrencySymbol } from '../services/storageService';
import {
  PieChart,
  Plus,
  Search,
  Trash2,
  X,
  Save,
  Download,
} from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  settings: BusinessSettings;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  settings,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [category, setCategory] = useState<Expense['category']>('Software & Subscriptions');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const currencySymbol = getCurrencySymbol(settings.currency);

  const categories = [
    'all',
    'Software & Subscriptions',
    'Marketing & Ads',
    'Office & Supplies',
    'Contractors & Freelancers',
    'Utilities',
    'Travel',
    'Other',
  ];

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payee.trim() || amount <= 0) return;

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      category,
      payee: payee.trim(),
      amount: Number(amount) || 0,
      taxAmount: Number(taxAmount) || 0,
      date,
      paymentMethod,
      referenceNumber: referenceNumber.trim(),
      notes: notes.trim(),
      status: 'paid',
      createdAt: new Date().toISOString(),
    };

    onAddExpense(newExpense);
    setShowModal(false);
    setPayee('');
    setAmount(0);
    setTaxAmount(0);
    setReferenceNumber('');
    setNotes('');
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.payee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const exportToCSV = () => {
    const headers = ['ID', 'Date', 'Category', 'Payee', 'Amount', 'Tax Amount', 'Payment Method', 'Notes'];
    const rows = filteredExpenses.map((e) => [
      e.id,
      e.date,
      `"${e.category}"`,
      `"${e.payee}"`,
      e.amount,
      e.taxAmount || 0,
      e.paymentMethod,
      `"${e.notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `business_expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Business Operating Expenses</h1>
          <p className="page-subtitle">
            Track overhead costs, software subscriptions, contractor payouts, and tax deductible expenses for accurate P&L.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportToCSV} className="btn btn-secondary">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid-3">
        <div className="card">
          <div className="stat-label">Total Outflows Logged</div>
          <div className="stat-value" style={{ color: 'var(--danger)', marginTop: '0.25rem' }}>
            {currencySymbol}{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-footer">{expenses.length} expense items recorded</div>
        </div>

        <div className="card">
          <div className="stat-label">Input Tax Deductible (GST)</div>
          <div className="stat-value" style={{ marginTop: '0.25rem' }}>
            {currencySymbol}{expenses.reduce((s, e) => s + (e.taxAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-footer">Eligible for input tax credit offset</div>
        </div>

        <div className="card">
          <div className="stat-label">Top Expense Category</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-primary)' }}>
            Software & Contractors
          </div>
          <div className="stat-footer">Monthly agency operating overhead</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ padding: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="filter-tabs-scroll">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`filter-tab-btn ${categoryFilter === c ? 'active' : ''}`}
              >
                {c === 'all' ? 'All Categories' : c}
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
              placeholder="Search expenses by payee or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.2rem' }}
            />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Payee / Vendor</th>
              <th>Category</th>
              <th>Method</th>
              <th>Reference #</th>
              <th>Amount</th>
              <th>GST Tax</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <PieChart size={24} />
                    </div>
                    <div className="empty-state-title">No expenses recorded</div>
                    <div className="empty-state-desc">
                      Log recurring software subscriptions, freelancer invoices, and agency expenses to monitor real business margins.
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
                      <Plus size={14} />
                      <span>Log First Expense</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td>{exp.date}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{exp.payee}</div>
                    {exp.notes && (
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>{exp.notes}</div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-draft">{exp.category}</span>
                  </td>
                  <td>{exp.paymentMethod}</td>
                  <td className="font-mono" style={{ fontSize: '0.75rem' }}>{exp.referenceNumber || '-'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--danger)' }}>
                    {currencySymbol}{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="font-mono">
                    {exp.taxAmount ? `${currencySymbol}${exp.taxAmount.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => onDeleteExpense(exp.id)}
                      className="btn btn-danger btn-sm"
                      title="Delete Expense"
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

      {/* Log Expense Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Log Business Expense
              </h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Expense['category'])}
                  className="form-select"
                >
                  {categories.filter((c) => c !== 'all').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payee / Merchant / Vendor</label>
                <input
                  type="text"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  className="form-input"
                  placeholder="e.g. AWS, Adobe, or Contractor Name"
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Expense Amount ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="form-input font-mono"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GST Tax Included ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(Number(e.target.value))}
                    className="form-input font-mono"
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Expense Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Channel</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="form-select"
                  >
                    <option value="Card">Corporate Credit Card</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Bank Transfer">Bank Wire (NEFT/IMPS)</option>
                    <option value="Cash">Cash Expense</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Receipt Reference / Invoice #</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="form-input font-mono"
                  placeholder="e.g. INV-99120"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes & Purpose</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input"
                  placeholder="Business justification"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={15} />
                  <span>Log Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
