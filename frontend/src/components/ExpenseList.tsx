import React, { useState } from 'react';
import type { Expense, PaymentMethod, BusinessSettings, AuthUser } from '../types/invoice';
import { ExportDropdown } from './ExportDropdown';
import type { ExportDataOptions } from '../services/exportService';
import {
  getCurrencySymbol,
  formatAuditDateTime,
  getStoredExpenseCategories,
  addStoredExpenseCategory,
} from '../services/storageService';
import {
  PieChart,
  Plus,
  Search,
  Trash2,
  Edit,
  X,
  Save,
  Check,
  Eye,
  Layers,
  User,
  Clock,
  Target,
  Info,
} from 'lucide-react';
import { CI } from './ClearableInput';

interface ExpenseListProps {
  expenses: Expense[];
  settings: BusinessSettings;
  currentUser?: AuthUser | null;
  expenseCategories?: string[];
  onAddExpenseCategory?: (name: string) => void;
  onAddExpense: (expense: Expense) => void;
  onAddMultipleExpenses?: (expenses: Expense[]) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

interface MultiExpenseRow {
  tempId: string;
  payee: string;
  category: string;
  amount: number;
  taxAmount: number;
  date: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  notes: string;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  settings,
  currentUser,
  expenseCategories,
  onAddExpenseCategory,
  onAddExpense,
  onAddMultipleExpenses,
  onUpdateExpense,
  onDeleteExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Full Details Dossier Modal
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] = useState<Expense | null>(null);

  // Multi-entry Mode vs Single Mode
  const [isMultiItemMode, setIsMultiItemMode] = useState(false);
  const [keepReasonAndLogAnother, setKeepReasonAndLogAnother] = useState(false);
  const [successBannerMsg, setSuccessBannerMsg] = useState<string | null>(null);

  // Custom Category State inside modal
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [customCategoryError, setCustomCategoryError] = useState<string | null>(null);

  // Form State (Single Entry)
  const [reason, setReason] = useState<string>('');
  const [category, setCategory] = useState<string>('Software & Subscriptions');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Form State (Multi Entry for Same Reason)
  const [multiRows, setMultiRows] = useState<MultiExpenseRow[]>([
    {
      tempId: 'row-1',
      payee: '',
      category: 'Software & Subscriptions',
      amount: 0,
      taxAmount: 0,
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Card',
      referenceNumber: '',
      notes: '',
    },
    {
      tempId: 'row-2',
      payee: '',
      category: 'Software & Subscriptions',
      amount: 0,
      taxAmount: 0,
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Card',
      referenceNumber: '',
      notes: '',
    },
  ]);

  const currencySymbol = getCurrencySymbol(settings.currency);

  const activeCategories =
    expenseCategories && expenseCategories.length > 0
      ? expenseCategories
      : getStoredExpenseCategories();

  const categories = ['all', ...activeCategories];

  // Extract all unique reasons
  const uniqueReasons = Array.from(
    new Set(
      expenses
        .map((e) => (e.reason || '').trim())
        .filter((r) => r.length > 0)
    )
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Calculate top spending reason / project
  const spendingByReason = expenses.reduce<Record<string, number>>((acc, exp) => {
    const key = (exp.reason || 'General Overhead').trim();
    acc[key] = (acc[key] || 0) + (Number(exp.amount) || 0);
    return acc;
  }, {});

  const topReasonEntry = Object.entries(spendingByReason).sort((a, b) => b[1] - a[1])[0];
  const topReasonName = topReasonEntry ? topReasonEntry[0] : 'General Overhead';
  const topReasonAmount = topReasonEntry ? topReasonEntry[1] : 0;

  const handleOpenAddModal = (presetReason?: string, presetCategory?: string) => {
    setEditingExpense(null);
    setReason(presetReason || '');
    setCategory(presetCategory || 'Software & Subscriptions');
    setPayee('');
    setAmount(0);
    setTaxAmount(0);
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('Card');
    setReferenceNumber('');
    setNotes('');
    setIsAddingCustomCategory(false);
    setCustomCategoryInput('');
    setCustomCategoryError(null);
    setIsMultiItemMode(false);
    setKeepReasonAndLogAnother(false);
    setSuccessBannerMsg(null);
    setMultiRows([
      {
        tempId: `row-${Date.now()}-1`,
        payee: '',
        category: presetCategory || 'Software & Subscriptions',
        amount: 0,
        taxAmount: 0,
        date: new Date().toISOString().slice(0, 10),
        paymentMethod: 'Card',
        referenceNumber: '',
        notes: '',
      },
      {
        tempId: `row-${Date.now()}-2`,
        payee: '',
        category: presetCategory || 'Software & Subscriptions',
        amount: 0,
        taxAmount: 0,
        date: new Date().toISOString().slice(0, 10),
        paymentMethod: 'Card',
        referenceNumber: '',
        notes: '',
      },
    ]);
    setShowModal(true);
  };

  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setReason(exp.reason || '');
    setCategory(exp.category);
    setPayee(exp.payee || '');
    setAmount(exp.amount || 0);
    setTaxAmount(exp.taxAmount || 0);
    setDate(exp.date || new Date().toISOString().slice(0, 10));
    setPaymentMethod(exp.paymentMethod || 'Card');
    setReferenceNumber(exp.referenceNumber || '');
    setNotes(exp.notes || '');
    setIsAddingCustomCategory(false);
    setCustomCategoryInput('');
    setCustomCategoryError(null);
    setIsMultiItemMode(false);
    setKeepReasonAndLogAnother(false);
    setSuccessBannerMsg(null);
    setShowModal(true);
  };

