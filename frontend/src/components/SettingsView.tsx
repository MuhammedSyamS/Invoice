import React, { useState, useRef } from 'react';
import type { BusinessSettings, Category, Invoice, Bill } from '../types/invoice';
import { DEFAULT_CURRENCIES, BLANK_SETTINGS } from '../services/storageService';
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
} from 'lucide-react';
import { CI, CT } from './ClearableInput';

interface SettingsViewProps {
  settings: BusinessSettings;
  categories?: Category[];
  invoices?: Invoice[];
  bills?: Bill[];
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
  const [activeTab, setActiveTab] = useState<'all' | 'profile' | 'categories' | 'banking' | 'taxes' | 'danger'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          { id: 'profile', label: 'Company Profile', icon: Building },
          { id: 'categories', label: `Categories & Services (${categories.length})`, icon: Tag },
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
