import React, { useState } from 'react';
import type { Invoice, Bill, Payment, PaymentMethod, BusinessSettings } from '../types/invoice';
import { generateNextPaymentNumber, getCurrencySymbol } from '../services/storageService';
import { X, CheckCircle, CreditCard, AlertCircle } from 'lucide-react';

interface RecordPaymentModalProps {
  invoices: Invoice[];
  bills: Bill[];
  settings: BusinessSettings;
  paymentsCount: number;
  initialDocument?: { type: 'invoice' | 'bill'; id: string };
  onSavePayment: (payment: Payment) => void;
  onClose: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  invoices,
  bills,
  settings,
  paymentsCount,
  initialDocument,
  onSavePayment,
  onClose,
}) => {
  const currencySymbol = getCurrencySymbol(settings.currency);

  const [documentType, setDocumentType] = useState<'invoice' | 'bill'>(
    initialDocument?.type || 'invoice'
  );

  // Filter open documents with balance > 0
  const openInvoices = invoices.filter(
    (i) => i.status !== 'cancelled' && (i.balanceDue === undefined || i.balanceDue > 0 || i.status !== 'paid')
  );
  const openBills = bills.filter(
    (b) => b.paymentStatus !== 'cancelled' && (b.balanceDue > 0 || b.paymentStatus !== 'paid')
  );

  const [selectedDocId, setSelectedDocId] = useState<string>(() => {
    if (initialDocument) return initialDocument.id;
    if (documentType === 'invoice' && openInvoices[0]) return openInvoices[0].id;
    if (documentType === 'bill' && openBills[0]) return openBills[0].id;
    return '';
  });

  const currentDoc =
    documentType === 'invoice'
      ? invoices.find((i) => i.id === selectedDocId)
      : bills.find((b) => b.id === selectedDocId);

  const docTotal = currentDoc?.total || 0;
  const docPaid = currentDoc?.paidAmount || (documentType === 'invoice' && (currentDoc as Invoice)?.status === 'paid' ? docTotal : 0);
  const remainingBalance = Math.max(0, docTotal - docPaid);

  const [amount, setAmount] = useState<number>(remainingBalance);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDocumentChange = (id: string) => {
    setSelectedDocId(id);
    const doc =
      documentType === 'invoice'
        ? invoices.find((i) => i.id === id)
        : bills.find((b) => b.id === id);
    if (doc) {
      const tot = doc.total;
      const pd = doc.paidAmount || (documentType === 'invoice' && (doc as Invoice).status === 'paid' ? tot : 0);
      const rem = Math.max(0, tot - pd);
      setAmount(rem);
    }
  };

  const handleTypeToggle = (type: 'invoice' | 'bill') => {
    setDocumentType(type);
    const first = type === 'invoice' ? openInvoices[0] : openBills[0];
    if (first) {
      setSelectedDocId(first.id);
      const tot = first.total;
      const pd = first.paidAmount || (type === 'invoice' && (first as Invoice).status === 'paid' ? tot : 0);
      setAmount(Math.max(0, tot - pd));
    } else {
      setSelectedDocId('');
      setAmount(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDoc) {
      setErrorMessage('Please select a valid document to settle.');
      return;
    }

    const payAmount = Number(amount);
    if (payAmount <= 0) {
      setErrorMessage('Payment amount must be greater than zero.');
      return;
    }

    if (payAmount > remainingBalance + 0.01) {
      setErrorMessage(`Payment cannot exceed outstanding balance of ${currencySymbol}${remainingBalance.toLocaleString('en-IN')}.`);
      return;
    }

    const newPayment: Payment = {
      id: generateNextPaymentNumber(paymentsCount),
      documentType,
      documentId: currentDoc.id,
      documentNumber: documentType === 'invoice' ? (currentDoc as Invoice).invoiceNumber : (currentDoc as Bill).billNumber,
      customerId: documentType === 'invoice' ? (currentDoc as Invoice).clientId : (currentDoc as Bill).customerId,
      customerName: documentType === 'invoice' ? (currentDoc as Invoice).clientName : (currentDoc as Bill).customerName,
      customerCompany: documentType === 'invoice' ? (currentDoc as Invoice).clientCompany : (currentDoc as Bill).customerCompany,
      amount: payAmount,
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || 'N/A',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSavePayment(newPayment);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }}>
      <div className="modal-content" style={{ maxWidth: '520px', padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
              <CreditCard size={16} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Record Payment Receipt
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem' }}>
            <X size={16} />
          </button>
        </div>

        {errorMessage && (
          <div style={{ padding: '0.65rem 0.85rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Document Type Selector */}
          <div className="form-group">
            <label className="form-label">Settling Document Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleTypeToggle('invoice')}
                className={`btn ${documentType === 'invoice' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8125rem' }}
              >
                Invoices ({openInvoices.length} open)
              </button>
              <button
                type="button"
                onClick={() => handleTypeToggle('bill')}
                className={`btn ${documentType === 'bill' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8125rem' }}
              >
                Bills ({openBills.length} open)
              </button>
            </div>
          </div>

          {/* Select Target Document */}
          <div className="form-group">
            <label className="form-label">
              Select {documentType === 'invoice' ? 'Invoice' : 'Bill'}
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => handleDocumentChange(e.target.value)}
              className="form-select font-mono"
              required
            >
              {documentType === 'invoice' ? (
                openInvoices.length === 0 ? (
                  <option value="">No open invoices pending payment</option>
                ) : (
                  openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.clientCompany} ({currencySymbol}{inv.total.toLocaleString('en-IN')})
                    </option>
                  ))
                )
              ) : openBills.length === 0 ? (
                <option value="">No open bills pending payment</option>
              ) : (
                openBills.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.billNumber} — {b.customerCompany || b.customerName} ({currencySymbol}{b.total.toLocaleString('en-IN')})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Balance Breakdown Card */}
          {currentDoc && (
            <div style={{ padding: '0.85rem', background: 'var(--bg-card-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Document Total</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: '0.15rem' }}>
                  {currencySymbol}{docTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Already Paid</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--success)', marginTop: '0.15rem' }}>
                  {currencySymbol}{docPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Outstanding Due</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: remainingBalance > 0 ? 'var(--warning)' : 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {currencySymbol}{remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {/* Payment Amount & Quick Max Button */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Payment Amount ({currencySymbol})</label>
              {remainingBalance > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(remainingBalance);
                    setErrorMessage(null);
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', height: 'auto' }}
                >
                  Pay Full Balance
                </button>
              )}
            </div>
            <input
              type="number"
              min="0.01"
              max={remainingBalance}
              step="any"
              value={amount}
              onChange={(e) => {
                setAmount(Number(e.target.value));
                setErrorMessage(null);
              }}
              className="form-input font-mono"
              required
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
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
                <option value="UPI">UPI / QR Code</option>
                <option value="Bank Transfer">Bank Wire Transfer (NEFT/IMPS)</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Cash">Cash at Counter</option>
                <option value="Cheque">Corporate Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reference / UTR / Transaction #</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="form-input font-mono"
              placeholder="e.g. UTR-992819481 or NEFT ref"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input"
              placeholder="e.g. Part payment tranche 1 received via UPI."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!currentDoc || remainingBalance <= 0}>
              <CheckCircle size={15} />
              <span>Record & Settle Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