  const handleConfirmAddCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) {
      setCustomCategoryError('Please enter a valid category name');
      return;
    }
    addStoredExpenseCategory(trimmed);
    if (onAddExpenseCategory) {
      onAddExpenseCategory(trimmed);
    }
    setCategory(trimmed);
    setIsAddingCustomCategory(false);
    setCustomCategoryInput('');
    setCustomCategoryError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payee.trim() || amount <= 0) return;

    const nowIso = new Date().toISOString();
    const modifierName = currentUser?.name || 'Admin';

    if (editingExpense) {
      const updatedExpense: Expense = {
        ...editingExpense,
        reason: reason.trim(),
        category,
        payee: payee.trim(),
        amount: Number(amount) || 0,
        taxAmount: Number(taxAmount) || 0,
        date,
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
        lastModifiedBy: modifierName,
        lastModifiedAt: nowIso,
      };
      onUpdateExpense(updatedExpense);
      if (selectedExpenseForDetails?.id === updatedExpense.id) {
        setSelectedExpenseForDetails(updatedExpense);
      }
      setShowModal(false);
      setEditingExpense(null);
    } else {
      const newExpense: Expense = {
        id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        reason: reason.trim(),
        category,
        payee: payee.trim(),
        amount: Number(amount) || 0,
        taxAmount: Number(taxAmount) || 0,
        date,
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
        status: 'paid',
        createdAt: nowIso,
        createdBy: modifierName,
        lastModifiedBy: modifierName,
        lastModifiedAt: nowIso,
      };
      onAddExpense(newExpense);

      if (keepReasonAndLogAnother) {
        setSuccessBannerMsg(`Logged "${payee}" (${currencySymbol}${amount})! You can now add the next expense for "${reason}".`);
        setPayee('');
        setAmount(0);
        setTaxAmount(0);
        setReferenceNumber('');
        setNotes('');
        return;
      }

      setShowModal(false);
      setEditingExpense(null);
    }
  };

  // Multi-item handlers
  const handleAddMultiRow = () => {
    setMultiRows((prev) => [
      ...prev,
      {
        tempId: `row-${Date.now()}-${Math.random()}`,
        payee: '',
        category: category || 'Software & Subscriptions',
        amount: 0,
        taxAmount: 0,
        date: date || new Date().toISOString().slice(0, 10),
        paymentMethod: 'Card',
        referenceNumber: '',
        notes: '',
      },
    ]);
  };

  const handleUpdateMultiRow = (tempId: string, field: keyof MultiExpenseRow, val: any) => {
    setMultiRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, [field]: val } : r))
    );
  };

  const handleRemoveMultiRow = (tempId: string) => {
    if (multiRows.length <= 1) return;
    setMultiRows((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  const handleSaveMultiItems = (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = multiRows.filter((r) => r.payee.trim() && r.amount > 0);
    if (!validRows.length) {
      alert('Please enter at least one valid expense item with a payee and amount greater than 0.');
      return;
    }

    const nowIso = new Date().toISOString();
    const modifierName = currentUser?.name || 'Admin';
    const sharedReason = reason.trim() || 'General Operating Expense';

    const newExpensesList: Expense[] = validRows.map((row, idx) => ({
      id: `exp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      reason: sharedReason,
      category: row.category,
      payee: row.payee.trim(),
      amount: Number(row.amount) || 0,
      taxAmount: Number(row.taxAmount) || 0,
      date: row.date || new Date().toISOString().slice(0, 10),
      paymentMethod: row.paymentMethod,
      referenceNumber: row.referenceNumber.trim(),
      notes: row.notes.trim(),
      status: 'paid',
      createdAt: nowIso,
      createdBy: modifierName,
      lastModifiedBy: modifierName,
      lastModifiedAt: nowIso,
    }));

    if (onAddMultipleExpenses) {
      onAddMultipleExpenses(newExpensesList);
    } else {
      newExpensesList.forEach((exp) => onAddExpense(exp));
    }

    setShowModal(false);
    setIsMultiItemMode(false);
  };

  const filteredExpenses = expenses.filter((e) => {
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (e.payee || '').toLowerCase().includes(term) ||
      (e.category || '').toLowerCase().includes(term) ||
      (e.reason ? e.reason.toLowerCase().includes(term) : false) ||
      (e.notes ? e.notes.toLowerCase().includes(term) : false) ||
      (e.referenceNumber ? e.referenceNumber.toLowerCase().includes(term) : false) ||
      (e.createdBy ? e.createdBy.toLowerCase().includes(term) : false);

    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const matchesReason = reasonFilter === 'all' || e.reason === reasonFilter;
    return matchesSearch && matchesCategory && matchesReason;
  });

  const getExportData = (): ExportDataOptions => {
    const headers = [
      'ID',
      'Date',
      'Reason / Purpose',
      'Category',
      'Payee',
      'Amount',
      'Tax Amount',
      'Payment Method',
      'Notes',
      'Created By',
      'Created At',
      'Last Modified By',
      'Last Modified At',
    ];
    const rows = filteredExpenses.map((e) => [
      e.id,
      e.date,
      e.reason || '',
      e.category,
      e.payee,
      e.amount,
      e.taxAmount || 0,
      e.paymentMethod,
      e.notes || '',
      e.createdBy || '',
      e.createdAt || '',
      e.lastModifiedBy || '',
      e.lastModifiedAt || '',
    ]);

    const totalSpend = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalTax = filteredExpenses.reduce((sum, e) => sum + (Number(e.taxAmount) || 0), 0);

    return {
      filename: `business_expenses_${new Date().toISOString().slice(0, 10)}`,
      title: 'Business Operating Expenses Ledger',
      subtitle: 'Overhead Costs, Disbursements, Contractor Payouts & Tax Tracking',
      headers,
      rows,
      jsonData: filteredExpenses,
      summaryCards: [
        { label: 'Total Disbursements', value: `${currencySymbol}${totalSpend.toLocaleString('en-IN')}` },
        { label: 'Input Tax Amount', value: `${currencySymbol}${totalTax.toLocaleString('en-IN')}` },
        { label: 'Expense Entries', value: String(filteredExpenses.length) },
      ],
    };
  };

  // Find linked expenses sharing the same reason for details view
  const linkedDetailsExpenses = selectedExpenseForDetails
    ? expenses.filter(
        (e) =>
          e.id !== selectedExpenseForDetails.id &&
          e.reason &&
          selectedExpenseForDetails.reason &&
          e.reason.toLowerCase().trim() === selectedExpenseForDetails.reason.toLowerCase().trim()
      )
    : [];

  const totalReasonSpend = selectedExpenseForDetails
    ? [selectedExpenseForDetails, ...linkedDetailsExpenses].reduce(
        (sum, e) => sum + (Number(e.amount) || 0),
        0
      )
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Business Operating Expenses</h1>
          <p className="page-subtitle">
            Track overhead costs, client campaign expenses, contractor payouts, and tax deductible disbursements with full purpose & audit tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <ExportDropdown
            getData={getExportData}
            label="Export Data"
            tooltip="Export expenses to Excel, PDF, CSV, JSON and more"
          />
          <button
            onClick={() => {
              handleOpenAddModal();
              setIsMultiItemMode(true);
            }}
            className="btn btn-secondary"
            title="Add multiple expense disbursements sharing the same reason/project"
          >
            <Layers size={15} />
            <span>+ Multi-Item Batch</span>
          </button>
          <button onClick={() => handleOpenAddModal()} className="btn btn-primary">
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
          <div className="stat-footer">{expenses.length} disbursements recorded</div>
        </div>

        <div className="card">
          <div className="stat-label">Input Tax Deductible (GST)</div>
          <div className="stat-value" style={{ marginTop: '0.25rem' }}>
            {currencySymbol}{expenses.reduce((s, e) => s + (e.taxAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-footer">Eligible for input tax credit offset</div>
        </div>

        <div className="card">
          <div className="stat-label">Top Spending Reason / Project</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {topReasonName}
          </div>
          <div className="stat-footer">
            {currencySymbol}{topReasonAmount.toLocaleString('en-IN')} cumulative spend
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ padding: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Category Tabs */}
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

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', maxWidth: '520px', alignItems: 'center' }}>
            {/* Filter by Reason */}
            {uniqueReasons.length > 0 && (
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="form-select"
                style={{ fontSize: '0.825rem', padding: '0.4rem 0.6rem', flex: 1, minWidth: '180px' }}
                title="Filter by Expense Reason / Project"
              >
                <option value="all">🎯 All Reasons / Projects ({uniqueReasons.length})</option>
                {uniqueReasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}

            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search by payee, reason, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.1rem', fontSize: '0.825rem' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="table-container responsive-desktop-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Reason / Purpose</th>
              <th>Payee & Notes</th>
              <th>Category</th>
              <th>Channel & Ref</th>
              <th>Amount</th>
              <th>GST Tax</th>
              <th>Logged By</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <PieChart size={24} />
                    </div>
                    <div className="empty-state-title">No expenses match your filters</div>
                    <div className="empty-state-desc">
                      Log business expenses, overhead disbursements, and contractor payouts with purpose tracking.
                    </div>
                    <button onClick={() => handleOpenAddModal()} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
                      <Plus size={14} />
                      <span>Log First Expense</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => {
                const sameReasonCount = exp.reason
                  ? expenses.filter((e) => e.reason && e.reason.toLowerCase().trim() === exp.reason?.toLowerCase().trim()).length
                  : 1;

                return (
                  <tr key={exp.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{exp.date}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {exp.createdAt ? formatAuditDateTime(exp.createdAt).split(', ')[1] || '' : ''}
                      </div>
                    </td>

                    {/* Reason / Purpose */}
                    <td>
                      {exp.reason ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span
                            className="badge badge-paid"
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={`Reason: ${exp.reason}`}
                          >
                            <Target size={11} />
                            <span>{exp.reason}</span>
                          </span>
                          {sameReasonCount > 1 && (
                            <span style={{ fontSize: '0.675rem', color: 'var(--primary-color)', fontWeight: 600 }}>
                              🔗 {sameReasonCount} linked expenses
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                      )}
                    </td>

                    {/* Payee & Notes */}
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{exp.payee}</div>
                      {exp.notes && (
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>{exp.notes}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td>
                      <span className="badge badge-draft">{exp.category}</span>
                    </td>

                    {/* Method & Ref */}
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>{exp.paymentMethod}</div>
                      {exp.referenceNumber && (
                        <div className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          #{exp.referenceNumber}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.95rem' }}>
                      {currencySymbol}{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Tax */}
                    <td className="font-mono" style={{ fontSize: '0.8rem' }}>
                      {exp.taxAmount ? `${currencySymbol}${exp.taxAmount.toLocaleString('en-IN')}` : '-'}
                    </td>

                    {/* Logged / Modified By */}
                    <td>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {exp.createdBy || exp.lastModifiedBy || 'Admin'}
                      </div>
                      {exp.lastModifiedAt && exp.lastModifiedAt !== exp.createdAt ? (
                        <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }} title={`Edited on ${formatAuditDateTime(exp.lastModifiedAt)}`}>
                          Edited: {formatAuditDateTime(exp.lastModifiedAt)}
                        </div>
                      ) : exp.createdAt ? (
                        <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                          {formatAuditDateTime(exp.createdAt)}
                        </div>
                      ) : null}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setSelectedExpenseForDetails(exp)}
                          className="btn btn-secondary btn-sm"
                          title="View Full Details, Audit Trail & Linked Expenses"
                        >
                          <Eye size={13} />
                        </button>

                        {exp.reason && (
                          <button
                            onClick={() => handleOpenAddModal(exp.reason, exp.category)}
                            className="btn btn-secondary btn-sm"
                            title={`Add another expense for reason: "${exp.reason}"`}
                            style={{ color: 'var(--primary-color)' }}
                          >
                            <Plus size={13} />
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEditModal(exp)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Expense"
                        >
                          <Edit size={13} />
                        </button>

                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="btn btn-danger btn-sm"
                          title="Delete Expense"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Touch Cards View */}
      <div className="responsive-mobile-cards">
        {filteredExpenses.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No expenses recorded. Tap 'Log Expense' to add one.
          </div>
        ) : (
          filteredExpenses.map((exp) => (
            <div key={`m-exp-${exp.id}`} className="mobile-data-card">
              <div className="mobile-data-card-header">
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {exp.payee}
                  </div>
                  {exp.reason && (
                    <div style={{ marginTop: '3px' }}>
                      <span className="badge badge-paid" style={{ fontSize: '0.7rem' }}>
                        🎯 {exp.reason}
                      </span>
                    </div>
                  )}
                  {exp.notes && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {exp.notes}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--danger)' }}>
                  {currencySymbol}{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="mobile-data-card-meta">
                <div className="mobile-data-card-meta-row">
                  <span className="mobile-data-card-meta-label">Category & Method</span>
                  <span className="mobile-data-card-meta-value">
                    <span className="badge badge-draft" style={{ marginRight: '0.35rem' }}>{exp.category}</span>
                    {exp.paymentMethod}
                  </span>
                </div>
                <div className="mobile-data-card-meta-row">
                  <span className="mobile-data-card-meta-label">Date & Ref #</span>
                  <span className="mobile-data-card-meta-value font-mono" style={{ fontSize: '0.75rem' }}>
                    {exp.date} {exp.referenceNumber ? `• ${exp.referenceNumber}` : ''}
                  </span>
                </div>
                <div className="mobile-data-card-meta-row">
                  <span className="mobile-data-card-meta-label">Audit Record</span>
                  <span className="mobile-data-card-meta-value" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Added by <strong>{exp.createdBy || exp.lastModifiedBy || 'Admin'}</strong> on {formatAuditDateTime(exp.createdAt || exp.date)}
                  </span>
                </div>
              </div>

              <div className="mobile-data-card-actions" style={{ display: 'grid', gridTemplateColumns: exp.reason ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '0.35rem' }}>
                <button
                  onClick={() => setSelectedExpenseForDetails(exp)}
                  className="btn btn-secondary btn-sm"
                  style={{ minHeight: '34px', padding: '0.3rem' }}
                  title="Full Dossier"
                >
                  <Eye size={13} />
                  <span>View</span>
                </button>
                {exp.reason && (
                  <button
                    onClick={() => handleOpenAddModal(exp.reason, exp.category)}
                    className="btn btn-secondary btn-sm"
                    style={{ minHeight: '34px', padding: '0.3rem', color: 'var(--primary-color)' }}
                    title="Add another expense for this reason"
                  >
                    <Plus size={13} />
                    <span>+ Reason</span>
                  </button>
                )}
                <button
                  onClick={() => handleOpenEditModal(exp)}
                  className="btn btn-secondary btn-sm"
                  style={{ minHeight: '34px', padding: '0.3rem' }}
                >
                  <Edit size={13} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => onDeleteExpense(exp.id)}
                  className="btn btn-danger btn-sm"
                  style={{ minHeight: '34px', padding: '0.3rem' }}
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FULL DETAILS DOSSIER MODAL */}
      {selectedExpenseForDetails && (
        <div className="modal-overlay" style={{ zIndex: 12000 }}>
          <div className="modal-content" style={{ maxWidth: '640px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)' }}>
                  <Info size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Expense Details & Audit Dossier
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ID: {selectedExpenseForDetails.id} • Status: Paid
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedExpenseForDetails(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.35rem' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Purpose & Reason Highlight Box */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)',
                border: '1.5px solid rgba(59, 130, 246, 0.35)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem 1.25rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Target size={13} />
                  <span>Business Purpose / Reason (Why)</span>
                </span>
                <span className="badge badge-paid" style={{ fontSize: '0.7rem' }}>
                  {1 + linkedDetailsExpenses.length} Total {1 + linkedDetailsExpenses.length === 1 ? 'Disbursement' : 'Disbursements'}
                </span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                {selectedExpenseForDetails.reason || 'General Operating Overhead'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Total cumulative spending for this reason: <strong style={{ color: 'var(--danger)' }}>{currencySymbol}{totalReasonSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>

            {/* Audit Trail Grid: Who & When */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <User size={12} />
                  <span>Logged By (Who)</span>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.95rem' }}>
                  {selectedExpenseForDetails.createdBy || selectedExpenseForDetails.lastModifiedBy || 'Admin'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Authorized Workspace User
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={12} />
                  <span>Recorded Date & Time (When)</span>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
                  {selectedExpenseForDetails.createdAt ? formatAuditDateTime(selectedExpenseForDetails.createdAt) : selectedExpenseForDetails.date}
                </div>
                {selectedExpenseForDetails.lastModifiedAt && selectedExpenseForDetails.lastModifiedAt !== selectedExpenseForDetails.createdAt && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Edited by {selectedExpenseForDetails.lastModifiedBy} on {formatAuditDateTime(selectedExpenseForDetails.lastModifiedAt)}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Amount Paid</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--danger)', marginTop: '0.2rem' }}>
                  {currencySymbol}{selectedExpenseForDetails.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Category</div>
                <div style={{ marginTop: '0.25rem' }}>
                  <span className="badge badge-draft">{selectedExpenseForDetails.category}</span>
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Payment Channel</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.85rem' }}>
                  {selectedExpenseForDetails.paymentMethod}
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>GST Tax Offset</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.85rem' }}>
                  {selectedExpenseForDetails.taxAmount ? `${currencySymbol}${selectedExpenseForDetails.taxAmount.toLocaleString('en-IN')}` : 'None'}
                </div>
              </div>
            </div>

            {/* Payee & Notes */}
            <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payee / Vendor</span>
                {selectedExpenseForDetails.referenceNumber && (
                  <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ref #{selectedExpenseForDetails.referenceNumber}
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {selectedExpenseForDetails.payee}
              </div>
              {selectedExpenseForDetails.notes && (
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.35rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem' }}>
                  {selectedExpenseForDetails.notes}
                </div>
              )}
            </div>

            {/* Linked Expenses Sharing the Same Reason */}
            {linkedDetailsExpenses.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Layers size={14} />
                    <span>Other Disbursements under "{selectedExpenseForDetails.reason}" ({linkedDetailsExpenses.length})</span>
                  </span>
                </div>
                <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', maxHeight: '180px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Payee</th>
                        <th>Category</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedDetailsExpenses.map((le) => (
                        <tr key={le.id}>
                          <td>{le.date}</td>
                          <td style={{ fontWeight: 600 }}>{le.payee}</td>
                          <td>
                            <span className="badge badge-draft" style={{ fontSize: '0.675rem' }}>{le.category}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                            {currencySymbol}{le.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              {selectedExpenseForDetails.reason ? (
                <button
                  type="button"
                  onClick={() => {
                    const presetReason = selectedExpenseForDetails.reason;
                    const presetCategory = selectedExpenseForDetails.category;
                    setSelectedExpenseForDetails(null);
                    handleOpenAddModal(presetReason, presetCategory);
                  }}
                  className="btn btn-secondary"
                  style={{ color: 'var(--primary-color)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={15} />
                  <span>+ Add Another for this Reason</span>
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedExpenseForDetails;
                    setSelectedExpenseForDetails(null);
                    handleOpenEditModal(target);
                  }}
                  className="btn btn-secondary"
                >
                  <Edit size={14} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedExpenseForDetails.id;
                    setSelectedExpenseForDetails(null);
                    onDeleteExpense(id);
                  }}
                  className="btn btn-danger"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOG / EDIT EXPENSE MODAL */}
      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 11500 }}>
          <div className="modal-content" style={{ maxWidth: isMultiItemMode ? '780px' : '520px', padding: '1.5rem', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {editingExpense
                    ? 'Edit Business Expense'
                    : isMultiItemMode
                    ? 'Log Multiple Expenses for Same Reason'
                    : 'Log Business Expense'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isMultiItemMode
                    ? 'Add several line items/payouts linked to the same business purpose.'
                    : 'Record operating expenses with business purpose and audit trail.'}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingExpense(null);
                  setIsMultiItemMode(false);
                }}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.35rem' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Success message banner when keepReason is active */}
            {successBannerMsg && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: 'var(--success)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginBottom: '1rem',
                }}
              >
                <Check size={16} />
                <span>{successBannerMsg}</span>
              </div>
            )}

            {/* Mode Switcher (Only when adding new expense) */}
            {!editingExpense && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: 'var(--bg-input)', padding: '4px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsMultiItemMode(false)}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: !isMultiItemMode ? 'var(--bg-card-light)' : 'transparent',
                    color: !isMultiItemMode ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Single Expense
                </button>
                <button
                  type="button"
                  onClick={() => setIsMultiItemMode(true)}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: isMultiItemMode ? 'var(--bg-card-light)' : 'transparent',
                    color: isMultiItemMode ? 'var(--primary-color)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Layers size={14} />
                  <span>➕ Multiple for Same Reason</span>
                </button>
              </div>
            )}

            {/* COMMON FIELD: Reason / Project / Purpose */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Target size={14} color="var(--primary-color)" />
                  <span>Business Purpose / Reason (Why)</span>
                </label>
                {uniqueReasons.length > 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Type new or choose below
                  </span>
                )}
              </div>
              <input
                type="text"
                list="existing-reasons-list"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Moothedan Video Shoot, Meta Ads Q4, Annual AWS Hosting..."
                className="form-input"
                style={{ fontWeight: 600 }}
              />
              <datalist id="existing-reasons-list">
                {uniqueReasons.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                ✨ Tip: Using the same Reason allows tracking total cumulative expenses for campaigns or projects.
              </div>
            </div>

            {/* SINGLE MODE FORM */}
            {!isMultiItemMode ? (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Category with Custom Option */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Expense Category</label>
                    {!isAddingCustomCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomCategory(true);
                          setCustomCategoryInput('');
                          setCustomCategoryError(null);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        title="Add a custom category to the dropdown list"
                      >
                        <Plus size={13} />
                        <span>+ Custom Option</span>
                      </button>
                    )}
                  </div>

                  {!isAddingCustomCategory ? (
                    <select
                      value={category}
                      onChange={(e) => {
                        if (e.target.value === '__add_custom_new__') {
                          setIsAddingCustomCategory(true);
                          setCustomCategoryInput('');
                          setCustomCategoryError(null);
                        } else {
                          setCategory(e.target.value);
                        }
                      }}
                      className="form-select"
                    >
                      {activeCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      {category && !activeCategories.includes(category) && (
                        <option value={category}>{category}</option>
                      )}
                      <option disabled value="">──────────────</option>
                      <option value="__add_custom_new__" style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                        ➕ + Add New Custom Category...
                      </option>
                    </select>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)',
                      border: '1.5px solid var(--primary-color)',
                    }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={customCategoryInput}
                          onChange={(e) => {
                            setCustomCategoryInput(e.target.value);
                            if (customCategoryError) setCustomCategoryError(null);
                          }}
                          placeholder="Enter category name (e.g. Cloud Hosting)"
                          className="form-input"
                          style={{ fontSize: '0.85rem' }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleConfirmAddCategory();
                            } else if (e.key === 'Escape') {
                              setIsAddingCustomCategory(false);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleConfirmAddCategory}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                        >
                          <Check size={14} />
                          <span>Add & Select</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCustomCategory(false);
                            setCustomCategoryError(null);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.35rem 0.5rem' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {customCategoryError && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>
                          {customCategoryError}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Payee / Merchant / Vendor</label>
                  <CI
                    type="text"
                    value={payee}
                    onChange={(e) => setPayee(e.target.value)}
                    onClear={() => setPayee('')}
                    className="form-input"
                    placeholder="e.g. Adobe, Freelancer Name, Camera Rental..."
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Expense Amount ({currencySymbol})</label>
                    <CI
                      type="number"
                      min="0.01"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      onClear={() => setAmount(0)}
                      className="form-input font-mono"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Tax Offset ({currencySymbol})</label>
                    <CI
                      type="number"
                      min="0"
                      step="any"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(Number(e.target.value))}
                      onClear={() => setTaxAmount(0)}
                      className="form-input font-mono"
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Expense Date</label>
                    <CI type="date" value={date} onChange={(e) => setDate(e.target.value)} onClear={() => setDate('')} className="form-input" required />
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

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Receipt Reference #</label>
                    <CI type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} onClear={() => setReferenceNumber('')} className="form-input font-mono" placeholder="e.g. INV-99120" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes & Description</label>
                    <CI type="text" value={notes} onChange={(e) => setNotes(e.target.value)} onClear={() => setNotes('')} className="form-input" placeholder="Justification or deliverables" />
                  </div>
                </div>

                {/* Keep Reason & Add Another Checkbox */}
                {!editingExpense && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
                    <input
                      type="checkbox"
                      id="keepReasonCheckbox"
                      checked={keepReasonAndLogAnother}
                      onChange={(e) => setKeepReasonAndLogAnother(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="keepReasonCheckbox" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', margin: 0 }}>
                      Keep this Reason and add another expense immediately after saving
                    </label>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingExpense(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Save size={15} />
                    <span>{editingExpense ? 'Update Expense' : keepReasonAndLogAnother ? 'Save & Add Next for this Reason' : 'Log Expense'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* MULTI-ITEM MODE: MULTIPLE EXPENSES FOR SAME REASON */
              <form onSubmit={handleSaveMultiItems} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Layers size={15} />
                    <span>Line Items for "{reason || 'This Reason'}" ({multiRows.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMultiRow}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Plus size={13} />
                    <span>+ Add Another Expense Item</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {multiRows.map((row, idx) => (
                    <div
                      key={row.tempId}
                      style={{
                        padding: '0.85rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          Item #{idx + 1}
                        </span>
                        {multiRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMultiRow(row.tempId)}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                            title="Remove this item"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Payee / Merchant</label>
                          <input
                            type="text"
                            value={row.payee}
                            onChange={(e) => handleUpdateMultiRow(row.tempId, 'payee', e.target.value)}
                            placeholder="Payee name"
                            className="form-input"
                            style={{ fontSize: '0.825rem' }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Category</label>
                          <select
                            value={row.category}
                            onChange={(e) => handleUpdateMultiRow(row.tempId, 'category', e.target.value)}
                            className="form-select"
                            style={{ fontSize: '0.825rem' }}
                          >
                            {activeCategories.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Amount ({currencySymbol})</label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={row.amount || ''}
                            onChange={(e) => handleUpdateMultiRow(row.tempId, 'amount', Number(e.target.value))}
                            placeholder="0.00"
                            className="form-input font-mono"
                            style={{ fontSize: '0.825rem', fontWeight: 700 }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Date</label>
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => handleUpdateMultiRow(row.tempId, 'date', e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.825rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Channel</label>
                          <select
                            value={row.paymentMethod}
                            onChange={(e) => handleUpdateMultiRow(row.tempId, 'paymentMethod', e.target.value as PaymentMethod)}
                            className="form-select"
                            style={{ fontSize: '0.825rem' }}
                          >
                            <option value="Card">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
                        <div>
                          <input
                            type="text"
                            value={row.referenceNumber}
                            onChange={(e) => handleUpdateMultiRow(row.tempId, 'referenceNumber', e.target.value)}
                            placeholder="Ref # (optional)"
                            className="form-input font-mono"
                            style={{ fontSize: '0.75rem' }}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={row.notes}
                            onChange={(e) => handleUpdateMultiRow(row.tempId, 'notes', e.target.value)}
                            placeholder="Item notes / deliverables (optional)"
                            className="form-input"
                            style={{ fontSize: '0.75rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Multi Summary Box */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Items</span>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {multiRows.filter((r) => r.payee.trim() && r.amount > 0).length} valid entries
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Batch Amount</span>
                    <div style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--danger)' }}>
                      {currencySymbol}{multiRows.reduce((s, r) => s + (Number(r.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setIsMultiItemMode(false);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Save size={15} />
                    <span>Save All {multiRows.filter((r) => r.payee.trim() && r.amount > 0).length} Expenses</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
