import React, { useRef, useState } from 'react';
import type { Invoice, BusinessSettings } from '../types/invoice';
import { getCurrencySymbol, numberToWordsINR } from '../services/storageService';
import {
  X,
  Printer,
  Download,
  CheckCircle,
  CreditCard,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceViewModalProps {
  invoice: Invoice;
  settings: BusinessSettings;
  onClose: () => void;
  onMarkPaid: (invoiceId: string, method?: string) => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  invoice,
  settings,
  onClose,
  onMarkPaid,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('UPI / Bank Transfer');

  const currencySymbol = getCurrencySymbol(invoice.currency);

  const formatGstin = (taxId?: string): string => {
    if (!taxId) return '';
    return taxId.replace(/^GSTIN[-:\s]*/i, '');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const element = invoiceRef.current;
      const originalScrollTop = window.scrollY;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      window.scrollTo(0, originalScrollTop);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210; // A4 width mm
      const pdfHeight = 297; // A4 height mm
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      if (imgHeight <= pdfHeight) {
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, imgHeight, '', 'FAST');
      } else {
        const totalPages = Math.ceil(imgHeight / pdfHeight);

        for (let page = 1; page <= totalPages; page++) {
          if (page > 1) {
            pdf.addPage();
            // Continuation Header Bar
            pdf.setFillColor(9, 9, 11);
            pdf.rect(0, 0, 210, 10, 'F');
            pdf.setFontSize(8);
            pdf.setTextColor(255, 255, 255);
            pdf.text(
              `${settings.companyName.toUpperCase()} — INVOICE ${invoice.invoiceNumber} (Continued)`,
              105,
              6.5,
              { align: 'center' }
            );
          }

          const position = -(page - 1) * pdfHeight + (page > 1 ? 8 : 0);
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, pdfWidth, imgHeight, '', 'FAST');

          // Continuation Footer
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Page ${page} of ${totalPages}`, 105, 292, { align: 'center' });
        }
      }

      pdf.save(`${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const formatAmount = (num: number) => {
    return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const halfTax = invoice.taxTotal / 2;
  const halfTaxRate = (settings.defaultTaxRate || 18) / 2;
  const companyGstinClean = formatGstin(settings.taxId);
  const clientGstinClean = formatGstin(invoice.clientTaxId);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '820px' }}>
        {/* Modal Toolbar (No-Print) */}
        <div
          className="no-print"
          style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-sidebar)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`badge badge-${invoice.status}`}>{invoice.status}</span>
            <span className="font-mono" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
              {invoice.invoiceNumber}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {invoice.status !== 'paid' && (
              <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary btn-sm">
                <CreditCard size={15} />
                <span className="btn-label-text">Record Payment</span>
              </button>
            )}

            <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="btn btn-secondary btn-sm">
              <Download size={15} />
              <span className="btn-label-text">{isGeneratingPdf ? 'Generating...' : 'PDF'}</span>
            </button>

            <button onClick={handlePrint} className="btn btn-secondary btn-sm">
              <Printer size={15} />
              <span className="btn-label-text">Print</span>
            </button>

            <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.5rem' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Premium Modern Highphaus Invoice Document Container */}
        <div style={{ padding: '1.5rem', background: '#ffffff', overflowY: 'auto' }}>
          <div
            ref={invoiceRef}
            className="printable-invoice"
            style={{
              background: '#ffffff',
              color: '#09090b',
              padding: '2rem',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {/* Header: Logo, Company Name, Tagline & Company Address */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e4e4e7', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/favicon.png" alt="Highphaus Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#09090b', letterSpacing: '-0.02em', margin: 0, textTransform: 'uppercase' }}>
                      {settings.companyName}
                    </h1>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {settings.tagline}
                    </div>
                  </div>
                </div>

                {/* Company Registered Office Address & GSTIN */}
                <div style={{ marginTop: '0.45rem', fontSize: '0.75rem', color: '#3f3f46', lineHeight: 1.35, maxWidth: '340px' }}>
                  <div style={{ fontWeight: 600 }}>{settings.address}{settings.pincode ? ` - ${settings.pincode}` : ''}</div>
                  {companyGstinClean && (
                    <div style={{ marginTop: '0.15rem' }}>
                      GSTIN: <strong>{companyGstinClean}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#09090b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>
                  INVOICE
                </h2>
              </div>
            </div>

            {/* Accent Line */}
            <div style={{ height: '3.5px', background: '#09090b', width: '100%', marginTop: '0.85rem', marginBottom: '1.25rem' }} />

            {/* Billed To & Document Meta Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                  INVOICE TO:
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#09090b' }}>
                  {invoice.clientCompany || invoice.clientName}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#3f3f46', marginTop: '0.2rem', lineHeight: 1.35 }}>
                  <div style={{ fontWeight: 600 }}>{invoice.clientName}</div>
                  <div>{invoice.clientAddress}{invoice.clientPincode ? ` - ${invoice.clientPincode}` : ''}</div>
                  <div>Email: {invoice.clientEmail}</div>
                  {invoice.clientPhone && <div>Phone: {invoice.clientPhone}</div>}
                  {clientGstinClean && <div>GSTIN: {clientGstinClean}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', gap: '0.35rem', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'space-between', width: '100%', maxWidth: '220px' }}>
                  <span style={{ fontWeight: 800, color: '#09090b' }}>Invoice#</span>
                  <span className="font-mono" style={{ fontWeight: 800, color: '#09090b' }}>{invoice.invoiceNumber}</span>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'space-between', width: '100%', maxWidth: '220px' }}>
                  <span style={{ fontWeight: 800, color: '#09090b' }}>Date</span>
                  <span>{invoice.issueDate}</span>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'space-between', width: '100%', maxWidth: '220px' }}>
                  <span style={{ fontWeight: 800, color: '#09090b' }}>Due Date</span>
                  <span>{invoice.dueDate}</span>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'space-between', width: '100%', maxWidth: '220px' }}>
                  <span style={{ fontWeight: 800, color: '#09090b' }}>Payment Terms</span>
                  <span>Within {settings.defaultPaymentTermsDays || 15} days</span>
                </div>
              </div>
            </div>

            {/* Section Divider */}
            <div style={{ height: '1.5px', background: '#e2e8f0', width: '100%', marginBottom: '1.25rem' }} />

            {/* Deliverables Table Header Block */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ background: '#18181b', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: '35px', textAlign: 'center' }}>
                    SL.
                  </th>
                  <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Deliverables & Services
                  </th>
                  <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Qty.
                  </th>
                  <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Price
                  </th>
                  <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.8rem', textAlign: 'center', fontWeight: 700, color: '#09090b' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.825rem', color: '#09090b', fontWeight: 600 }}>
                      {item.description}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.8rem', textAlign: 'center', color: '#3f3f46' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.8rem', textAlign: 'right', color: '#3f3f46' }}>
                      {formatAmount(item.unitPrice)}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.825rem', textAlign: 'right', fontWeight: 800, color: '#09090b' }}>
                      {formatAmount(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Summary & Totals Block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.775rem', color: '#3f3f46', lineHeight: 1.45 }}>
                <div style={{ fontWeight: 800, color: '#09090b', marginBottom: '0.35rem', fontSize: '0.825rem' }}>
                  Payment Details
                </div>
                <div>Account Name: <strong>{settings.accountName || settings.companyName}</strong></div>
                <div>Bank: <strong>{settings.bankName}</strong></div>
                <div>Account #: <span className="font-mono"><strong>{settings.accountNumber}</strong></span></div>
                <div>IFSC: <span className="font-mono"><strong>{settings.ifscSwift}</strong></span></div>
                {settings.upiId && <div>UPI ID: <span className="font-mono"><strong>{settings.upiId}</strong></span></div>}
              </div>

              {/* Totals Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.2rem 0.35rem' }}>
                  <span style={{ fontWeight: 700 }}>Sub Total:</span>
                  <span style={{ fontWeight: 800, color: '#09090b' }}>{formatAmount(invoice.subtotal)}</span>
                </div>

                {invoice.discountTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.2rem 0.35rem' }}>
                    <span style={{ fontWeight: 700 }}>Discount ({invoice.discountRate}%):</span>
                    <span>-{formatAmount(invoice.discountTotal)}</span>
                  </div>
                )}

                {invoice.taxTotal > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.2rem 0.35rem' }}>
                      <span style={{ fontWeight: 700 }}>CGST ({halfTaxRate}%):</span>
                      <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(halfTax)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.2rem 0.35rem' }}>
                      <span style={{ fontWeight: 700 }}>SGST ({halfTaxRate}%):</span>
                      <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(halfTax)}</span>
                    </div>
                  </>
                )}

                {/* Solid Black Total Block */}
                <div
                  style={{
                    background: '#09090b',
                    color: '#ffffff',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.35rem',
                  }}
                >
                  <span style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total:</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900 }}>{formatAmount(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Amount in Words Block */}
            <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                Amount in Words:
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b' }}>
                {numberToWordsINR(invoice.total)}
              </span>
            </div>

            {/* Bottom Footer Section: Authorised Signatory Above, Contact Line Under It */}
            <div style={{ borderTop: '2px solid #09090b', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ textAlign: 'center', minWidth: '170px' }}>
                  <div style={{ borderBottom: '1.5px solid #09090b', marginBottom: '0.25rem', width: '100%', height: '26px' }} />
                  <div style={{ fontWeight: 800, fontSize: '0.725rem', color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Authorised Signatory
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '0.65rem', textAlign: 'center', fontSize: '0.725rem', fontWeight: 700, color: '#09090b' }}>
                <span>Phone: <strong>{settings.phone}</strong></span>
                <span style={{ margin: '0 0.6rem' }}>|</span>
                <span>Email: <strong>{settings.email}</strong></span>
                <span style={{ margin: '0 0.6rem' }}>|</span>
                <span>Website: <strong>www.highphaus.com</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Sub-Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Record Payment
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Select payment channel used by <strong>{invoice.clientCompany}</strong> for invoice {invoice.invoiceNumber}.
            </p>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="form-select"
              >
                <option value="UPI / QR Payment">UPI / QR Payment</option>
                <option value="Bank Wire Transfer">Bank Wire Transfer (NEFT/IMPS)</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
                <option value="Corporate Cheque">Corporate Cheque</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  onMarkPaid(invoice.id, selectedMethod);
                  setShowPaymentModal(false);
                }}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <CheckCircle size={16} />
                <span>Confirm Paid</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
