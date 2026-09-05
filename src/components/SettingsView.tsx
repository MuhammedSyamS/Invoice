import React, { useState } from 'react';
import type { BusinessSettings } from '../types/invoice';
import { DEFAULT_CURRENCIES } from '../services/storageService';
import {
  Building,
  CreditCard,
  Percent,
  Save,
  Check,
} from 'lucide-react';

interface SettingsViewProps {
  settings: BusinessSettings;
  onSaveSettings: (settings: BusinessSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSaveSettings }) => {
  const [formData, setFormData] = useState<BusinessSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (field: keyof BusinessSettings, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Highphaus Business & Billing Settings
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Configure company branding, banking details, default currency, and tax parameters (www.highphaus.com).
          </p>
        </div>

        <button onClick={handleSubmit} className="btn btn-primary">
          {savedSuccess ? <Check size={18} /> : <Save size={18} />}
          <span>{savedSuccess ? 'Settings Saved!' : 'Save Changes'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section 1: Business Profile & Logo */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={20} />
            <span>Highphaus Brand Profile & Logo</span>
          </h3>

          {/* Logo Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '50px', height: '50px', background: '#ffffff', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/favicon.png" alt="Highphaus Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Active Agency Logo</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Loaded from <code style={{ color: 'var(--text-primary)' }}>public/favicon.png</code> (Highphaus Digital Marketing Agency Logo)
              </div>
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
                placeholder="Highphaus"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Agency Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="form-input"
                placeholder="Digital Marketing Agency"
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Agency Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="form-input"
                placeholder="www.highphaus.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Billing Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="form-input"
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
              />
            </div>

            <div className="form-group">
              <label className="form-label">Registered Office Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="form-input"
                placeholder="e.g. K.G Building, Kallara, Trivandrum, Kerala"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company PIN Code</label>
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
            <span>Bank Wire & UPI Payment Instructions</span>
          </h3>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Holder Name</label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => handleChange('accountName', e.target.value)}
                className="form-input"
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
              />
            </div>

            <div className="form-group">
              <label className="form-label">IFSC / SWIFT Code</label>
              <input
                type="text"
                value={formData.ifscSwift}
                onChange={(e) => handleChange('ifscSwift', e.target.value)}
                className="form-input font-mono"
              />
            </div>

            <div className="form-group">
              <label className="form-label">UPI ID / Virtual Address</label>
              <input
                type="text"
                value={formData.upiId}
                onChange={(e) => handleChange('upiId', e.target.value)}
                className="form-input font-mono"
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
            />
          </div>
        </div>
      </form>
    </div>
  );
};
