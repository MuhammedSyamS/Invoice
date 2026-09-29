import React, { useState } from 'react';
import type {
  Bill,
  Client,
  Product,
  BusinessSettings,
  PaymentMethod,
  BillStatus,
  LineItem,
} from '../types/invoice';
import { calculateDocumentFinancials, calculatePaymentStatus } from '../services/calculationEngine';
import { generateNextBillNumber, getCurrencySymbol } from '../services/storageService';
import { X, Plus, Trash2, Save, Receipt } from 'lucide-react';

interface BillEditorModalProps {
  billToEdit?: Bill | null;
  clients: Client[];
  products: Product[];
  settings: BusinessSettings;
  billsCount: number;
  onSave: (bill: Bill, recordedPaymentAmount?: number) => void;
  onClose: () => void;
}

export const BillEditorModal: React.FC<BillEditorModalProps> = ({
  billToEdit,
  clients,
  products,
  settings,
  billsCount,
  onSave,
  onClose,
}) => {
  const isEditing = !!billToEdit;
  const [billId] = useState<string>(() => billToEdit?.id || `bill-${Date.now()}`);
  const currencySymbol = getCurrencySymbol(settings.currency);

  const [billNumber, setBillNumber] = useState(
    () => billToEdit?.billNumber || generateNextBillNumber(billsCount, undefined, settings.billPrefix)
  );
  const [billDate, setBillDate] = useState(
    () => billToEdit?.billDate || new Date().toISOString().slice(0, 10)
  );

  // Customer state
  const [selectedClientId, setSelectedClientId] = useState<string>(
    () => billToEdit?.customerId || (clients[0]?.id || 'custom')
  );
  const [customerName, setCustomerName] = useState(() => billToEdit?.customerName || clients[0]?.name || '');
  const [customerCompany, setCustomerCompany] = useState(() => billToEdit?.customerCompany || clients[0]?.company || '');
  const [customerPhone, setCustomerPhone] = useState(() => billToEdit?.customerPhone || clients[0]?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(() => billToEdit?.customerEmail || clients[0]?.email || '');
  const [customerAddress, setCustomerAddress] = useState(() => billToEdit?.customerAddress || clients[0]?.address || '');
  const [customerGstin, setCustomerGstin] = useState(() => billToEdit?.customerGstin || clients[0]?.taxId || '');

  // Line Items
  const [items, setItems] = useState<LineItem[]>(() => {
    if (billToEdit && billToEdit.items.length > 0) return billToEdit.items;
    if (products.length > 0) {
      const p = products[0];
      return [
        {
          id: `bitem-${Date.now()}`,
          productId: p.id,
          description: p.name,
          quantity: 1,
          unitPrice: p.price,
          taxRate: p.taxRate,
          hsnSac: p.hsnSac,
          unit: p.unit,
          amount: p.price,
        },
      ];
    }
    return [
      {
        id: `bitem-${Date.now()}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: settings.defaultTaxRate || 0,
        amount: 0,
      },
    ];
  });

  // Financial parameters
  const [discountRate, setDiscountRate] = useState<number>(() => billToEdit?.discountRate || 0);
  const [isInterState, setIsInterState] = useState<boolean>(() => billToEdit?.isInterState || false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => billToEdit?.paymentMethod || 'UPI');
  const [paymentStatus, setPaymentStatus] = useState<BillStatus>(() => billToEdit?.paymentStatus || 'paid');
  const [paidAmountInput, setPaidAmountInput] = useState<number>(() => billToEdit?.paidAmount || 0);
  const [notes, setNotes] = useState<string>(() => billToEdit?.notes || settings.billNotesFooter || '');

  // Live calculations via unified financial engine
  const calculation = calculateDocumentFinancials({
    items,
    discountRate,
    isInterState,
    enableRoundOff: true,
  });

  // Customer selection handler

  const handleCustomerChange = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId === 'custom') {
      setCustomerName('');
      setCustomerCompany('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setCustomerGstin('');
      return;
    }
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setCustomerName(found.name);
      setCustomerCompany(found.company);
      setCustomerPhone(found.phone);
      setCustomerEmail(found.email);
      setCustomerAddress(found.address);
      setCustomerGstin(found.taxId);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `bitem-${Date.now()}-${prev.length}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: settings.defaultTaxRate || 0,
        hsnSac: '',
        unit: 'unit',
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof LineItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          if (field === 'quantity' || field === 'unitPrice') {
            updated.amount = Number((Number(updated.quantity) * Number(updated.unitPrice)).toFixed(2));
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleSelectProduct = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const qty = item.quantity || 1;
          return {
            ...item,
            productId: product.id,
            description: product.name,
            unitPrice: product.price,
            taxRate: product.taxRate,
            hsnSac: product.hsnSac,
            unit: product.unit,
            amount: Number((qty * product.price).toFixed(2)),
          };
        }
        return item;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalPaid = Number(paidAmountInput) || 0;
    if (paymentStatus === 'paid') {
      finalPaid = calculation.total;
    } else if (paymentStatus === 'unpaid') {
      finalPaid = 0;
    }

    const { status, balanceDue } = calculatePaymentStatus(calculation.total, finalPaid);

    const finalizedBill: Bill = {
      id: billId,
      billNumber: billNumber.trim(),
      customerId: selectedClientId || 'custom',
      customerName: customerName.trim() || 'Walk-in Customer',
      customerCompany: customerCompany.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      customerAddress: customerAddress.trim(),
      customerGstin: customerGstin.trim(),
      billDate,
      items: calculation.items,
      subtotal: calculation.subtotal,
      discountRate: calculation.discountRate,
      discountTotal: calculation.discountTotal,
      taxTotal: calculation.taxTotal,
      cgst: calculation.cgst,
      sgst: calculation.sgst,
      igst: calculation.igst,
      isInterState,
      roundOff: calculation.roundOff,
      total: calculation.total,
      paidAmount: finalPaid,
      balanceDue,
      paymentStatus: status === 'overpaid' ? 'paid' : status,
      paymentMethod,
      notes: notes.trim(),
      currency: settings.currency || 'INR',
      createdAt: billToEdit?.createdAt || new Date().toISOString(),
    };

    onSave(finalizedBill, finalPaid);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '850px', padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
              <Receipt size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {isEditing ? `Edit Bill ${billNumber}` : 'Create Quick Sales Bill / Cash Receipt'}
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Immediate sales transaction with GST calculation and instant payment logging.
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Bill Meta Row */}
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Bill Number</label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="form-input font-mono"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bill Date</label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">GST Tax Mode</label>
              <select
                value={isInterState ? 'igst' : 'cgst_sgst'}
                onChange={(e) => setIsInterState(e.target.value === 'igst')}
                className="form-select"
              >
                <option value="cgst_sgst">Intra-State (CGST + SGST)</option>
                <option value="igst">Inter-State (IGST)</option>
              </select>
            </div>
          </div>

          {/* Customer Selection Block */}
          <div style={{ padding: '0.85rem', background: 'var(--bg-card-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div className="grid-3" style={{ marginBottom: '0.65rem' }}>
              <div className="form-group">
                <label className="form-label">Select Customer (CRM)</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="form-select"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company || c.name} ({c.city || 'India'})
                    </option>
                  ))}
                  <option value="custom">+ Walk-in / Custom Customer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Customer / Company Name</label>
                <input
                  type="text"
                  value={customerCompany || customerName}
                  onChange={(e) => {
                    setCustomerCompany(e.target.value);
                    setCustomerName(e.target.value);
                  }}
                  className="form-input"
                  placeholder="e.g. Acme Corp or John Doe"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Customer GSTIN (Optional)</label>
                <input
                  type="text"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value)}
                  className="form-input font-mono"
                  placeholder="GSTIN..."
                />
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="form-input"
                  placeholder="+91..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="form-input"
                  placeholder="client@email.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Billing Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="form-input"
                  placeholder="City, State"
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Line Items & Deliverables</label>
              <button type="button" onClick={handleAddItem} className="btn btn-secondary btn-sm">
                <Plus size={13} />
                <span>Add Item</span>
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="table-container bill-desktop-items-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Item / Product</th>
                    <th style={{ width: '12%' }}>HSN/SAC</th>
                    <th style={{ width: '10%' }}>Qty</th>
                    <th style={{ width: '16%' }}>Rate ({currencySymbol})</th>
                    <th style={{ width: '10%' }}>GST %</th>
                    <th style={{ width: '16%', textAlign: 'right' }}>Amount</th>
                    <th style={{ width: '6%', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {products.length > 0 && (
                            <select
                              value={item.productId || ''}
                              onChange={(e) => handleSelectProduct(item.id, e.target.value)}
                              className="form-select"
                              style={{ fontSize: '0.725rem', padding: '0.25rem 0.4rem', height: '26px' }}
                            >
                              <option value="">-- Choose from Catalog --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({currencySymbol}{p.price})
                                </option>
                              ))}
                            </select>
                          )}
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            className="form-input"
                            placeholder="Description"
                            required
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.hsnSac || ''}
                          onChange={(e) => handleItemChange(item.id, 'hsnSac', e.target.value)}
                          className="form-input font-mono"
                          placeholder="HSN"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          className="form-input font-mono"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                          className="form-input font-mono"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.taxRate}
                          onChange={(e) => handleItemChange(item.id, 'taxRate', e.target.value)}
                          className="form-input font-mono"
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className="font-mono">
                        {currencySymbol}{(item.quantity * item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)', padding: '0.25rem' }}
                          title="Remove Line Item"
                          disabled={items.length <= 1}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card-style Items View */}
            <div className="bill-mobile-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {items.map((item, idx) => (
                <div key={item.id} style={{ background: 'var(--bg-card-light)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                      ITEM #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="btn btn-danger btn-sm"
                      style={{ padding: '0.25rem 0.5rem' }}
                      disabled={items.length <= 1}
                      title="Remove Item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {products.length > 0 && (
                    <select
                      value={item.productId || ''}
                      onChange={(e) => handleSelectProduct(item.id, e.target.value)}
                      className="form-select"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                    >
                      <option value="">-- Choose from Catalog --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({currencySymbol}{p.price})
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="form-input"
                      placeholder="Item description..."
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Qty</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                        className="form-input font-mono"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Rate ({currencySymbol})</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                        className="form-input font-mono"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>GST %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(item.id, 'taxRate', e.target.value)}
                        className="form-input font-mono"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>HSN / SAC</label>
                      <input
                        type="text"
                        value={item.hsnSac || ''}
                        onChange={(e) => handleItemChange(item.id, 'hsnSac', e.target.value)}
                        className="form-input font-mono"
                        placeholder="HSN"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '0.4rem 0.65rem', borderRadius: 'var(--radius-xs)', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Item Total</span>
                    <span style={{ fontWeight: 800, color: 'var(--text-primary)' }} className="font-mono">
                      {currencySymbol}{(item.quantity * item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Payment Grid */}
          <div className="grid-2">
            {/* Payment Recording Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.85rem', background: 'var(--bg-card-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                Payment Settlement
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="form-select"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cash">Cash at Counter</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => {
                      const st = e.target.value as BillStatus;
                      setPaymentStatus(st);
                      if (st === 'paid') setPaidAmountInput(calculation.total);
                      if (st === 'unpaid') setPaidAmountInput(0);
                    }}
                    className="form-select"
                  >
                    <option value="paid">Fully Paid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {paymentStatus === 'partially_paid' && (
                <div className="form-group">
                  <label className="form-label">Amount Paid ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    max={calculation.total}
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(Number(e.target.value))}
                    className="form-input font-mono"
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.2rem' }}>
                    Balance remaining: {currencySymbol}{Math.max(0, calculation.total - paidAmountInput).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Notes & Terms</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-textarea"
                  rows={2}
                  placeholder="Receipt notes, warranty, or return terms."
                />
              </div>
            </div>

            {/* Calculations Summary Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8125rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Financial Summary
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal:</span>
                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                  {currencySymbol}{calculation.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Discount Rate (%):</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(Number(e.target.value))}
                  className="form-input font-mono"
                  style={{ width: '80px', padding: '0.2rem 0.4rem', height: '26px', textAlign: 'right' }}
                />
              </div>

              {calculation.discountTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Discount Total:</span>
                  <span className="font-mono">
                    -{currencySymbol}{calculation.discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Taxable Amount:</span>
                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                  {currencySymbol}{calculation.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {isInterState ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>IGST Total:</span>
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    {currencySymbol}{calculation.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>CGST:</span>
                    <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                      {currencySymbol}{calculation.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>SGST:</span>
                    <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                      {currencySymbol}{calculation.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}

              {calculation.roundOff !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Round-off:</span>
                  <span className="font-mono">
                    {calculation.roundOff > 0 ? `+${calculation.roundOff}` : calculation.roundOff}
                  </span>
                </div>
              )}

              {/* Total Banner */}
              <div
                style={{
                  marginTop: '0.4rem',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--primary)',
                  color: 'var(--primary-text)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Grand Total</span>
                <span className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  {currencySymbol}{calculation.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={15} />
              <span>{isEditing ? 'Update Bill' : 'Issue Bill & Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
