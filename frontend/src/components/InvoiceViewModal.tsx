import React, { useRef, useState } from 'react';
import type { Invoice, BusinessSettings } from '../types/invoice';
import { getCurrencySymbol, numberToWordsINR } from '../services/storageService';
import {
  X,
  Printer,
  Download,
  CheckCircle,
  CreditCard,
  Maximize2,
  Minimize2,
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
  const [isFullScreen, setIsFullScreen] = useState(true);
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
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 5000,
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      window.scrollTo(0, originalScrollTop);

      const pdfWidth = 210; // A4 width mm
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // If fits in a single page (up to ~315mm), use exact height so the PDF document
      // fits the viewer cleanly without an awkward blank page bottom or paper-in-paper look!
      const isSinglePage = imgHeight <= 315;
      const pdf = new jsPDF('p', 'mm', isSinglePage ? [pdfWidth, imgHeight] : 'a4');

      if (isSinglePage) {
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, imgHeight, '', 'FAST');
      } else {
        const pageHeight = 297;
        const totalPages = Math.ceil(imgHeight / pageHeight);

        for (let page = 1; page <= totalPages; page++) {
          if (page > 1) {
            pdf.addPage();
            // Continuation Header Bar
            pdf.setFillColor(9, 9, 11);
            pdf.rect(0, 0, 210, 10, 'F');
            pdf.setFontSize(8);
            pdf.setTextColor(255, 255, 255);
            pdf.text(
              `${(settings.companyName || 'INVOICE').toUpperCase()} — INVOICE ${invoice.invoiceNumber} (Continued)`,
              105,
              6.5,
              { align: 'center' }
            );
          }

          const position = -(page - 1) * pageHeight + (page > 1 ? 8 : 0);
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
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const formatAmount = (num: number) => {
    return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const companyName = invoice.companyName !== undefined ? invoice.companyName : settings.companyName;
  const companyTagline = invoice.companyTagline !== undefined ? invoice.companyTagline : settings.tagline;
  const companyAddress = invoice.companyAddress !== undefined ? invoice.companyAddress : settings.address;
  const companyPincode = invoice.companyPincode !== undefined ? invoice.companyPincode : settings.pincode;
  const companyTaxId = invoice.companyTaxId !== undefined ? invoice.companyTaxId : settings.taxId;
  const showCompanyLogo = invoice.showCompanyLogo !== undefined ? invoice.showCompanyLogo : (settings.showLogo !== false);
  const companyLogoUrl = invoice.companyLogoUrl || settings.logoUrl;

  const bankName = invoice.bankName !== undefined ? invoice.bankName : settings.bankName;
  const accountName = invoice.accountName !== undefined ? invoice.accountName : (settings.accountName || companyName);
  const accountNumber = invoice.accountNumber !== undefined ? invoice.accountNumber : settings.accountNumber;
  const ifscSwift = invoice.ifscSwift !== undefined ? invoice.ifscSwift : settings.ifscSwift;
  const upiId = invoice.upiId !== undefined ? invoice.upiId : settings.upiId;

  const contactPhone = invoice.contactPhone !== undefined ? invoice.contactPhone : settings.phone;
  const contactEmail = invoice.contactEmail !== undefined ? invoice.contactEmail : settings.email;
  const contactWebsite = invoice.contactWebsite !== undefined ? invoice.contactWebsite : settings.website;
  const signatoryTitle = invoice.signatoryTitle !== undefined ? invoice.signatoryTitle : 'Authorised Signatory';

  const halfTax = invoice.taxTotal / 2;
  const halfTaxRate = (settings.defaultTaxRate || 18) / 2;
  const companyGstinClean = formatGstin(companyTaxId);
  const clientGstinClean = formatGstin(invoice.clientTaxId);

  const hasBankInfo = Boolean(
    (bankName && bankName.trim()) ||
    (accountNumber && accountNumber.trim()) ||
    (ifscSwift && ifscSwift.trim()) ||
    (upiId && upiId.trim())
  );
  const footerContact = [
    contactPhone?.trim() && `Phone: ${contactPhone.trim()}`,
    contactEmail?.trim() && `Email: ${contactEmail.trim()}`,
    contactWebsite?.trim() && `Website: ${contactWebsite.trim()}`,
  ].filter(Boolean) as string[];
  const hasSignatory = Boolean(signatoryTitle && signatoryTitle.trim());
  const hasFooterContact = footerContact.length > 0;

  return (
    <div
      className="modal-overlay"
      style={{
        padding: isFullScreen ? 0 : '1rem',
        alignItems: isFullScreen ? 'stretch' : 'center',
        justifyContent: isFullScreen ? 'stretch' : 'center',
      }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: isFullScreen ? '100vw' : '880px',
          width: isFullScreen ? '100vw' : '100%',
          height: isFullScreen ? '100vh' : 'auto',
          maxHeight: isFullScreen ? '100vh' : '92vh',
          borderRadius: isFullScreen ? 0 : 'var(--radius-lg)',
          border: isFullScreen ? 'none' : '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
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
            zIndex: 10,
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

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="btn btn-secondary btn-sm"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span className="btn-label-text">{isFullScreen ? 'Standard' : 'Full Screen'}</span>
            </button>

            <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.5rem' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Premium Modern Highphaus Invoice Document Container */}
        <div
          style={{
            flex: 1,
            background: isFullScreen ? '#18181b' : '#f4f4f5',
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            padding: isFullScreen ? '2rem 1rem' : '1.5rem 1rem',
          }}
        >
          <div
            ref={invoiceRef}
            className="printable-invoice"
            style={{
              background: '#ffffff',
              color: '#09090b',
              padding: '2.5rem',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              width: '100%',
              maxWidth: '820px',
              minHeight: isFullScreen ? '1120px' : 'auto',
              boxShadow: isFullScreen ? '0 15px 35px rgba(0, 0, 0, 0.45)' : '0 4px 15px rgba(0,0,0,0.08)',
              borderRadius: isFullScreen ? '3px' : '0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Header: Logo, Company Name, Tagline & Company Address */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {showCompanyLogo && (companyLogoUrl || companyName) && (
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e4e4e7', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={companyLogoUrl || "/favicon.png"} alt={companyName || "Logo"} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                  {(companyName || companyTagline) && (
                    <div>
                      {companyName && (
                        <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#09090b', letterSpacing: '-0.02em', margin: 0, textTransform: 'uppercase' }}>
                          {companyName}
                        </h1>
                      )}
                      {companyTagline && (
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {companyTagline}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Company Registered Office Address & GSTIN */}
                {(companyAddress?.trim() || companyGstinClean?.trim()) && (
                  <div style={{ marginTop: '0.45rem', fontSize: '0.75rem', color: '#3f3f46', lineHeight: 1.35, maxWidth: '340px' }}>
                    {companyAddress?.trim() && <div style={{ fontWeight: 600 }}>{companyAddress.trim()}{companyPincode?.trim() ? ` - ${companyPincode.trim()}` : ''}</div>}
                    {companyGstinClean?.trim() && (
                      <div style={{ marginTop: '0.15rem' }}>
                        GSTIN: <strong>{companyGstinClean.trim()}</strong>
                      </div>
                    )}
                  </div>
                )}
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
                {(() => {
                  const cCompany = invoice.clientCompany?.trim();
                  const cName = invoice.clientName?.trim();
                  const cAddress = invoice.clientAddress?.trim();
                  const cPincode = invoice.clientPincode?.trim();
                  const cEmail = invoice.clientEmail?.trim();
                  const cPhone = invoice.clientPhone?.trim();
                  const cGstin = clientGstinClean?.trim();

                  const hasClient = Boolean(cCompany || cName || cAddress || cEmail || cPhone || cGstin);
                  if (!hasClient) return null;

                  return (
                    <>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                        INVOICE TO:
                      </div>
                      {(cCompany || cName) && (
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#09090b' }}>
                          {cCompany || cName}
                        </div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: '#3f3f46', marginTop: '0.2rem', lineHeight: 1.35 }}>
                        {cName && cCompany && cName !== cCompany && <div style={{ fontWeight: 600 }}>{cName}</div>}
                        {cAddress && <div>{cAddress}{cPincode ? ` - ${cPincode}` : ''}</div>}
                        {cEmail && <div>Email: {cEmail}</div>}
                        {cPhone && <div>Phone: {cPhone}</div>}
                        {cGstin && <div>GSTIN: {cGstin}</div>}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', gap: '0.35rem', fontSize: '0.825rem' }}>
                {invoice.invoiceNumber?.trim() && (
                  <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'space-between', width: '100%', maxWidth: '220px' }}>
                    <span style={{ fontWeight: 800, color: '#09090b' }}>Invoice#</span>
                    <span className="font-mono" style={{ fontWeight: 800, color: '#09090b' }}>{invoice.invoiceNumber.trim()}</span>
                  </div>
                )}
                {invoice.issueDate?.trim() && (
                  <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'space-between', width: '100%', maxWidth: '220px' }}>
                    <span style={{ fontWeight: 800, color: '#09090b' }}>Date</span>
                    <span>{invoice.issueDate.trim()}</span>
                  </div>
                )}
                {invoice.dueDate?.trim() && (
                  <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'space-between', width: '100%', maxWidth: '220px' }}>
                    <span style={{ fontWeight: 800, color: '#09090b' }}>Due Date</span>
                    <span>{invoice.dueDate.trim()}</span>
                  </div>
                )}
                {(() => {
                  const cleanTerms = invoice.terms?.trim();
                  const hasDays = invoice.paymentTermsDays !== undefined && invoice.paymentTermsDays !== null;
                  if (!cleanTerms && !hasDays) return null;

                  const displayText = hasDays ? `Within ${invoice.paymentTermsDays} days` : cleanTerms;
                  if (!displayText || !displayText.trim()) return null;

                  return (
                    <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'space-between', width: '100%', maxWidth: '220px' }}>
                      <span style={{ fontWeight: 800, color: '#09090b' }}>Payment Terms</span>
                      <span>{displayText}</span>
                    </div>
                  );
                })()}
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
            <div style={{ display: 'grid', gridTemplateColumns: hasBankInfo ? '1.1fr 0.9fr' : '1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
              {hasBankInfo && (
                <div style={{ fontSize: '0.775rem', color: '#3f3f46', lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 800, color: '#09090b', marginBottom: '0.35rem', fontSize: '0.825rem' }}>
                    Payment Details
                  </div>
                  {(accountName?.trim() || companyName?.trim()) && <div>Account Name: <strong>{accountName?.trim() || companyName?.trim()}</strong></div>}
                  {bankName?.trim() && <div>Bank: <strong>{bankName.trim()}</strong></div>}
                  {accountNumber?.trim() && <div>Account #: <span className="font-mono"><strong>{accountNumber.trim()}</strong></span></div>}
                  {ifscSwift?.trim() && <div>IFSC: <span className="font-mono"><strong>{ifscSwift.trim()}</strong></span></div>}
                  {upiId?.trim() && <div>UPI ID: <span className="font-mono"><strong>{upiId.trim()}</strong></span></div>}
                </div>
              )}

              {/* Totals Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.825rem', marginLeft: hasBankInfo ? undefined : 'auto', minWidth: '240px' }}>
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
          </div>

          {/* Bottom Footer Section: Authorised Signatory Above, Contact Line Under It */}
          {(hasSignatory || hasFooterContact) && (
            <div style={{ borderTop: '2px solid #09090b', paddingTop: '0.85rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {hasSignatory && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'center', minWidth: '170px' }}>
                    <div style={{ borderBottom: '1.5px solid #09090b', marginBottom: '0.25rem', width: '100%', height: '26px' }} />
                    <div style={{ fontWeight: 800, fontSize: '0.725rem', color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {signatoryTitle}
                    </div>
                  </div>
                </div>
              )}

              {hasFooterContact && (
                <div style={{ 
                  borderTop: hasSignatory ? '1px solid #e4e4e7' : 'none', 
                  paddingTop: hasSignatory ? '0.65rem' : '0', 
                  textAlign: 'center', 
                  fontSize: '0.725rem', 
                  fontWeight: 700, 
                  color: '#09090b' 
                }}>
                  {footerContact.map((item, idx) => (
                    <React.Fragment key={idx}>
                      <span>{item}</span>
                      {idx < footerContact.length - 1 && <span style={{ margin: '0 0.6rem' }}>|</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}
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
