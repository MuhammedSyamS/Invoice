import React, { useState, useRef } from 'react';
import type { BusinessSettings, Category, Invoice, Bill, Expense, Payment } from '../types/invoice';
import {
  DEFAULT_CURRENCIES,
  BLANK_SETTINGS,
  getCurrencySymbol,
  DEFAULT_EXPENSE_CATEGORIES,
  getStoredExpenseCategories,
  addStoredExpenseCategory,
  updateStoredExpenseCategory,
  deleteStoredExpenseCategory,
} from '../services/storageService';
import {
  Building,
  CreditCard,
  Percent,
  Save,
  Check,
  Trash2,
  Upload,
  AlertTriangle,
  RotateCcw,
  EyeOff,
  Image as ImageIcon,
  Tag,
  Plus,
  Edit,
  Archive,
  RefreshCw,
  X,
  Layers,
  CheckCircle,
  Palette,
  Sparkles,
  TrendingUp,
  Receipt,
  Clock,
  FileText,
} from 'lucide-react';
import { CI, CT } from './ClearableInput';
import { getPdfTheme, BALANCE_THEMES, PRIMARY_COLOR_PRESETS, FONT_PRESETS } from '../services/pdfThemeService';

interface SettingsViewProps {
  settings: BusinessSettings;
  categories?: Category[];
  invoices?: Invoice[];
  bills?: Bill[];
  expenses?: Expense[];
  payments?: Payment[];
  expenseCategories?: string[];
  onAddExpenseCategory?: (name: string) => void;
  onUpdateExpenseCategory?: (oldName: string, newName: string) => void;
  onDeleteExpenseCategory?: (name: string) => void;
  onSaveSettings: (settings: BusinessSettings) => void;
  onCreateCategory?: (cat: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateCategory?: (cat: Category) => void;
  onArchiveCategory?: (catId: string) => void;
  onRestoreCategory?: (catId: string) => void;
  onDeleteCategory?: (catId: string) => void;
  onWipeEntireWebsite?: () => void;
  onClearInvoices?: () => void;
  onClearClients?: () => void;
  onClearQuotes?: () => void;
  onClearRecurring?: () => void;
  onRestoreDemoData?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  categories = [],
  invoices = [],
  bills = [],
  expenses = [],
  payments = [],
  expenseCategories,
  onAddExpenseCategory,
  onUpdateExpenseCategory,
  onDeleteExpenseCategory,
  onSaveSettings,
  onCreateCategory,
  onUpdateCategory,
  onArchiveCategory,
  onRestoreCategory,
  onDeleteCategory,
  onWipeEntireWebsite,
  onClearInvoices,
  onClearClients,
  onClearQuotes,
  onClearRecurring,
  onRestoreDemoData,
}) => {
  const [formData, setFormData] = useState<BusinessSettings>(settings);
  const [prevSettings, setPrevSettings] = useState<BusinessSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'all' | 'financials' | 'profile' | 'pdf-design' | 'categories' | 'expense-categories' | 'banking' | 'taxes' | 'danger'
  >('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currencySymbol = getCurrencySymbol(formData.currency);

  // Financial Calculations for "Total Amount to Get" & Real-Time Overview
  const activeInvoices = invoices.filter((i) => i.status !== 'cancelled');
  const todayStr = new Date().toISOString().slice(0, 10);

  // Total amount to get from clients (Outstanding Receivables across all invoices)
  const totalAmountToGet = activeInvoices.reduce((sum, inv) => {
    const bal = inv.balanceDue !== undefined ? inv.balanceDue : Math.max(0, inv.total - (inv.paidAmount || 0));
    return sum + Math.max(0, bal);
  }, 0);

  // Overdue amount to get (due date < today and balance > 0)
  const overdueAmountToGet = activeInvoices.reduce((sum, inv) => {
    const bal = inv.balanceDue !== undefined ? inv.balanceDue : Math.max(0, inv.total - (inv.paidAmount || 0));
    if (bal > 0.01 && inv.dueDate && inv.dueDate < todayStr && inv.status !== 'paid') {
      return sum + bal;
    }
    return sum;
  }, 0);

  // Invoices with outstanding balances to get
  const pendingReceivablesInvoices = activeInvoices.filter((inv) => {
    const bal = inv.balanceDue !== undefined ? inv.balanceDue : Math.max(0, inv.total - (inv.paidAmount || 0));
    return bal > 0.01 && inv.status !== 'paid';
  });

  const totalInvoicedRevenue = activeInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalCollectedRevenue = activeInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalExpensesOutflow = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalBillsPayable = bills
    .filter((b) => b.paymentStatus !== 'cancelled')
    .reduce((sum, b) => {
      const bal = b.balanceDue !== undefined ? b.balanceDue : Math.max(0, b.total - (b.paidAmount || 0));
      return sum + Math.max(0, bal);
    }, 0);
  const netOperatingMargin = totalCollectedRevenue - totalExpensesOutflow;
  const totalPaymentsRecordedCount = payments.length;
  const totalPaymentsRecordedAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Expense Categories Management State
  const currentExpenseCategories =
    expenseCategories && expenseCategories.length > 0
      ? expenseCategories
      : getStoredExpenseCategories();

  const [newExpenseCatInput, setNewExpenseCatInput] = useState('');
  const [expenseCatError, setExpenseCatError] = useState<string | null>(null);
  const [editingExpenseCat, setEditingExpenseCat] = useState<string | null>(null);
  const [editExpenseCatVal, setEditExpenseCatVal] = useState('');

  const handleAddExpenseCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newExpenseCatInput.trim();
    if (!trimmed) {
      setExpenseCatError('Category name is required.');
      return;
    }
    if (currentExpenseCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setExpenseCatError('This category already exists.');
      return;
    }
    addStoredExpenseCategory(trimmed);
    if (onAddExpenseCategory) {
      onAddExpenseCategory(trimmed);
    }
    setNewExpenseCatInput('');
    setExpenseCatError(null);
  };

  const handleUpdateExpenseCategorySubmit = (oldName: string) => {
    const trimmed = editExpenseCatVal.trim();
    if (!trimmed || trimmed.toLowerCase() === oldName.toLowerCase()) {
      setEditingExpenseCat(null);
      return;
    }
    updateStoredExpenseCategory(oldName, trimmed);
    if (onUpdateExpenseCategory) {
      onUpdateExpenseCategory(oldName, trimmed);
    }
    setEditingExpenseCat(null);
    setEditExpenseCatVal('');
  };

  const handleDeleteExpenseCat = (name: string) => {
    const count = expenses.filter((e) => e.category && e.category.toLowerCase() === name.toLowerCase()).length;
    if (count > 0) {
      if (!window.confirm(`"${name}" is currently used in ${count} expense record(s). Are you sure you want to delete this custom category? (Existing expenses will keep their category name).`)) {
        return;
      }
    } else {
      if (!window.confirm(`Delete "${name}" category?`)) {
        return;
      }
    }
    deleteStoredExpenseCategory(name);
    if (onDeleteExpenseCategory) {
      onDeleteExpenseCategory(name);
    }
  };

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [catIcon, setCatIcon] = useState('Tag');
  const [catError, setCatError] = useState<string | null>(null);

  const getCategoryUsage = (catId: string) => {
    const invCount = invoices.reduce((acc, inv) => {
      const isDirect = inv.categoryId === catId;
      const hasItem = inv.items?.some((it) => it.categoryId === catId);
      return acc + (isDirect || hasItem ? 1 : 0);
    }, 0);
    const billCount = bills.reduce((acc, b) => {
      const isDirect = b.categoryId === catId;
      const hasItem = b.items?.some((it) => it.categoryId === catId);
      return acc + (isDirect || hasItem ? 1 : 0);
    }, 0);
    return invCount + billCount;
  };

  const handleSaveCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCatError('Category name is required.');
      return;
    }

    if (categoryToEdit) {
      onUpdateCategory?.({
        ...categoryToEdit,
        name: catName.trim(),
        description: catDescription.trim() || undefined,
        color: catColor,
        icon: catIcon,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onCreateCategory?.({
        name: catName.trim(),
        description: catDescription.trim() || undefined,
        color: catColor,
        icon: catIcon,
        status: 'active',
      });
    }

    setIsCategoryModalOpen(false);
    setCategoryToEdit(null);
    setCatName('');
    setCatDescription('');
    setCatError(null);
  };

  if (settings !== prevSettings) {
    setPrevSettings(settings);
    setFormData(settings);
  }

  const handleChange = (field: keyof BusinessSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        logoUrl: dataUrl,
        showLogo: true,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
      showLogo: false,
    }));
  };

  const handleResetDefaultLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
      showLogo: true,
    }));
  };

  const handleClearBusinessFields = () => {
    if (window.confirm('Are you sure you want to clear all business profile, contact, and banking details? Fields will be set to blank.')) {
      setFormData({
        ...BLANK_SETTINGS,
        currency: formData.currency || 'INR',
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Business & Billing Settings
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Configure agency branding, banking details, default currency, tax rates, and manage system data.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleClearBusinessFields}
            className="btn btn-secondary"
            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.35)' }}
            title="Wipe clean all company and banking fields"
          >
            <Trash2 size={16} />
            <span>Clear Business Details</span>
          </button>
          <button type="button" onClick={() => handleSubmit()} className="btn btn-primary">
            {savedSuccess ? <Check size={18} /> : <Save size={18} />}
            <span>{savedSuccess ? 'Settings Saved!' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Settings Navigation Sub-Tabs */}
      <div className="filter-tabs-scroll" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        {[
          { id: 'all', label: 'All Settings', icon: Layers },
          { id: 'financials', label: `Financials & Receivables (${currencySymbol}${totalAmountToGet.toLocaleString('en-IN')})`, icon: TrendingUp },
          { id: 'expense-categories', label: `Expense Categories (${currentExpenseCategories.length})`, icon: Receipt },
          { id: 'profile', label: 'Company Profile', icon: Building },
          { id: 'pdf-design', label: 'PDF Design & Templates', icon: Palette },
          { id: 'categories', label: `Service Categories (${categories.length})`, icon: Tag },
          { id: 'banking', label: 'Banking & UPI', icon: CreditCard },
          { id: 'taxes', label: 'Taxes & Defaults', icon: Percent },
          { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: isActive ? 'var(--text-primary)' : 'transparent',
                background: isActive ? 'var(--bg-card-light)' : 'var(--bg-input)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section: Financials & Receivables Overview ("Total Amount to Get") */}
        {(activeTab === 'all' || activeTab === 'financials') && (
          <div className="card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} color="var(--primary-color)" />
                  <span>Financial Position & Receivables (Total Amount to Get)</span>
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: 0 }}>
                  Live aggregate of outstanding receivables to collect from clients, total revenue invoiced, operating cashflow, and recorded expenses.
                </p>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <Clock size={14} color="var(--text-muted)" />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  As of today ({todayStr})
                </span>
              </div>
            </div>

            {/* Financial Cards Grid */}
            <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
              {/* Highlight Card: Total Amount to Get */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)',
                border: '1.5px solid rgba(59, 130, 246, 0.35)',
                borderRadius: 'var(--radius-sm)',
                padding: '1.25rem',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary-color)' }}>
                    Total Amount to Get
                  </span>
                  <span className="badge badge-pending" style={{ fontSize: '0.72rem' }}>
                    {pendingReceivablesInvoices.length} Unpaid {pendingReceivablesInvoices.length === 1 ? 'Invoice' : 'Invoices'}
                  </span>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.4rem', fontFamily: 'monospace' }}>
                  {currencySymbol}{totalAmountToGet.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {overdueAmountToGet > 0 ? (
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                      ⚠️ {currencySymbol}{overdueAmountToGet.toLocaleString('en-IN')} is overdue
                    </span>
                  ) : (
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                      ✓ All active invoices are currently within payment terms
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Total Revenue Collected vs Total Invoiced */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '1.25rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    Collected Revenue
                  </span>
                  <span className="badge badge-paid" style={{ fontSize: '0.72rem' }}>
                    Received
                  </span>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--success)', marginTop: '0.4rem', fontFamily: 'monospace' }}>
                  {currencySymbol}{totalCollectedRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                  Out of {currencySymbol}{totalInvoicedRevenue.toLocaleString('en-IN')} total invoiced ({totalInvoicedRevenue > 0 ? Math.round((totalCollectedRevenue / totalInvoicedRevenue) * 100) : 0}% collected)
                </div>
              </div>

              {/* Card 3: Outflow Expenses & Operating Margin */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '1.25rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    Net Operating Position
                  </span>
                  <span className={`badge badge-${netOperatingMargin >= 0 ? 'paid' : 'draft'}`} style={{ fontSize: '0.72rem' }}>
                    {netOperatingMargin >= 0 ? 'Net Positive' : 'Deficit'}
                  </span>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: netOperatingMargin >= 0 ? 'var(--text-primary)' : 'var(--danger)', marginTop: '0.4rem', fontFamily: 'monospace' }}>
                  {netOperatingMargin < 0 ? '-' : ''}{currencySymbol}{Math.abs(netOperatingMargin).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                  Collected minus {currencySymbol}{totalExpensesOutflow.toLocaleString('en-IN')} operating expenses
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              border: '1px solid var(--border-color)'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Invoices Issued</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {invoices.length} ({currencySymbol}{totalInvoicedRevenue.toLocaleString('en-IN')})
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Logged Expenses</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.2rem' }}>
                  {expenses.length} items ({currencySymbol}{totalExpensesOutflow.toLocaleString('en-IN')})
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vendor Bills Payable</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {bills.length} bills ({currencySymbol}{totalBillsPayable.toLocaleString('en-IN')} pending)
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recorded Payment Receipts</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.2rem' }}>
                  {totalPaymentsRecordedCount} entries ({currencySymbol}{totalPaymentsRecordedAmount.toLocaleString('en-IN')})
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Service Categories</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {categories.length} services configured
                </div>
              </div>
            </div>

            {/* Detailed Receivables Breakdown Table: Who Owes What */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={16} />
                  <span>Outstanding Receivables Breakdown ("Who Owes What")</span>
                </h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {pendingReceivablesInvoices.length} invoices waiting for payment
                </span>
              </div>

              {pendingReceivablesInvoices.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  🎉 All customer invoices are fully settled! There is no outstanding balance to get right now.
                </div>
              ) : (
                <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Client & Company</th>
                        <th>Invoice #</th>
                        <th>Issue Date</th>
                        <th>Due Date</th>
                        <th>Total Amount</th>
                        <th>Paid So Far</th>
                        <th style={{ textAlign: 'right' }}>Amount to Get</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingReceivablesInvoices.map((inv) => {
                        const bal = inv.balanceDue !== undefined ? inv.balanceDue : Math.max(0, inv.total - (inv.paidAmount || 0));
                        const isOverdue = inv.dueDate && inv.dueDate < todayStr;
                        return (
                          <tr key={inv.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{inv.clientCompany || inv.clientName}</div>
                              {inv.clientCompany && inv.clientName && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Contact: {inv.clientName}</div>
                              )}
                            </td>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{inv.invoiceNumber}</span>
                            </td>
                            <td style={{ fontSize: '0.825rem' }}>{inv.issueDate}</td>
                            <td style={{ fontSize: '0.825rem' }}>
                              <span style={{ color: isOverdue ? 'var(--danger)' : 'inherit', fontWeight: isOverdue ? 700 : 400 }}>
                                {inv.dueDate} {isOverdue ? '⚠️ Overdue' : ''}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'monospace' }}>
                              {currencySymbol}{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ fontFamily: 'monospace', color: 'var(--success)' }}>
                              {currencySymbol}{(inv.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary-color)', fontSize: '0.95rem' }}>
                              {currencySymbol}{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 1: Business Profile & Logo */}
        {(activeTab === 'all' || activeTab === 'profile') && (
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={20} />
              <span>Company Brand Profile & Logo</span>
            </h3>

          {/* Logo Management Box */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem', background: 'var(--bg-input)', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '56px', height: '56px', background: '#ffffff', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', position: 'relative' }}>
                {formData.showLogo === false ? (
                  <span title="Logo Removed / Hidden">
                    <EyeOff size={24} color="#71717a" />
                  </span>
                ) : (
                  <img
                    src={formData.logoUrl || '/favicon.png'}
                    alt="Company Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {formData.showLogo === false
                    ? 'No Logo (Hidden from Invoices & PDF)'
                    : formData.logoUrl
                    ? 'Custom Uploaded Logo'
                    : 'Default Logo Active'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  {formData.showLogo === false
                    ? 'PDFs and invoices will not display any logo.'
                    : 'This logo appears in invoice headers, PDFs, and quotes.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
              >
                <Upload size={14} />
                <span>Upload Logo</span>
              </button>

              {formData.showLogo !== false && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#ef4444' }}
                  title="Remove logo completely from invoice PDF"
                >
                  <EyeOff size={14} />
                  <span>Delete Logo</span>
                </button>
              )}

              {formData.showLogo === false && (
                <button
                  type="button"
                  onClick={handleResetDefaultLogo}
                  className="btn btn-secondary btn-sm"
                >
                  <ImageIcon size={14} />
                  <span>Enable Logo</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Company Legal Name</label>
              <CI type="text" value={formData.companyName} onChange={(e) => handleChange('companyName', e.target.value)} onClear={() => handleChange('companyName', '')} className="form-input" placeholder="e.g. Highphaus" />
            </div>

            <div className="form-group">
              <label className="form-label">Agency Tagline / Subtitle</label>
              <CI type="text" value={formData.tagline} onChange={(e) => handleChange('tagline', e.target.value)} onClear={() => handleChange('tagline', '')} className="form-input" placeholder="e.g. Creative Marketing Agency" />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Company Website</label>
              <CI type="text" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} onClear={() => handleChange('website', '')} className="form-input" placeholder="e.g. www.highphaus.com" />
            </div>

            <div className="form-group">
              <label className="form-label">Billing Email</label>
              <CI type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} onClear={() => handleChange('email', '')} className="form-input" placeholder="billing@company.com" />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <CI type="text" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} onClear={() => handleChange('phone', '')} className="form-input" placeholder="+91 98765 43210" />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">GSTIN / Corporate Tax ID</label>
              <CI type="text" value={formData.taxId} onChange={(e) => handleChange('taxId', e.target.value)} onClear={() => handleChange('taxId', '')} className="form-input font-mono" placeholder="27AAACH9042K1Z8" />
            </div>

            <div className="form-group">
              <label className="form-label">PAN Number</label>
              <CI type="text" value={formData.panNumber || ''} onChange={(e) => handleChange('panNumber', e.target.value)} onClear={() => handleChange('panNumber', '')} className="form-input font-mono" placeholder="AAACH9042K" />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Registered Office Address</label>
              <CI type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} onClear={() => handleChange('address', '')} className="form-input" placeholder="Street, City, State" />
            </div>

            <div className="form-group">
              <label className="form-label">PIN Code</label>
              <CI type="text" value={formData.pincode || ''} onChange={(e) => handleChange('pincode', e.target.value)} onClear={() => handleChange('pincode', '')} className="form-input font-mono" placeholder="e.g. 695608" />
            </div>
          </div>
        </div>
        )}

        {/* Section: Invoice PDF Styling & Design Studio */}
        {(activeTab === 'all' || activeTab === 'pdf-design') && (
          <div className="card" style={{ border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Palette size={20} color="var(--primary-color)" />
                  <span>Invoice PDF Design & Styling Studio</span>
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Style and customize how your invoice PDFs look when viewed and downloaded. Customize primary colors, balance due highlights (warm brown), typography, and section visibility with live real-time preview.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSubmit()}
                className="btn btn-primary btn-sm"
                style={{ padding: '0.4rem 0.85rem' }}
              >
                {savedSuccess ? <Check size={15} /> : <Save size={15} />}
                <span>{savedSuccess ? 'Design Saved!' : 'Save PDF Design'}</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
              {/* Controls Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* 1. Primary & Header Color */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.35rem' }}>
                    Primary Theme & Header Bar Color
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                    Controls the deliverables table header, solid total pill, and document accent lines.
                  </p>
                  
                  {/* Preset Swatches */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {PRIMARY_COLOR_PRESETS.map((preset) => {
                      const isSelected = (formData.pdfPrimaryColor || '#09090b') === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            handleChange('pdfPrimaryColor', preset.value);
                            handleChange('pdfAccentColor', preset.value);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            background: isSelected ? 'var(--bg-card-light)' : 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: preset.value, display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }} />
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Color Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="color"
                      value={formData.pdfPrimaryColor || '#09090b'}
                      onChange={(e) => {
                        handleChange('pdfPrimaryColor', e.target.value);
                        handleChange('pdfAccentColor', e.target.value);
                      }}
                      style={{ width: '38px', height: '38px', padding: '2px', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent' }}
                      title="Choose custom color"
                    />
                    <input
                      type="text"
                      value={formData.pdfPrimaryColor || '#09090b'}
                      onChange={(e) => {
                        handleChange('pdfPrimaryColor', e.target.value);
                        handleChange('pdfAccentColor', e.target.value);
                      }}
                      className="form-input font-mono"
                      placeholder="#09090b"
                      style={{ maxWidth: '140px' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hex Color Code</span>
                  </div>
                </div>

                {/* 2. Balance Due Highlight Theme (Brown by default!) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, marginBottom: 0 }}>
                      Balance Due Box Color Theme
                    </label>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(217, 119, 6, 0.15)', color: '#d97706', fontWeight: 700 }}>
                      Requested Brown Palette
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                    Changes the "Balance Due" highlight box on advance-paid and partially-paid invoices.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    {Object.values(BALANCE_THEMES).map((theme) => {
                      const isSelected = (formData.pdfBalanceTheme || 'brown') === theme.id;
                      return (
                        <div
                          key={theme.id}
                          onClick={() => handleChange('pdfBalanceTheme', theme.id)}
                          style={{
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            background: isSelected ? 'var(--bg-card-light)' : 'var(--bg-input)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{theme.label.split(' (')[0]}</span>
                            {isSelected && <Check size={14} color="var(--primary-color)" />}
                          </div>
                          <div
                            style={{
                              background: theme.bg,
                              border: `1px solid ${theme.border}`,
                              color: theme.text,
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.725rem',
                              fontWeight: 800,
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>Balance Due:</span>
                            <span>₹10,000.00</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Typography & Font Preset */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.35rem' }}>
                    Invoice Typography / Font Family
                  </label>
                  <select
                    value={formData.pdfFontFamily || 'Plus Jakarta Sans'}
                    onChange={(e) => handleChange('pdfFontFamily', e.target.value)}
                    className="form-select"
                  >
                    {FONT_PRESETS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Document Sections & Layout Toggles */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.6rem' }}>
                    Document Sections & Layout Visibility
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.825rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={formData.pdfShowPaymentHistory !== false}
                        onChange={(e) => handleChange('pdfShowPaymentHistory', e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                      />
                      <span>Show <strong>Payment History & Settlements</strong> table on advance-paid invoices</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.825rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={formData.pdfShowAmountInWords !== false}
                        onChange={(e) => handleChange('pdfShowAmountInWords', e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                      />
                      <span>Show <strong>Amount in Words</strong> summary card</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.825rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={formData.pdfShowSignatory !== false}
                        onChange={(e) => handleChange('pdfShowSignatory', e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                      />
                      <span>Show <strong>Authorised Signatory</strong> signature line</span>
                    </label>
                  </div>
                </div>

                {/* 5. Signatory Title & Footer Format */}
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Signatory Label</label>
                    <CI
                      type="text"
                      value={formData.pdfSignatoryTitle || 'AUTHORISED SIGNATORY'}
                      onChange={(e) => handleChange('pdfSignatoryTitle', e.target.value)}
                      onClear={() => handleChange('pdfSignatoryTitle', '')}
                      className="form-input"
                      placeholder="AUTHORISED SIGNATORY"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Footer Contact Separator</label>
                    <select
                      value={formData.pdfFooterSeparator || '|'}
                      onChange={(e) => handleChange('pdfFooterSeparator', e.target.value)}
                      className="form-select font-mono"
                    >
                      <option value="|">Vertical Pipe ( | )</option>
                      <option value="•">Bullet Point ( • )</option>
                      <option value="/">Slash ( / )</option>
                      <option value="—">Em Dash ( — )</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Right Column: Real-Time Interactive Live PDF Preview */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={13} color="var(--primary-color)" />
                    <span>Real-Time PDF Preview</span>
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                    Live Template
                  </span>
                </div>

                {/* The Mini Document */}
                {(() => {
                  const previewTheme = getPdfTheme(formData);
                  return (
                    <div
                      style={{
                        background: '#ffffff',
                        color: '#09090b',
                        padding: '1.25rem',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                        fontFamily: previewTheme.fontFamily,
                        fontSize: '0.725rem',
                        lineHeight: 1.35,
                        border: '1px solid #e4e4e7',
                      }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#09090b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>
                              H
                            </div>
                            <span style={{ fontWeight: 900, fontSize: '0.95rem', letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#09090b' }}>
                              {formData.companyName || 'HIGHPHAUS'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#4b5563', marginTop: '0.2rem', lineHeight: 1.25, maxWidth: '240px' }}>
                            {formData.address || 'K.G Building, 1st Floor, Kallara, Trivandrum, Kerala - 695608'}
                            {formData.taxId && <div>GSTIN: <strong>{formData.taxId}</strong></div>}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <h4 style={{ fontSize: '1.35rem', fontWeight: 900, color: previewTheme.primaryColor, margin: 0, letterSpacing: '0.05em' }}>
                            INVOICE
                          </h4>
                        </div>
                      </div>

                      {/* Accent Line */}
                      <div style={{ height: '2.5px', background: previewTheme.accentColor, width: '100%', marginBottom: '0.75rem' }} />

                      {/* Meta Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                            INVOICE TO:
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#09090b' }}>Cleanish</div>
                          <div style={{ fontSize: '0.65rem', color: '#4b5563' }}>Bhagyalekshmi Omanakuttan</div>
                          <div style={{ fontSize: '0.65rem', color: '#4b5563' }}>Email: cleanishautocare@gmail.com</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', fontSize: '0.675rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '140px' }}>
                            <span style={{ fontWeight: 800 }}>Invoice#</span>
                            <span className="font-mono" style={{ fontWeight: 800 }}>HPINV-2026005</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '140px' }}>
                            <span style={{ fontWeight: 800 }}>Date</span>
                            <span>2026-09-30</span>
                          </div>
                        </div>
                      </div>

                      {/* Deliverables Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem', fontSize: '0.65rem' }}>
                        <thead>
                          <tr style={{ background: previewTheme.primaryColor, color: '#ffffff', textAlign: 'left' }}>
                            <th style={{ padding: '0.35rem 0.45rem', width: '22px', textAlign: 'center' }}>SL.</th>
                            <th style={{ padding: '0.35rem 0.45rem' }}>DELIVERABLES & SERVICES</th>
                            <th style={{ padding: '0.35rem 0.45rem', textAlign: 'center', width: '35px' }}>QTY.</th>
                            <th style={{ padding: '0.35rem 0.45rem', textAlign: 'right', width: '65px' }}>PRICE</th>
                            <th style={{ padding: '0.35rem 0.45rem', textAlign: 'right', width: '65px' }}>TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.35rem 0.45rem', textAlign: 'center', fontWeight: 700 }}>1</td>
                            <td style={{ padding: '0.35rem 0.45rem' }}>
                              <div style={{ fontWeight: 800, color: '#09090b' }}>Brand Kit</div>
                              <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Brand Kit</div>
                            </td>
                            <td style={{ padding: '0.35rem 0.45rem', textAlign: 'center' }}>1</td>
                            <td style={{ padding: '0.35rem 0.45rem', textAlign: 'right' }}>₹20,000.00</td>
                            <td style={{ padding: '0.35rem 0.45rem', textAlign: 'right', fontWeight: 800 }}>₹20,000.00</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Totals */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.65rem' }}>
                        <div style={{ width: '100%', maxWidth: '180px', display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.675rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                            <span style={{ fontWeight: 700 }}>Sub Total:</span>
                            <span style={{ fontWeight: 800, color: '#09090b' }}>₹20,000.00</span>
                          </div>
                          <div
                            style={{
                              background: previewTheme.primaryColor,
                              color: '#ffffff',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontWeight: 900,
                            }}
                          >
                            <span>TOTAL:</span>
                            <span>₹20,000.00</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700, padding: '0.1rem 0.2rem' }}>
                            <span>Amount Paid / Advance:</span>
                            <span>-₹10,000.00</span>
                          </div>
                          <div
                            style={{
                              background: previewTheme.balanceBg,
                              color: previewTheme.balanceText,
                              border: `1px solid ${previewTheme.balanceBorder}`,
                              padding: '0.25rem 0.45rem',
                              borderRadius: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontWeight: 800,
                            }}
                          >
                            <span>Balance Due:</span>
                            <span>₹10,000.00</span>
                          </div>
                        </div>
                      </div>

                      {/* Amount in words */}
                      {previewTheme.showAmountInWords && (
                        <div style={{ background: '#f8fafc', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', marginBottom: '0.65rem', fontSize: '0.625rem' }}>
                          <span style={{ fontWeight: 800, color: '#64748b', marginRight: '0.35rem' }}>AMOUNT IN WORDS:</span>
                          <span style={{ fontWeight: 800, color: '#09090b' }}>Rupees Twenty Thousand Only</span>
                        </div>
                      )}

                      {/* Settlements */}
                      {previewTheme.showPaymentHistory && (
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.65rem', fontSize: '0.6rem' }}>
                          <div style={{ background: '#f8fafc', padding: '0.3rem 0.5rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontWeight: 800 }}>
                            <span>PAYMENT HISTORY & SETTLEMENTS</span>
                            <span style={{ color: '#64748b' }}>1 Record • Total Settled: <strong style={{ color: '#15803d' }}>₹10,000.00</strong></span>
                          </div>
                          <div style={{ padding: '0.3rem 0.5rem', display: 'flex', justifyContent: 'space-between', background: '#fff' }}>
                            <span>2026-09-29 • UPI <span style={{ background: '#dcfce7', color: '#15803d', padding: '1px 4px', borderRadius: '2px', fontWeight: 800, fontSize: '0.55rem' }}>ADVANCE</span></span>
                            <span style={{ fontWeight: 800, color: '#15803d' }}>+₹10,000.00</span>
                          </div>
                        </div>
                      )}

                      {/* Signatory */}
                      {previewTheme.showSignatory && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ textAlign: 'center', minWidth: '120px' }}>
                            <div style={{ borderBottom: '1px solid #09090b', marginBottom: '0.2rem', width: '100%', height: '14px' }} />
                            <div style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                              {previewTheme.signatoryTitle}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{ borderTop: `1.5px solid ${previewTheme.accentColor}`, paddingTop: '0.4rem', textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#09090b' }}>
                        <span>Phone: {formData.phone || '+91 70342 06108'}</span>
                        <span style={{ margin: '0 0.35rem', color: '#9ca3af' }}>{previewTheme.footerSeparator}</span>
                        <span>Email: {formData.email || 'highphaus@gmail.com'}</span>
                        <span style={{ margin: '0 0.35rem', color: '#9ca3af' }}>{previewTheme.footerSeparator}</span>
                        <span>Website: {formData.website || 'www.highphaus.com'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Section: Categories & Services */}
        {(activeTab === 'all' || activeTab === 'categories') && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Tag size={20} />
                  <span>Categories & Service Offerings</span>
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Organize deliverables, invoice line items, expenses, and analytics across custom business categories.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCategoryToEdit(null);
                  setCatName('');
                  setCatDescription('');
                  setCatColor('#3b82f6');
                  setCatIcon('Tag');
                  setCatError(null);
                  setIsCategoryModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus size={16} />
                <span>Add Category</span>
              </button>
            </div>

            {/* Category Desktop Table */}
            <div className="table-container responsive-desktop-table" style={{ marginBottom: '0.5rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Description</th>
                    <th>Color & Icon</th>
                    <th>Status</th>
                    <th>Usage</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No categories found. Click "Add Category" to create your first service category.
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => {
                      const usage = getCategoryUsage(cat.id);
                      const isArchived = cat.status === 'archived';
                      return (
                        <tr key={cat.id} style={{ opacity: isArchived ? 0.6 : 1 }}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span
                                style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: cat.color || '#3b82f6',
                                  display: 'inline-block',
                                }}
                              />
                              <strong style={{ color: 'var(--text-primary)' }}>{cat.name}</strong>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                            {cat.description || '—'}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', padding: '2px 6px', background: 'var(--bg-input)', borderRadius: '4px' }}>
                              {cat.icon || 'Tag'} ({cat.color || '#3b82f6'})
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${isArchived ? 'cancelled' : 'paid'}`}>
                              {isArchived ? 'Archived' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, fontSize: '0.825rem' }}>
                              {usage} {usage === 1 ? 'doc' : 'docs'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : 'System'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setCategoryToEdit(cat);
                                  setCatName(cat.name);
                                  setCatDescription(cat.description || '');
                                  setCatColor(cat.color || '#3b82f6');
                                  setCatIcon(cat.icon || 'Tag');
                                  setCatError(null);
                                  setIsCategoryModalOpen(true);
                                }}
                                className="btn btn-secondary btn-sm"
                                title="Edit Category"
                              >
                                <Edit size={14} />
                              </button>
                              {isArchived ? (
                                <button
                                  type="button"
                                  onClick={() => onRestoreCategory?.(cat.id)}
                                  className="btn btn-secondary btn-sm"
                                  title="Restore Category"
                                  style={{ color: '#10b981' }}
                                >
                                  <RefreshCw size={14} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onArchiveCategory?.(cat.id)}
                                  className="btn btn-secondary btn-sm"
                                  title="Archive Category"
                                  style={{ color: '#f59e0b' }}
                                >
                                  <Archive size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (usage > 0) {
                                    alert(`Cannot permanently delete "${cat.name}" because it is referenced by ${usage} document(s). Please archive it instead to protect accounting data integrity.`);
                                    return;
                                  }
                                  if (window.confirm(`Permanently delete category "${cat.name}"?`)) {
                                    onDeleteCategory?.(cat.id);
                                  }
                                }}
                                className="btn btn-danger btn-sm"
                                title={usage > 0 ? 'Referenced in records (Archive instead)' : 'Delete Category'}
                              >
                                <Trash2 size={14} />
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

            {/* Mobile Category Cards */}
            <div className="responsive-mobile-cards">
              {categories.map((cat) => {
                const usage = getCategoryUsage(cat.id);
                const isArchived = cat.status === 'archived';
                return (
                  <div key={cat.id} className="card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: isArchived ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color || '#3b82f6' }} />
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{cat.name}</span>
                      </div>
                      <span className={`badge badge-${isArchived ? 'cancelled' : 'paid'}`}>
                        {isArchived ? 'Archived' : 'Active'}
                      </span>
                    </div>
                    {cat.description && (
                      <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {cat.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Usage: {usage} documents</span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryToEdit(cat);
                            setCatName(cat.name);
                            setCatDescription(cat.description || '');
                            setCatColor(cat.color || '#3b82f6');
                            setCatIcon(cat.icon || 'Tag');
                            setCatError(null);
                            setIsCategoryModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          <Edit size={13} />
                        </button>
                        {isArchived ? (
                          <button
                            type="button"
                            onClick={() => onRestoreCategory?.(cat.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#10b981' }}
                          >
                            <RefreshCw size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onArchiveCategory?.(cat.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#f59e0b' }}
                          >
                            <Archive size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (usage > 0) {
                              alert(`Cannot delete "${cat.name}" because it is referenced in documents.`);
                              return;
                            }
                            if (window.confirm(`Delete "${cat.name}"?`)) {
                              onDeleteCategory?.(cat.id);
                            }
                          }}
                          className="btn btn-danger btn-sm"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section: Expense Categories Customization */}
        {(activeTab === 'all' || activeTab === 'expense-categories') && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={20} />
                  <span>Expense Categories Customization</span>
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
                  Manage the categories available when logging expenses. Add custom classifications for your specific agency accounting.
                </p>
              </div>
            </div>

            {/* Add New Expense Category Bar */}
            <div style={{
              padding: '1rem',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              marginBottom: '1.25rem'
            }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Add New Custom Expense Category
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <input
                    type="text"
                    value={newExpenseCatInput}
                    onChange={(e) => {
                      setNewExpenseCatInput(e.target.value);
                      if (expenseCatError) setExpenseCatError(null);
                    }}
                    placeholder="Enter new expense category name (e.g. Server Hosting, Equipment Lease)..."
                    className="form-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddExpenseCategorySubmit(e);
                      }
                    }}
                  />
                  {expenseCatError && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 600 }}>
                      {expenseCatError}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddExpenseCategorySubmit}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={16} />
                  <span>Add Category</span>
                </button>
              </div>
            </div>

            {/* Expense Categories Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {currentExpenseCategories.map((catName) => {
                const isDefault = DEFAULT_EXPENSE_CATEGORIES.includes(catName);
                const expenseUsageCount = expenses.filter((e) => e.category && e.category.toLowerCase() === catName.toLowerCase()).length;
                const isEditing = editingExpenseCat === catName;

                return (
                  <div
                    key={catName}
                    style={{
                      padding: '0.85rem 1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      justifyContent: 'space-between',
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={editExpenseCatVal}
                          onChange={(e) => setEditExpenseCatVal(e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleUpdateExpenseCategorySubmit(catName);
                            } else if (e.key === 'Escape') {
                              setEditingExpenseCat(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateExpenseCategorySubmit(catName)}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.35rem 0.6rem' }}
                          title="Save rename"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingExpenseCat(null)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.35rem 0.5rem' }}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isDefault ? 'var(--primary-color)' : '#10b981',
                            display: 'inline-block'
                          }} />
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            {catName}
                          </span>
                        </div>

                        <span className={`badge badge-${isDefault ? 'draft' : 'paid'}`} style={{ fontSize: '0.68rem' }}>
                          {isDefault ? 'Standard' : 'Custom'}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.25rem', borderTop: '1px solid var(--border-color)' }}>
                      <span>
                        {expenseUsageCount} {expenseUsageCount === 1 ? 'expense logged' : 'expenses logged'}
                      </span>

                      {!isEditing && (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExpenseCat(catName);
                              setEditExpenseCatVal(catName);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                            title={`Rename "${catName}"`}
                          >
                            <Edit size={12} />
                            <span>Rename</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteExpenseCat(catName)}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                            title={`Delete category "${catName}"`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Banking & Wire Instructions */}
        {(activeTab === 'all' || activeTab === 'banking') && (
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={20} />
              <span>Bank Wire & UPI Payment Instructions (PDF Payment Details)</span>
            </h3>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <CI type="text" value={formData.bankName} onChange={(e) => handleChange('bankName', e.target.value)} onClear={() => handleChange('bankName', '')} className="form-input" placeholder="e.g. HDFC Bank Ltd" />
            </div>

            <div className="form-group">
              <label className="form-label">Account Holder Name</label>
              <CI type="text" value={formData.accountName} onChange={(e) => handleChange('accountName', e.target.value)} onClear={() => handleChange('accountName', '')} className="form-input" placeholder="Account Holder Name" />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <CI type="text" value={formData.accountNumber} onChange={(e) => handleChange('accountNumber', e.target.value)} onClear={() => handleChange('accountNumber', '')} className="form-input font-mono" placeholder="Bank Account Number" />
            </div>

            <div className="form-group">
              <label className="form-label">IFSC / SWIFT Code</label>
              <CI type="text" value={formData.ifscSwift} onChange={(e) => handleChange('ifscSwift', e.target.value)} onClear={() => handleChange('ifscSwift', '')} className="form-input font-mono" placeholder="IFSC or SWIFT code" />
            </div>

            <div className="form-group">
              <label className="form-label">UPI ID / Virtual Address</label>
              <CI type="text" value={formData.upiId} onChange={(e) => handleChange('upiId', e.target.value)} onClear={() => handleChange('upiId', '')} className="form-input font-mono" placeholder="name@upi" />
            </div>
          </div>
        </div>
        )}

        {/* Section 3: Taxes & Currency Configuration */}
        {(activeTab === 'all' || activeTab === 'taxes') && (
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Percent size={20} />
            <span>Defaults & Multi-Currency Setup</span>
          </h3>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Default Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="form-select"
              >
                {DEFAULT_CURRENCIES.map((cur) => (
                  <option key={cur.code} value={cur.code}>
                    {cur.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Default GST / Tax Rate (%)</label>
              <input
                type="number"
                value={formData.defaultTaxRate}
                onChange={(e) => handleChange('defaultTaxRate', Number(e.target.value))}
                className="form-input font-mono"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Payment Terms (Days)</label>
              <input
                type="number"
                value={formData.defaultPaymentTermsDays}
                onChange={(e) => handleChange('defaultPaymentTermsDays', Number(e.target.value))}
                className="form-input font-mono"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Default Invoice Prefix</label>
              <CI type="text" value={formData.invoicePrefix || 'HPINV'} onChange={(e) => handleChange('invoicePrefix', e.target.value)} onClear={() => handleChange('invoicePrefix', '')} className="form-input font-mono" placeholder="e.g. HPINV" />
            </div>

            <div className="form-group">
              <label className="form-label">Default Bill Prefix</label>
              <CI type="text" value={formData.billPrefix || 'HPBILL'} onChange={(e) => handleChange('billPrefix', e.target.value)} onClear={() => handleChange('billPrefix', '')} className="form-input font-mono" placeholder="e.g. HPBILL" />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Default Invoice Footer Notes</label>
              <CT value={formData.notesFooter} onChange={(e) => handleChange('notesFooter', e.target.value)} onClear={() => handleChange('notesFooter', '')} className="form-textarea" rows={2} placeholder="Terms, conditions, and contract thank you notes." />
            </div>

            <div className="form-group">
              <label className="form-label">Default Sales Bill / Receipt Footer Notes</label>
              <CT value={formData.billNotesFooter || ''} onChange={(e) => handleChange('billNotesFooter', e.target.value)} onClear={() => handleChange('billNotesFooter', '')} className="form-textarea" rows={2} placeholder="Goods received in good order. Computer generated sales invoice." />
            </div>
          </div>
        </div>
        )}

        {/* Section 4: Danger Zone & System Data Management */}
        {(activeTab === 'all' || activeTab === 'danger') && (
          <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={22} color="#ef4444" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>
                Danger Zone & System Data Management
              </h3>
            </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Permanent data management actions. Delete everything inside the website, clear specific document registries, or restore demo data.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Action 1: Delete All Details Inside Website */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  Wipe Everything & Delete All Website Details
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Permanently empties all invoices, clients, quotes, recurring contracts, and wipes all company and banking profile fields to completely blank.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('CRITICAL WARNING: This will permanently delete ALL invoices, clients, quotes, subscriptions, and reset all company/banking profile details to completely blank. Are you sure you want to proceed?')) {
                    if (onWipeEntireWebsite) onWipeEntireWebsite();
                  }
                }}
                className="btn btn-danger"
              >
                <Trash2 size={16} />
                <span>Wipe All Website Data</span>
              </button>
            </div>

            {/* Action 2: Granular Clears */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Invoices Ledger</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delete all created invoices and ledger records.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete all invoices?')) {
                      if (onClearInvoices) onClearInvoices();
                    }
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={14} />
                  <span>Delete All Invoices</span>
                </button>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Client CRM</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delete all client profiles and contact cards.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete all clients?')) {
                      if (onClearClients) onClearClients();
                    }
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={14} />
                  <span>Delete All Clients</span>
                </button>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Proposals & Retainers</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delete all quotation proposals and subscription templates.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete all quotes and recurring retainers?')) {
                      if (onClearQuotes) onClearQuotes();
                      if (onClearRecurring) onClearRecurring();
                    }
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={14} />
                  <span>Delete Proposals</span>
                </button>
              </div>
            </div>

            {/* Action 3: Restore Demo Data */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  Restore Sample Demo Data
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Populates sample agency invoices, clients, quotes, retainers, and branding for demonstration purposes.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Load sample demonstration data? Existing details will be overwritten.')) {
                    if (onRestoreDemoData) onRestoreDemoData();
                  }
                }}
                className="btn btn-secondary"
              >
                <RotateCcw size={16} />
                <span>Restore Demo Data</span>
              </button>
            </div>
          </div>
        </div>
        )}
      </form>

      {/* Category Create/Edit Modal */}
      {isCategoryModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div className="modal-content" style={{ maxWidth: '480px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={20} color="var(--primary-color)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {categoryToEdit ? 'Edit Category' : 'Create New Category'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setCategoryToEdit(null);
                  setCatError(null);
                }}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.35rem 0.5rem' }}
              >
                <X size={16} />
              </button>
            </div>

            {catError && (
              <div style={{ padding: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                {catError}
              </div>
            )}

            <form onSubmit={handleSaveCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <CI type="text" value={catName} onChange={(e) => setCatName(e.target.value)} onClear={() => setCatName('')} className="form-input" placeholder="e.g. Website Development, SEO, Consulting..." autoFocus required />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <CI type="text" value={catDescription} onChange={(e) => setCatDescription(e.target.value)} onClear={() => setCatDescription('')} className="form-input" placeholder="e.g. Full-stack web application development" />
              </div>

              <div className="form-group">
                <label className="form-label">Theme Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                  {[
                    '#3b82f6',
                    '#10b981',
                    '#6366f1',
                    '#f59e0b',
                    '#ec4899',
                    '#8b5cf6',
                    '#14b8a6',
                    '#64748b',
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCatColor(color)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: color,
                        border: catColor === color ? '3px solid #ffffff' : '2px solid transparent',
                        outline: catColor === color ? `2px solid ${color}` : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {catColor === color && <Check size={14} color="#ffffff" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Icon Identifier</label>
                <select
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  className="form-select"
                >
                  <option value="Tag">Tag (General)</option>
                  <option value="Code">Code (Development)</option>
                  <option value="Megaphone">Megaphone (Marketing & Ads)</option>
                  <option value="Palette">Palette (Design & Branding)</option>
                  <option value="Camera">Camera (Photography)</option>
                  <option value="Video">Video (Production & Editing)</option>
                  <option value="Briefcase">Briefcase (Consulting & Strategy)</option>
                  <option value="Layers">Layers (Multi-Service / Bundles)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setCategoryToEdit(null);
                    setCatError(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle size={16} />
                  <span>{categoryToEdit ? 'Update Category' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
