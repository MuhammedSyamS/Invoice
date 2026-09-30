import React, { useRef, useState } from 'react';
import type { Bill, BusinessSettings } from '../types/invoice';
import { getCurrencySymbol, numberToWordsINR } from '../services/storageService';
import {
  X,
  Printer,
  Download,
  CreditCard,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface BillViewModalProps {
  bill: Bill;
  settings: BusinessSettings;
  onClose: () => void;
  onRecordPayment?: (bill: Bill) => void;
}

export const BillViewModal: React.FC<BillViewModalProps> = ({
  bill,
  settings,
  onClose,
  onRecordPayment,
}) => {
  const billRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const currencySymbol = getCurrencySymbol(bill.currency);

  const formatAmount = (num: number) => {
    return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!billRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const element = billRef.current;
      const originalScrollTop = window.scrollY;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      window.scrollTo(0, originalScrollTop);

      const pdfWidth = 210;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const isSinglePage = imgHeight <= 315;
      const pdf = new jsPDF('p', 'mm', isSinglePage ? [pdfWidth, imgHeight] : 'a4');

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, imgHeight, '', 'FAST');
      pdf.save(`${bill.billNumber}.pdf`);
    } catch (err) {
      console.error('Error generating Bill PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const companyName = bill.companyName || settings.companyName;
  const companyAddress = bill.companyAddress || settings.address;
  const companyTaxId = bill.companyTaxId || settings.taxId;
  const companyPhone = bill.companyPhone || settings.phone;
  const companyEmail = bill.companyEmail || settings.email;

  return (
    <div
      className="modal-overlay"
      style={{
        padding: isFullScreen ? 0 : '1rem',
        alignItems: isFullScreen ? 'stretch' : 'center',
      }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: isFullScreen ? '100vw' : '820px',
          width: isFullScreen ? '100vw' : '100%',
          height: isFullScreen ? '100vh' : 'auto',
          maxHeight: isFullScreen ? '100vh' : '90vh',
          borderRadius: isFullScreen ? 0 : 'var(--radius-lg)',
        }}
      >
        {/* Toolbar */}
        <div
          className="no-print"
          style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-card-light)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className={`badge badge-${bill.paymentStatus}`}>
              {bill.paymentStatus.replace('_', ' ')}
            </span>
            <span className="font-mono" style={{ fontWeight: 700 }}>
              {bill.billNumber}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
            {bill.balanceDue > 0 && onRecordPayment && (
              <button onClick={() => onRecordPayment(bill)} className="btn btn-primary btn-sm">
                <CreditCard size={14} />
                <span className="btn-label-text">Record Payment</span>
              </button>
            )}
            <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span className="btn-label-text">{isGeneratingPdf ? 'Exporting...' : 'PDF'}</span>
            </button>
            <button onClick={handlePrint} className="btn btn-secondary btn-sm">
              <Printer size={14} />
              <span className="btn-label-text">Print</span>
            </button>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="btn btn-secondary btn-sm"
            >
              {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Bill Document */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: isFullScreen ? 'var(--bg-main)' : 'var(--bg-card-light)',
            padding: '1.5rem',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            ref={billRef}
            className="printable-bill"
            style={{
              background: '#ffffff',
              color: '#09090b',
              padding: '2.5rem',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              width: '100%',
              maxWidth: '750px',
              borderRadius: '4px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              boxSizing: 'border-box',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #09090b', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
                  {companyName}
                </h1>
                <div style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '0.25rem', lineHeight: 1.4 }}>
                  {companyAddress && <div>{companyAddress}{settings.pincode ? ` - ${settings.pincode}` : ''}</div>}
                  {companyPhone && <div>Phone: {companyPhone}</div>}
                  {companyEmail && <div>Email: {companyEmail}</div>}
                  {companyTaxId && (
                    <div style={{ fontWeight: 700, color: '#09090b', marginTop: '0.15rem' }}>
                      GSTIN: {companyTaxId}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#09090b', margin: 0 }}>
                  TAX INVOICE / BILL
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#52525b', marginTop: '0.35rem' }}>
                  <div>Bill #: <strong style={{ color: '#09090b' }}>{bill.billNumber}</strong></div>
                  <div>Date: <strong>{bill.billDate}</strong></div>
                  <div>Payment Mode: <strong>{bill.paymentMethod}</strong></div>
                </div>
              </div>
            </div>

            {/* Customer Billed To */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CUSTOMER DETAILS
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b', marginTop: '0.15rem' }}>
                  {bill.customerCompany || bill.customerName}
                </div>
                {bill.customerCompany && bill.customerName && bill.customerName !== bill.customerCompany && (
                  <div style={{ color: '#52525b', fontWeight: 600 }}>Attn: {bill.customerName}</div>
                )}
                {bill.customerAddress && <div style={{ color: '#52525b' }}>{bill.customerAddress}</div>}
                {bill.customerPhone && <div style={{ color: '#52525b' }}>Phone: {bill.customerPhone}</div>}
                {bill.customerGstin && (
                  <div style={{ fontWeight: 700, color: '#09090b', marginTop: '0.2rem' }}>
                    GSTIN: {bill.customerGstin}
                  </div>
                )}
              </div>

              <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Status:</span>
                  <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>
                    {bill.paymentStatus.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Paid via:</span>
                  <span style={{ fontWeight: 700 }}>{bill.paymentMethod}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Amount Settled:</span>
                  <span style={{ fontWeight: 800, color: '#16a34a' }}>{formatAmount(bill.paidAmount)}</span>
                </div>
                {bill.balanceDue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '0.25rem' }}>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>Balance Due:</span>
                    <span style={{ fontWeight: 800, color: '#dc2626' }}>{formatAmount(bill.balanceDue)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#09090b', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0.65rem', width: '35px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '0.5rem 0.65rem' }}>Item Description</th>
                  <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>HSN</th>
                  <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right' }}>Rate</th>
                  <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>GST %</th>
                  <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '0.55rem 0.65rem', textAlign: 'center', color: '#71717a' }}>{index + 1}</td>
                    <td style={{ padding: '0.55rem 0.65rem', fontWeight: 600 }}>{item.description}</td>
                    <td style={{ padding: '0.55rem 0.65rem', textAlign: 'center', fontFamily: 'monospace' }}>{item.hsnSac || '-'}</td>
                    <td style={{ padding: '0.55rem 0.65rem', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '0.55rem 0.65rem', textAlign: 'right' }}>{formatAmount(item.unitPrice)}</td>
                    <td style={{ padding: '0.55rem 0.65rem', textAlign: 'center' }}>{item.taxRate}%</td>
                    <td style={{ padding: '0.55rem 0.65rem', textAlign: 'right', fontWeight: 700 }}>
                      {formatAmount(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Breakdown & Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#71717a', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  TERMS & BILL NOTES
                </div>
                <div style={{ fontSize: '0.75rem', color: '#52525b', lineHeight: 1.45 }}>
                  {bill.notes || settings.billNotesFooter || 'Goods/Services received in good order. Computer generated sales invoice.'}
                </div>

                <div style={{ marginTop: '0.85rem', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.675rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    AMOUNT IN WORDS
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#09090b', marginTop: '0.1rem' }}>
                    {numberToWordsINR(bill.total)}
                  </div>
                </div>
              </div>

              {/* Totals Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                  <span>Sub Total:</span>
                  <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(bill.subtotal)}</span>
                </div>

                {bill.discountTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Discount ({bill.discountRate}%):</span>
                    <span>-{formatAmount(bill.discountTotal)}</span>
                  </div>
                )}

                {bill.taxTotal > 0 && (
                  bill.isInterState ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                      <span>IGST Total:</span>
                      <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(bill.taxTotal)}</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                        <span>CGST:</span>
                        <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(bill.cgst || bill.taxTotal / 2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                        <span>SGST:</span>
                        <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(bill.sgst || bill.taxTotal / 2)}</span>
                      </div>
                    </>
                  )
                )}

                {bill.roundOff !== undefined && bill.roundOff !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a' }}>
                    <span>Round-off:</span>
                    <span>{bill.roundOff > 0 ? `+${bill.roundOff}` : bill.roundOff}</span>
                  </div>
                )}

                {/* Grand Total */}
                <div
                  style={{
                    background: '#09090b',
                    color: '#ffffff',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.25rem',
                  }}
                >
                  <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Bill Total:
                  </span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900 }}>
                    {formatAmount(bill.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Signatory */}
            {(() => {
              const sig = bill.signatoryTitle !== undefined ? bill.signatoryTitle : 'Authorised Signatory';
              const hasSig = Boolean(sig && sig.trim());
              return (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.75rem', color: '#71717a' }}>
                  <div>
                    <div>Thank you for your business!</div>
                    <div>{settings.website}</div>
                  </div>
                  {hasSig && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ borderBottom: '1px solid #09090b', width: '150px', marginBottom: '0.25rem' }} />
                      <div style={{ fontWeight: 700, color: '#09090b', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        {sig}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
