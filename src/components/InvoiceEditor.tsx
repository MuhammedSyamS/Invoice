import React, { useState } from 'react';
import type { Invoice, Client, LineItem, BusinessSettings, InvoiceStatus } from '../types/invoice';
import { DEFAULT_CURRENCIES, getCurrencySymbol, generateNextInvoiceNumber, numberToWordsINR } from '../services/storageService';
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface InvoiceEditorProps {
  invoiceToEdit?: Invoice | null;
  clients: Client[];
  settings: BusinessSettings;
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  invoiceToEdit,
  clients,
  settings,
  onSave,
  onCancel,
}) => {
  const isEditing = !!invoiceToEdit;
  const [activeMobileTab, setActiveMobileTab] = useState<'form' | 'preview'>('form');

  // Selected Client ID or 'custom'
  const [selectedClientId, setSelectedClientId] = useState<string>(
    () => invoiceToEdit?.clientId || (clients[0]?.id || 'custom')
  );

  // Unified Editable Client Fields (empty by default if new and no clients)
  const [clientCompany, setClientCompany] = useState<string>(
    () => invoiceToEdit?.clientCompany || (clients[0]?.company || '')
  );
  const [clientName, setClientName] = useState<string>(
    () => invoiceToEdit?.clientName || (clients[0]?.name || '')
  );
  const [clientEmail, setClientEmail] = useState<string>(
    () => invoiceToEdit?.clientEmail || (clients[0]?.email || '')
  );
  const [clientPhone, setClientPhone] = useState<string>(
    () => invoiceToEdit?.clientPhone || (clients[0]?.phone || '')
  );
  const [clientAddress, setClientAddress] = useState<string>(
    () => invoiceToEdit?.clientAddress || (clients[0] ? `${clients[0].address}${clients[0].city ? ', ' + clients[0].city : ''}${clients[0].country ? ', ' + clients[0].country : ''}` : '')
  );
  const [clientPincode, setClientPincode] = useState<string>(
    () => invoiceToEdit?.clientPincode || (clients[0]?.pincode || '')
  );
  const [clientTaxId, setClientTaxId] = useState<string>(
    () => invoiceToEdit?.clientTaxId || (clients[0]?.taxId || '')
  );

  const [currency, setCurrency] = useState<string>(
    () => invoiceToEdit?.currency || settings.currency || 'INR'
  );

  const [issueDate, setIssueDate] = useState<string>(
    () => invoiceToEdit?.issueDate || new Date().toISOString().slice(0, 10)
  );

  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    () => invoiceToEdit?.invoiceNumber || generateNextInvoiceNumber(0, issueDate)
  );

  const [dueDate, setDueDate] = useState<string>(
    () =>
      invoiceToEdit?.dueDate ||
      new Date(Date.now() + (settings.defaultPaymentTermsDays || 15) * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
  );

  const [items, setItems] = useState<LineItem[]>(
    () =>
      invoiceToEdit?.items || [
        {
          id: 'item-1',
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: settings.defaultTaxRate || 0,
          amount: 0,
        },
      ]
  );

  const [discountRate, setDiscountRate] = useState<number>(() => invoiceToEdit?.discountRate || 0);
  const [shippingFee, setShippingFee] = useState<number>(() => invoiceToEdit?.shippingFee || 0);
  const status: InvoiceStatus = invoiceToEdit?.status || 'sent';
  const [notes, setNotes] = useState<string>(
    () => invoiceToEdit?.notes || settings.notesFooter || ''
  );
  const [terms, setTerms] = useState<string>(
    () => invoiceToEdit?.terms || (settings.defaultPaymentTermsDays ? `Payment due within ${settings.defaultPaymentTermsDays} days.` : '')
  );

  const currencySymbol = getCurrencySymbol(currency);

  const formatGstin = (taxId?: string): string => {
    if (!taxId) return '';
    return taxId.replace(/^GSTIN[-:\s]*/i, '');
  };

  const companyGstinClean = formatGstin(settings.taxId);
  const clientGstinClean = formatGstin(clientTaxId);

  // Clear all details on the current invoice
  const handleClearAllDetails = () => {
    if (window.confirm('Are you sure you want to clear all details on this invoice? Client information, items, and figures will be emptied.')) {
      setSelectedClientId('custom');
      setClientCompany('');
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setClientAddress('');
      setClientPincode('');
      setClientTaxId('');
      setItems([
        {
          id: `item-${Date.now()}`,
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: settings.defaultTaxRate || 0,
          amount: 0,
        },
      ]);
      setDiscountRate(0);
      setShippingFee(0);
      setNotes('');
      setTerms('');
    }
  };

  // Unified Dropdown Handler: pre-fill or clear for custom entry
  const handleClientDropdownChange = (val: string) => {
    setSelectedClientId(val);
    if (val === 'custom') {
      setClientCompany('');
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setClientAddress('');
      setClientPincode('');
      setClientTaxId('');
    } else {
      const found = clients.find((c) => c.id === val);
      if (found) {
        setClientCompany(found.company);
        setClientName(found.name);
        setClientEmail(found.email);
        setClientPhone(found.phone || '');
        setClientAddress(found.address);
        setClientPincode(found.pincode || '');
        setClientTaxId(found.taxId);
      }
    }
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = (subtotal * (discountRate || 0)) / 100;
  const taxableAmount = Math.max(0, subtotal - discountTotal);

  const taxTotal = items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemDiscount = (itemSubtotal * (discountRate || 0)) / 100;
    const itemTaxable = Math.max(0, itemSubtotal - itemDiscount);
    const itemTax = (itemTaxable * (item.taxRate ?? (settings.defaultTaxRate || 0))) / 100;
    return sum + itemTax;
  }, 0);

  const grandTotal = taxableAmount + taxTotal + (shippingFee || 0);

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: settings.defaultTaxRate || 0,
      amount: 0,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updated.amount = Number(updated.quantity) * Number(updated.unitPrice);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleSaveInvoice = (saveStatus: InvoiceStatus = status) => {
    const newInvoice: Invoice = {
      id: invoiceToEdit?.id || `inv-${Date.now()}`,
      invoiceNumber,
      clientId: selectedClientId,
      clientName: clientName || '',
      clientCompany: clientCompany || clientName || 'Client',
      clientEmail: clientEmail || '',
      clientPhone,
      clientAddress: clientAddress || '',
      clientPincode,
      clientTaxId,
      issueDate,
      dueDate,
      items,
      subtotal,
      taxTotal,
      discountRate,
      discountTotal,
      shippingFee,
      total: grandTotal,
      status: saveStatus,
      notes,
      terms,
      currency,
      createdAt: invoiceToEdit?.createdAt || new Date().toISOString(),
    };

    onSave(newInvoice);
  };

  const formatAmount = (num: number) => {
    return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onCancel} className="btn btn-secondary">
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {isEditing ? `Edit Invoice (${invoiceNumber})` : 'Create New Invoice'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {settings.companyName ? `${settings.companyName} Invoice Generator` : 'Invoice Generator'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleClearAllDetails}
            className="btn btn-secondary"
            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
            title="Clear all details on this invoice to start fresh"
          >
            <Trash2 size={16} />
            <span>Clear All Details</span>
          </button>
          <button onClick={() => handleSaveInvoice('draft')} className="btn btn-secondary">
            <FileText size={16} />
            <span>Save as Draft</span>
          </button>
          <button onClick={() => handleSaveInvoice('sent')} className="btn btn-primary">
            <Save size={18} />
            <span>{isEditing ? 'Update Invoice' : 'Issue & Save Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Form vs Preview View Switcher Tabs */}
      <div className="editor-view-tabs">
        <button
          type="button"
          onClick={() => setActiveMobileTab('form')}
          className={`editor-view-tab-btn ${activeMobileTab === 'form' ? 'active' : ''}`}
        >
          <Building2 size={16} />
          <span>Edit Form</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('preview')}
          className={`editor-view-tab-btn ${activeMobileTab === 'preview' ? 'active' : ''}`}
        >
          <Sparkles size={16} />
          <span>Live Document Preview</span>
        </button>
      </div>

      {/* Editor Main Content: Split Grid */}
      <div className="editor-layout-grid">
        {/* Left Side: Form Controls */}
        <div style={{ display: activeMobileTab === 'form' ? 'flex' : undefined, flexDirection: 'column', gap: '1.25rem' }} className={activeMobileTab !== 'form' ? 'hide-mobile' : ''}>
          {/* Section 1: Client Selection & Billing Details */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} />
                <span>Client & Billing Address</span>
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Highphaus Agency CRM
              </span>
            </div>

            {/* Unified Client Dropdown */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Select Client Account or Enter Custom Details</label>
              <select
                value={selectedClientId}
                onChange={(e) => handleClientDropdownChange(e.target.value)}
                className="form-select"
                style={{ fontWeight: 700, padding: '0.75rem' }}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company} ({c.name})
                  </option>
                ))}
                <option value="custom">+ Enter New / Custom Client Details</option>
              </select>
            </div>

            {/* Row 1: Company Name & Contact Person (2 Columns) */}
            <div className="grid-2" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Apex Apparel & Lifestyle"
                  style={{ fontWeight: 600 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Person Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Robert Sterling"
                />
              </div>
            </div>

            {/* Row 2: Billing Email, Phone Number, Tax ID, PIN Code (4 Columns) */}
            <div className="grid-4" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Billing Email *</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="form-input"
                  placeholder="billing@company.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="form-input font-mono"
                  placeholder="e.g. +91 98200 11223"
                />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={clientTaxId}
                  onChange={(e) => setClientTaxId(e.target.value)}
                  className="form-input font-mono"
                  placeholder="GSTIN-27APXAP9042K1Z4"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Client PIN Code</label>
                <input
                  type="text"
                  value={clientPincode}
                  onChange={(e) => setClientPincode(e.target.value)}
                  className="form-input font-mono"
                  placeholder="e.g. 400013"
                />
              </div>
            </div>

            {/* Row 3: Billing Address Field */}
            <div className="form-group">
              <label className="form-label">Client Billing Address</label>
              <textarea
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                className="form-textarea"
                rows={2}
                placeholder="e.g. 102 Fashion Avenue, Lower Parel, Mumbai, Maharashtra"
              />
            </div>
          </div>

          {/* Section 2: Invoice Metadata */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <Calendar size={18} />
              <span>Document Meta & Schedule</span>
            </h3>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Invoice Number (Auto-Generated)</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="form-input font-mono"
                  style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.04em' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="form-select"
                  style={{ fontWeight: 600 }}
                >
                  {DEFAULT_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setIssueDate(newDate);
                    if (!isEditing && newDate) {
                      setInvoiceNumber(generateNextInvoiceNumber(0, newDate));
                    }
                  }}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Line Items */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={18} />
                <span>Campaign Deliverables & Services</span>
              </h3>
              <button onClick={handleAddItem} className="btn btn-outline btn-sm">
                <Plus size={14} />
                <span>Add Deliverable</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-input)',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Campaign scope details..."
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="btn btn-danger btn-sm"
                      title="Remove Item"
                      disabled={items.length <= 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="editor-item-grid">
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                        className="form-input font-mono"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Unit Price ({currencySymbol})</label>
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                        className="form-input font-mono"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tax (%)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.taxRate ?? settings.defaultTaxRate}
                        onChange={(e) => handleItemChange(item.id, 'taxRate', Number(e.target.value))}
                        className="form-input font-mono"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Amount</label>
                      <div className="form-input font-mono" style={{ background: 'var(--bg-card-light)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatAmount(item.quantity * item.unitPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Adjustments & Notes */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Financial Adjustments & Terms
            </h3>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Discount Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(Number(e.target.value))}
                  className="form-input font-mono"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Logistics / Media Fee ({currencySymbol})</label>
                <input
                  type="number"
                  min="0"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Number(e.target.value))}
                  className="form-input font-mono"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Terms</label>
              <input
                type="text"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Client Notes / Special Instructions</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-textarea"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Creative & Compact Document Live Preview */}
        <div style={{ position: 'sticky', top: '1rem', height: 'fit-content' }} className={activeMobileTab !== 'preview' ? 'hide-mobile' : ''}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem', letterSpacing: '0.05em' }}>
            <Sparkles size={14} color="#ffffff" />
            <span>Creative Document Live Preview</span>
          </div>

          <div
            className="card"
            style={{
              background: '#ffffff',
              color: '#09090b',
              padding: '1.75rem',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
              fontSize: '0.8rem',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {/* Header: Logo, Company Name, Tagline & Company Address */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {settings.showLogo !== false && (settings.logoUrl || settings.companyName) && (
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e4e4e7', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={settings.logoUrl || "/favicon.png"} alt={settings.companyName || "Logo"} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                  {(settings.companyName || settings.tagline) && (
                    <div>
                      {settings.companyName && (
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#09090b', letterSpacing: '-0.02em', margin: 0, textTransform: 'uppercase' }}>
                          {settings.companyName}
                        </h3>
                      )}
                      {settings.tagline && (
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {settings.tagline}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Company Registered Office Address & GSTIN */}
                {(settings.address || companyGstinClean) && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.725rem', color: '#3f3f46', lineHeight: 1.35, maxWidth: '300px' }}>
                    {settings.address && <div style={{ fontWeight: 600 }}>{settings.address}{settings.pincode ? ` - ${settings.pincode}` : ''}</div>}
                    {companyGstinClean && (
                      <div style={{ marginTop: '0.15rem' }}>
                        GSTIN: <strong>{companyGstinClean}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#09090b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>
                  INVOICE
                </h2>
              </div>
            </div>

            {/* Accent Line */}
            <div style={{ height: '3.5px', background: '#09090b', width: '100%', marginTop: '0.75rem', marginBottom: '1.25rem' }} />

            {/* Billed To & Document Meta Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                  INVOICE TO:
                </div>
                {(clientCompany || clientName) && (
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#09090b' }}>
                    {clientCompany || clientName}
                  </div>
                )}
                <div style={{ fontSize: '0.775rem', color: '#3f3f46', marginTop: '0.15rem', lineHeight: 1.35 }}>
                  {clientName && clientCompany && <div style={{ fontWeight: 600 }}>{clientName}</div>}
                  {clientAddress && <div>{clientAddress}{clientPincode ? ` - ${clientPincode}` : ''}</div>}
                  {clientEmail && <div>Email: {clientEmail}</div>}
                  {clientPhone && <div>Phone: {clientPhone}</div>}
                  {clientGstinClean && <div>GSTIN: {clientGstinClean}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', gap: '0.3rem', fontSize: '0.775rem' }}>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                  <span style={{ fontWeight: 800, color: '#09090b' }}>Invoice#</span>
                  <span className="font-mono" style={{ fontWeight: 800, color: '#09090b' }}>{invoiceNumber}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                  <span style={{ fontWeight: 800, color: '#09090b' }}>Date</span>
                  <span>{issueDate}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                  <span style={{ fontWeight: 800, color: '#09090b' }}>Due Date</span>
                  <span>{dueDate}</span>
                </div>
                {settings.defaultPaymentTermsDays ? (
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                    <span style={{ fontWeight: 800, color: '#09090b' }}>Payment Terms</span>
                    <span>Within {settings.defaultPaymentTermsDays} days</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Section Divider */}
            <div style={{ height: '1.5px', background: '#e2e8f0', width: '100%', marginBottom: '1.25rem' }} />

            {/* Deliverables Table Header Block */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ background: '#18181b', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0.65rem', fontSize: '0.675rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: '30px', textAlign: 'center' }}>
                    SL.
                  </th>
                  <th style={{ padding: '0.5rem 0.65rem', fontSize: '0.675rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Deliverables & Services
                  </th>
                  <th style={{ padding: '0.5rem 0.65rem', fontSize: '0.675rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Qty.
                  </th>
                  <th style={{ padding: '0.5rem 0.65rem', fontSize: '0.675rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Price
                  </th>
                  <th style={{ padding: '0.5rem 0.65rem', fontSize: '0.675rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', textAlign: 'center', fontWeight: 700, color: '#09090b' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.775rem', color: '#09090b', fontWeight: 600 }}>
                      {item.description || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', textAlign: 'center', color: '#3f3f46' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', textAlign: 'right', color: '#3f3f46' }}>
                      {formatAmount(item.unitPrice)}
                    </td>
                    <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.775rem', textAlign: 'right', fontWeight: 800, color: '#09090b' }}>
                      {formatAmount(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Summary & Totals Block */}
            {(() => {
              const hasBankInfo = Boolean(settings.bankName || settings.accountNumber || settings.ifscSwift || settings.upiId);
              const footerContact = [
                settings.phone && `Phone: ${settings.phone}`,
                settings.email && `Email: ${settings.email}`,
                settings.website && `Website: ${settings.website}`,
              ].filter(Boolean).join(' | ');

              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: hasBankInfo ? '1.1fr 0.9fr' : '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    {hasBankInfo && (
                      <div style={{ fontSize: '0.725rem', color: '#3f3f46', lineHeight: 1.45 }}>
                        <div style={{ fontWeight: 800, color: '#09090b', marginBottom: '0.35rem', fontSize: '0.775rem' }}>
                          Payment Details
                        </div>
                        {(settings.accountName || settings.companyName) && <div>Account Name: <strong>{settings.accountName || settings.companyName}</strong></div>}
                        {settings.bankName && <div>Bank: <strong>{settings.bankName}</strong></div>}
                        {settings.accountNumber && <div>Account #: <span className="font-mono"><strong>{settings.accountNumber}</strong></span></div>}
                        {settings.ifscSwift && <div>IFSC: <span className="font-mono"><strong>{settings.ifscSwift}</strong></span></div>}
                        {settings.upiId && <div>UPI ID: <span className="font-mono"><strong>{settings.upiId}</strong></span></div>}
                      </div>
                    )}

                    {/* Totals Summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.775rem', marginLeft: hasBankInfo ? undefined : 'auto', minWidth: '220px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.15rem 0.25rem' }}>
                        <span style={{ fontWeight: 700 }}>Sub Total:</span>
                        <span style={{ fontWeight: 800, color: '#09090b' }}>{formatAmount(subtotal)}</span>
                      </div>

                      {discountTotal > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.15rem 0.25rem' }}>
                          <span style={{ fontWeight: 700 }}>Discount ({discountRate}%):</span>
                          <span>-{formatAmount(discountTotal)}</span>
                        </div>
                      )}

                      {taxTotal > 0 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.15rem 0.25rem' }}>
                            <span style={{ fontWeight: 700 }}>CGST ({((settings.defaultTaxRate || 18) / 2)}%):</span>
                            <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(taxTotal / 2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.15rem 0.25rem' }}>
                            <span style={{ fontWeight: 700 }}>SGST ({((settings.defaultTaxRate || 18) / 2)}%):</span>
                            <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(taxTotal / 2)}</span>
                          </div>
                        </>
                      )}

                      {/* Solid Black Total Block */}
                      <div
                        style={{
                          background: '#09090b',
                          color: '#ffffff',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '0.35rem',
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total:</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: 900 }}>{formatAmount(grandTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Amount in Words Block */}
                  <div style={{ background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      Amount in Words:
                    </span>
                    <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>
                      {numberToWordsINR(grandTotal)}
                    </span>
                  </div>

                  {/* Bottom Footer Section: Authorised Signatory Above, Contact Line Under It */}
                  <div style={{ borderTop: '2px solid #09090b', paddingTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ textAlign: 'center', minWidth: '150px' }}>
                        <div style={{ borderBottom: '1.5px solid #09090b', marginBottom: '0.25rem', width: '100%', height: '22px' }} />
                        <div style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, fontSize: '0.7rem', color: '#09090b' }}>
                          Authorised Signatory
                        </div>
                      </div>
                    </div>
                    {footerContact && (
                      <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '0.5rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#09090b' }}>
                        {footerContact}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
