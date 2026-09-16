import React, { useState, useEffect, useRef } from 'react';
import type { BusinessSettings } from '../types/invoice';
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
} from 'lucide-react';

interface SettingsViewProps {
  settings: BusinessSettings;
  onSaveSettings: (settings: BusinessSettings) => void;
  onWipeEntireWebsite?: () => void;
  onClearInvoices?: () => void;
  onClearClients?: () => void;
  onClearQuotes?: () => void;
  onClearRecurring?: () => void;
  onRestoreDemoData?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onWipeEntireWebsite,
  onClearInvoices,
  onClearClients,
  onClearQuotes,
  onClearRecurring,
  onRestoreDemoData,
}) => {
  const [formData, setFormData] = useState<BusinessSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section 1: Business Profile & Logo */}
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
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="form-input"
                placeholder="e.g. Highphaus"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Agency Tagline / Subtitle</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="form-input"
                placeholder="e.g. Creative Marketing Agency"
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Company Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="form-input"
                placeholder="e.g. www.highphaus.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Billing Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="form-input"
                placeholder="billing@company.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="form-input"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">GSTIN / Corporate Tax ID</label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => handleChange('taxId', e.target.value)}
                className="form-input font-mono"
                placeholder="GSTIN-..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Registered Office Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="form-input"
                placeholder="Street, City, State"
              />
            </div>

            <div className="form-group">
              <label className="form-label">PIN Code</label>
              <input
                type="text"
                value={formData.pincode || ''}
                onChange={(e) => handleChange('pincode', e.target.value)}
                className="form-input font-mono"
                placeholder="e.g. 695608"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Banking & Wire Instructions */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={20} />
            <span>Bank Wire & UPI Payment Instructions (PDF Payment Details)</span>
          </h3>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="form-input"
                placeholder="e.g. HDFC Bank Ltd"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Holder Name</label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => handleChange('accountName', e.target.value)}
                className="form-input"
                placeholder="Account Holder Name"
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => handleChange('accountNumber', e.target.value)}
                className="form-input font-mono"
                placeholder="Bank Account Number"
              />
            </div>

            <div className="form-group">
              <label className="form-label">IFSC / SWIFT Code</label>
              <input
                type="text"
                value={formData.ifscSwift}
                onChange={(e) => handleChange('ifscSwift', e.target.value)}
                className="form-input font-mono"
                placeholder="IFSC or SWIFT code"
              />
            </div>

            <div className="form-group">
              <label className="form-label">UPI ID / Virtual Address</label>
              <input
                type="text"
                value={formData.upiId}
                onChange={(e) => handleChange('upiId', e.target.value)}
                className="form-input font-mono"
                placeholder="name@upi"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Taxes & Currency Configuration */}
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

          <div className="form-group">
            <label className="form-label">Default Invoice Footer Notes</label>
            <textarea
              value={formData.notesFooter}
              onChange={(e) => handleChange('notesFooter', e.target.value)}
              className="form-textarea"
              rows={2}
              placeholder="Terms, conditions, and contract thank you notes."
            />
          </div>
        </div>

        {/* Section 4: Danger Zone & System Data Management */}
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
      </form>
    </div>
  );
};
