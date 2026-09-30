import React, { useRef, useState } from 'react';
import type { Invoice, BusinessSettings, Payment, Category } from '../types/invoice';
import { getCurrencySymbol, numberToWordsINR } from '../services/storageService';
import { deriveInvoiceFinancials } from '../services/calculationEngine';
import {
  X,
  Printer,
  Download,
  CreditCard,
  Maximize2,
  Minimize2,
  CheckCircle,
  Receipt,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceViewModalProps {
  invoice: Invoice;
  settings: BusinessSettings;
  payments?: Payment[];
  categories?: Category[];
  onClose: () => void;
  onMarkPaid?: (invoiceId: string, method?: string) => void;
  onOpenRecordPayment?: (invoice: Invoice) => void;
  onDeletePayment?: (paymentId: string) => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  invoice,
  settings,
  payments = [],
  categories = [],
  onClose,
  onMarkPaid,
  onOpenRecordPayment,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('UPI / Bank Transfer');

  // Look up primary category if not directly attached
  const primaryCategoryName =
    invoice.categoryName ||
    (invoice.categoryId ? categories.find((c) => c.id === invoice.categoryId)?.name : undefined);

  // Authoritative financial derivation from payments ledger
  const financials = deriveInvoiceFinancials(invoice, payments);
  const { paidAmount, balanceDue, status: currentStatus, matchingPayments } = financials;

  const effectivePaid =
    paidAmount > 0
      ? paidAmount
      : (Number(invoice.advancePaymentAmount) || Number(invoice.paidAmount) || 0);

  const effectiveBalance =
    balanceDue !== undefined && paidAmount > 0
      ? balanceDue
      : (invoice.balanceDue !== undefined
          ? invoice.balanceDue
          : Math.max(0, Number((invoice.total - effectivePaid).toFixed(2))));

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
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 5000,
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
            }
          `;
          clonedDoc.head.appendChild(style);
          const clonedElement = clonedDoc.querySelector('.printable-invoice') as HTMLElement;
          if (clonedElement) {
            clonedElement.style.width = '760px';
            clonedElement.style.maxWidth = '760px';
            clonedElement.style.padding = '1.75rem';
            clonedElement.style.boxSizing = 'border-box';
            clonedElement.style.boxShadow = 'none';
          }
        },
      });

      window.scrollTo(0, originalScrollTop);

      const pdfWidth = 210; // A4 width mm
      const pdfPageHeight = 297; // A4 height mm
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');

      if (imgHeight <= pdfPageHeight) {
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, imgHeight, '', 'FAST');
      } else {
        const totalPages = Math.ceil(imgHeight / pdfPageHeight);
        for (let page = 1; page <= totalPages; page++) {
          if (page > 1) {
            pdf.addPage();
          }
          const position = -(page - 1) * pdfPageHeight;
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, pdfWidth, imgHeight, '', 'FAST');
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

  const contactPhone = (invoice.contactPhone && invoice.contactPhone.trim()) || settings.phone?.trim() || '';
  const contactEmail = (invoice.contactEmail && invoice.contactEmail.trim()) || settings.email?.trim() || '';
  const contactWebsite = (invoice.contactWebsite && invoice.contactWebsite.trim()) || settings.website?.trim() || '';
  const signatoryTitle = (invoice.signatoryTitle && invoice.signatoryTitle.trim()) || 'Authorised Signatory';

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
    contactPhone && `Phone: ${contactPhone}`,
    contactEmail && `Email: ${contactEmail}`,
    contactWebsite && `Website: ${contactWebsite}`,
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
            <span className={`badge badge-${currentStatus}`} style={{ textTransform: 'capitalize' }}>
              {currentStatus.replace('_', ' ')}
            </span>
            <span className="font-mono" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
              {invoice.invoiceNumber}
            </span>
            {primaryCategoryName && (
              <span style={{ fontSize: '0.725rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {primaryCategoryName}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {balanceDue > 0 && (
              <button
                onClick={() => {
                  if (onOpenRecordPayment) {
                    onOpenRecordPayment({ ...invoice, paidAmount, balanceDue, status: currentStatus });
                  } else {
                    setShowPaymentModal(true);
                  }
                }}
                className="btn btn-primary btn-sm"
              >
                <CreditCard size={15} />
                <span className="btn-label-text">
                  Record Payment ({currencySymbol}{balanceDue.toLocaleString('en-IN')})
                </span>
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
              padding: '1.75rem',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              width: '100%',
              maxWidth: '760px',
              boxShadow: isFullScreen ? '0 15px 35px rgba(0, 0, 0, 0.45)' : '0 12px 36px rgba(0, 0, 0, 0.15)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Header: Logo, Company Name, Tagline & Company Address */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {showCompanyLogo && (companyLogoUrl || companyName) && (
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e4e4e7', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={companyLogoUrl || "/favicon.png"} alt={companyName || "Logo"} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    )}
                    {(companyName || companyTagline) && (
                      <div>
                        {companyName && (
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#09090b', letterSpacing: '-0.02em', margin: 0, textTransform: 'uppercase' }}>
                            {companyName}
                          </h3>
                        )}
                        {companyTagline && (
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {companyTagline}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Company Registered Office Address & GSTIN */}
                  {(companyAddress?.trim() || companyGstinClean?.trim()) && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.725rem', color: '#3f3f46', lineHeight: 1.35, maxWidth: '300px' }}>
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
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#09090b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>
                    INVOICE
                  </h2>
                  {effectivePaid > 0 && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '0.35rem',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      background: effectiveBalance <= 0 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                      color: effectiveBalance <= 0 ? '#15803d' : '#b45309',
                      border: effectiveBalance <= 0 ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid rgba(217, 119, 6, 0.3)',
                    }}>
                      {effectiveBalance <= 0 ? 'Paid in Full' : 'Advance Received'}
                    </span>
                  )}
                </div>
              </div>

              {/* Accent Line */}
              <div style={{ height: '3.5px', background: '#09090b', width: '100%', marginTop: '0.75rem', marginBottom: '1.25rem' }} />

              {/* Billed To & Document Meta Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', marginBottom: '1.25rem' }}>
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
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                          INVOICE TO:
                        </div>
                        {(cCompany || cName) && (
                          <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#09090b' }}>
                            {cCompany || cName}
                          </div>
                        )}
                        <div style={{ fontSize: '0.775rem', color: '#3f3f46', marginTop: '0.15rem', lineHeight: 1.35 }}>
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

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', gap: '0.3rem', fontSize: '0.775rem' }}>
                  {invoice.invoiceNumber?.trim() && (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                      <span style={{ fontWeight: 800, color: '#09090b' }}>Invoice#</span>
                      <span className="font-mono" style={{ fontWeight: 800, color: '#09090b' }}>{invoice.invoiceNumber.trim()}</span>
                    </div>
                  )}
                  {invoice.issueDate?.trim() && (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                      <span style={{ fontWeight: 800, color: '#09090b' }}>Date</span>
                      <span>{invoice.issueDate.trim()}</span>
                    </div>
                  )}
                  {invoice.dueDate?.trim() && (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                      <span style={{ fontWeight: 800, color: '#09090b' }}>Due Date</span>
                      <span>{invoice.dueDate.trim()}</span>
                    </div>
                  )}
                  {effectivePaid > 0 && (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                      <span style={{ fontWeight: 800, color: '#09090b' }}>Status</span>
                      <span style={{
                        fontWeight: 800,
                        color: effectiveBalance <= 0 ? '#16a34a' : '#d97706',
                        textTransform: 'uppercase',
                        fontSize: '0.725rem',
                      }}>
                        {effectiveBalance <= 0 ? 'Fully Paid' : 'Advance Paid'}
                      </span>
                    </div>
                  )}
                  {(() => {
                    const cleanTerms = invoice.terms?.trim();
                    const hasDays = invoice.paymentTermsDays !== undefined && invoice.paymentTermsDays !== null;
                    const displayTerms = cleanTerms || (hasDays ? `Within ${invoice.paymentTermsDays} days` : '');
                    if (!displayTerms) return null;

                    return (
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                        <span style={{ fontWeight: 800, color: '#09090b' }}>Payment Terms</span>
                        <span>{displayTerms}</span>
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
                  {invoice.items.map((item, index) => (
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
              <div style={{ display: 'grid', gridTemplateColumns: hasBankInfo ? '1.1fr 0.9fr' : '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                {hasBankInfo && (
                  <div style={{ fontSize: '0.725rem', color: '#3f3f46', lineHeight: 1.45 }}>
                    <div style={{ fontWeight: 800, color: '#09090b', marginBottom: '0.35rem', fontSize: '0.775rem' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.775rem', marginLeft: hasBankInfo ? undefined : 'auto', minWidth: '220px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.15rem 0.25rem' }}>
                    <span style={{ fontWeight: 700 }}>Sub Total:</span>
                    <span style={{ fontWeight: 800, color: '#09090b' }}>{formatAmount(invoice.subtotal)}</span>
                  </div>

                  {invoice.discountTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.15rem 0.25rem' }}>
                      <span style={{ fontWeight: 700 }}>Discount ({invoice.discountRate}%):</span>
                      <span>-{formatAmount(invoice.discountTotal)}</span>
                    </div>
                  )}

                  {invoice.taxTotal > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.15rem 0.25rem' }}>
                        <span style={{ fontWeight: 700 }}>CGST ({halfTaxRate}%):</span>
                        <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(halfTax)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.15rem 0.25rem' }}>
                        <span style={{ fontWeight: 700 }}>SGST ({halfTaxRate}%):</span>
                        <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(halfTax)}</span>
                      </div>
                    </>
                  )}

                  {invoice.shippingFee !== undefined && invoice.shippingFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', padding: '0.15rem 0.25rem' }}>
                      <span style={{ fontWeight: 700 }}>Shipping & Handling:</span>
                      <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(invoice.shippingFee)}</span>
                    </div>
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
                    <span style={{ fontSize: '1.05rem', fontWeight: 900 }}>{formatAmount(invoice.total)}</span>
                  </div>

                  {/* Advance / Total Paid Breakdown */}
                  {effectivePaid > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', padding: '0.2rem 0.25rem', fontWeight: 700, fontSize: '0.775rem' }}>
                        <span>Advance Paid:</span>
                        <span>-{formatAmount(effectivePaid)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#fef3c7', color: '#92400e', padding: '0.35rem 0.5rem', borderRadius: '4px', fontWeight: 800, fontSize: '0.825rem', border: '1px solid #fde68a' }}>
                        <span>Balance Due:</span>
                        <span>{formatAmount(effectiveBalance)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Amount in Words Block */}
              <div style={{ background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  Amount in Words:
                </span>
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>
                  {numberToWordsINR(invoice.total)}
                </span>
              </div>

              {/* Payment History & Advance Settlements */}
              {matchingPayments && matchingPayments.length > 0 && (
                <div style={{ marginBottom: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '0.45rem 0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#09090b' }}>
                      <Receipt size={13} />
                      <span>Payment History & Advance Settlements</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d' }}>
                      {matchingPayments.length} Record{matchingPayments.length > 1 ? 's' : ''} • Total Paid: {formatAmount(effectivePaid)}
                    </span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.725rem' }}>
                    <thead>
                      <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                        <th style={{ padding: '0.35rem 0.65rem', fontWeight: 700 }}>Date</th>
                        <th style={{ padding: '0.35rem 0.65rem', fontWeight: 700 }}>Method</th>
                        <th style={{ padding: '0.35rem 0.65rem', fontWeight: 700 }}>Reference / Notes</th>
                        <th style={{ padding: '0.35rem 0.65rem', fontWeight: 700, textAlign: 'right' }}>Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchingPayments.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.4rem 0.65rem', fontWeight: 600, color: '#09090b' }}>
                            {p.paymentDate}
                          </td>
                          <td style={{ padding: '0.4rem 0.65rem' }}>
                            <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '3px', fontWeight: 700, fontSize: '0.675rem', color: '#334155' }}>
                              {p.paymentMethod}
                            </span>
                            {p.isAdvance && (
                              <span style={{ marginLeft: '4px', background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '3px', fontWeight: 800, fontSize: '0.625rem' }}>
                                ADVANCE
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.4rem 0.65rem', color: '#475569' }}>
                            {p.referenceNumber && <span className="font-mono" style={{ fontWeight: 600 }}>{p.referenceNumber} </span>}
                            {p.notes && <span style={{ color: '#64748b' }}>({p.notes})</span>}
                            {!p.referenceNumber && !p.notes && 'Advance deposit upon invoice issuance'}
                          </td>
                          <td style={{ padding: '0.4rem 0.65rem', textAlign: 'right', fontWeight: 800, color: '#15803d' }}>
                            +{formatAmount(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Footer Section: Authorised Signatory Above, Contact Line Under It */}
            {(hasSignatory || hasFooterContact) && (
              <div style={{ borderTop: '2px solid #09090b', paddingTop: '0.65rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {hasSignatory && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'center', minWidth: '150px' }}>
                      <div style={{ borderBottom: '1.5px solid #09090b', marginBottom: '0.25rem', width: '100%', height: '22px' }} />
                      <div style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, fontSize: '0.7rem', color: '#09090b' }}>
                        {signatoryTitle}
                      </div>
                    </div>
                  </div>
                )}

                {hasFooterContact && (
                  <div style={{ 
                    borderTop: hasSignatory ? '1px solid #e4e4e7' : 'none', 
                    paddingTop: hasSignatory ? '0.5rem' : '0', 
                    textAlign: 'center', 
                    fontSize: '0.725rem', 
                    fontWeight: 700, 
                    color: '#09090b' 
                  }}>
                    {footerContact.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <span>{item}</span>
                        {idx < footerContact.length - 1 && <span style={{ margin: '0 0.6rem', color: '#a1a1aa' }}>|</span>}
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
                  onMarkPaid?.(invoice.id, selectedMethod);
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
