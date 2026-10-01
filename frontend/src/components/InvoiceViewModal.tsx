import React, { useRef, useState } from 'react';
import type { Invoice, BusinessSettings, Payment, Category } from '../types/invoice';
import { getCurrencySymbol, numberToWordsINR } from '../services/storageService';
import { deriveInvoiceFinancials } from '../services/calculationEngine';
import { getPdfTheme } from '../services/pdfThemeService';
import {
  X,
  Printer,
  Download,
  CreditCard,
  Maximize2,
  Minimize2,
  CheckCircle,
  Receipt,
  SlidersHorizontal,
  Eye,
  EyeOff,
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

  // PDF Optional Field Choices & Visibility Toggles
  const [showDueDate, setShowDueDate] = useState<boolean>(invoice.showDueDate !== false);
  const [showPaymentTerms, setShowPaymentTerms] = useState<boolean>(invoice.showPaymentTerms !== false);
  const [showClientAddress, setShowClientAddress] = useState<boolean>(invoice.showClientAddress !== false);
  const [showClientEmail, setShowClientEmail] = useState<boolean>(invoice.showClientEmail !== false);
  const [showClientPhone, setShowClientPhone] = useState<boolean>(invoice.showClientPhone !== false);
  const [showClientTaxId, setShowClientTaxId] = useState<boolean>(invoice.showClientTaxId !== false);
  const [showCompanyTagline, setShowCompanyTagline] = useState<boolean>(invoice.showCompanyTagline !== false);
  const [showCompanyAddress, setShowCompanyAddress] = useState<boolean>(invoice.showCompanyAddress !== false);
  const [showCompanyTaxId, setShowCompanyTaxId] = useState<boolean>(invoice.showCompanyTaxId !== false);
  const [showBankDetails, setShowBankDetails] = useState<boolean>(invoice.showBankDetails !== false);
  const [showAmountInWords, setShowAmountInWords] = useState<boolean>(invoice.showAmountInWords !== false);
  const [showSignatory, setShowSignatory] = useState<boolean>(invoice.showSignatory !== false);
  const [showContactFooter, setShowContactFooter] = useState<boolean>(invoice.showContactFooter !== false);
  const [showPaymentHistory, setShowPaymentHistory] = useState<boolean>(invoice.showPaymentHistory !== false);
  const [showPdfOptionsDrawer, setShowPdfOptionsDrawer] = useState<boolean>(false);

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

      const targetHeight = Math.max(element.scrollHeight, element.offsetHeight, 1150);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 5000,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1280,
        windowHeight: targetHeight + 600,
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .footer-black-line {
              display: block !important;
              width: 100% !important;
              height: 1.5px !important;
              background-color: #09090b !important;
              margin-top: 0.85rem !important;
              margin-bottom: 0.65rem !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          `;
          clonedDoc.head.appendChild(style);

          const clonedElement = clonedDoc.querySelector('.printable-invoice') as HTMLElement;
          if (clonedElement) {
            clonedElement.style.width = '794px';
            clonedElement.style.maxWidth = '794px';
            clonedElement.style.minWidth = '794px';
            clonedElement.style.height = 'auto';
            clonedElement.style.minHeight = 'auto';
            clonedElement.style.maxHeight = 'none';
            clonedElement.style.overflow = 'visible';
            clonedElement.style.padding = '2rem';
            clonedElement.style.boxSizing = 'border-box';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.transform = 'none';

            // Unconstrain all parent containers up to the document root
            let parent: HTMLElement | null = clonedElement.parentElement;
            while (parent && parent !== clonedDoc.documentElement) {
              parent.style.height = 'auto';
              parent.style.minHeight = 'auto';
              parent.style.maxHeight = 'none';
              parent.style.overflow = 'visible';
              parent.style.position = 'static';
              parent = parent.parentElement;
            }

            if (clonedDoc.body) {
              clonedDoc.body.style.height = 'auto';
              clonedDoc.body.style.minHeight = 'auto';
              clonedDoc.body.style.maxHeight = 'none';
              clonedDoc.body.style.overflow = 'visible';
              clonedDoc.body.style.margin = '0';
              clonedDoc.body.style.padding = '0';
            }
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

  const pdfTheme = getPdfTheme(settings);

  const contactPhone = (invoice.contactPhone && invoice.contactPhone.trim()) || settings.phone?.trim() || '';
  const contactEmail = (invoice.contactEmail && invoice.contactEmail.trim()) || settings.email?.trim() || '';
  const contactWebsite = (invoice.contactWebsite && invoice.contactWebsite.trim()) || settings.website?.trim() || '';
  const signatoryTitle = (invoice.signatoryTitle && invoice.signatoryTitle.trim()) || pdfTheme.signatoryTitle || 'AUTHORISED SIGNATORY';

  const halfTax = invoice.taxTotal / 2;
  const halfTaxRate = (settings.defaultTaxRate || 18) / 2;
  const companyGstinClean = formatGstin(companyTaxId);
  const clientGstinClean = formatGstin(invoice.clientTaxId);

  const hasBankInfo = showBankDetails && Boolean(
    (bankName && bankName.trim()) ||
    (accountNumber && accountNumber.trim()) ||
    (ifscSwift && ifscSwift.trim()) ||
    (upiId && upiId.trim())
  );
  const footerContact = showContactFooter ? [
    contactPhone && `Phone: ${contactPhone}`,
    contactEmail && `Email: ${contactEmail}`,
    contactWebsite && `Website: ${contactWebsite}`,
  ].filter(Boolean) as string[] : [];
  const hasSignatory = showSignatory && pdfTheme.showSignatory && Boolean(signatoryTitle && signatoryTitle.trim());
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

            <button
              onClick={() => setShowPdfOptionsDrawer(!showPdfOptionsDrawer)}
              className="btn btn-secondary btn-sm"
              style={{
                color: showPdfOptionsDrawer ? 'var(--primary-color, #6366f1)' : undefined,
                borderColor: showPdfOptionsDrawer ? 'var(--primary-color, #6366f1)' : undefined,
              }}
              title="Customize optional fields visible on PDF"
            >
              <SlidersHorizontal size={15} />
              <span className="btn-label-text">PDF Options</span>
            </button>

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

        {/* PDF Field Visibility Drawer (Interactive Options) */}
        {showPdfOptionsDrawer && (
          <div
            className="no-print"
            style={{
              padding: '0.75rem 1.25rem',
              background: 'var(--bg-input)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                PDF Field Visibility Choices (Click to add or remove from view & PDF download):
              </span>
              <button
                type="button"
                onClick={() => setShowPdfOptionsDrawer(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '1px 6px', fontSize: '0.7rem', height: 'auto' }}
              >
                Close
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {[
                { label: 'Due Date', active: showDueDate, toggle: () => setShowDueDate(!showDueDate) },
                { label: 'Payment Terms', active: showPaymentTerms, toggle: () => setShowPaymentTerms(!showPaymentTerms) },
                { label: 'Client Phone', active: showClientPhone, toggle: () => setShowClientPhone(!showClientPhone) },
                { label: 'Client Email', active: showClientEmail, toggle: () => setShowClientEmail(!showClientEmail) },
                { label: 'Client Address', active: showClientAddress, toggle: () => setShowClientAddress(!showClientAddress) },
                { label: 'Client GSTIN', active: showClientTaxId, toggle: () => setShowClientTaxId(!showClientTaxId) },
                { label: 'Company Tagline', active: showCompanyTagline, toggle: () => setShowCompanyTagline(!showCompanyTagline) },
                { label: 'Company Address', active: showCompanyAddress, toggle: () => setShowCompanyAddress(!showCompanyAddress) },
                { label: 'Company GSTIN', active: showCompanyTaxId, toggle: () => setShowCompanyTaxId(!showCompanyTaxId) },
                { label: 'Bank Details', active: showBankDetails, toggle: () => setShowBankDetails(!showBankDetails) },
                { label: 'Amount in Words', active: showAmountInWords, toggle: () => setShowAmountInWords(!showAmountInWords) },
                { label: 'Signatory', active: showSignatory, toggle: () => setShowSignatory(!showSignatory) },
                { label: 'Contact Footer', active: showContactFooter, toggle: () => setShowContactFooter(!showContactFooter) },
                { label: 'Payment History Table', active: showPaymentHistory, toggle: () => setShowPaymentHistory(!showPaymentHistory) },
              ].map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={pill.toggle}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid',
                    transition: 'all 0.15s ease',
                    background: pill.active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                    borderColor: pill.active ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.25)',
                    color: pill.active ? '#10b981' : '#ef4444',
                  }}
                  title={pill.active ? `Shown on PDF (Click to remove)` : `Hidden from PDF (Click to add)`}
                >
                  {pill.active ? <Eye size={11} /> : <EyeOff size={11} />}
                  <span>{pill.label}</span>
                  <span style={{ fontSize: '0.65rem' }}>{pill.active ? '✓' : '✕'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
              fontFamily: pdfTheme.fontFamily,
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
                    {(companyName || (showCompanyTagline && companyTagline)) && (
                      <div>
                        {companyName && (
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#09090b', letterSpacing: '-0.02em', margin: 0, textTransform: 'uppercase' }}>
                            {companyName}
                          </h3>
                        )}
                        {showCompanyTagline && companyTagline && (
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {companyTagline}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Company Registered Office Address & GSTIN */}
                  {((showCompanyAddress && companyAddress?.trim()) || (showCompanyTaxId && companyGstinClean?.trim())) && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.725rem', color: '#3f3f46', lineHeight: 1.35, maxWidth: '300px' }}>
                      {showCompanyAddress && companyAddress?.trim() && <div style={{ fontWeight: 600 }}>{companyAddress.trim()}{companyPincode?.trim() ? ` - ${companyPincode.trim()}` : ''}</div>}
                      {showCompanyTaxId && companyGstinClean?.trim() && (
                        <div style={{ marginTop: '0.15rem' }}>
                          GSTIN: <strong>{companyGstinClean.trim()}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: pdfTheme.primaryColor, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>
                    INVOICE
                  </h2>
                </div>
              </div>

              {/* Accent Line */}
              <div style={{ height: '3.5px', background: pdfTheme.accentColor, width: '100%', marginTop: '0.75rem', marginBottom: '1.25rem' }} />

              {/* Billed To & Document Meta Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  {(() => {
                    const cCompany = invoice.clientCompany?.trim();
                    const cName = invoice.clientName?.trim();
                    const cAddress = showClientAddress ? invoice.clientAddress?.trim() : '';
                    const cPincode = showClientAddress ? invoice.clientPincode?.trim() : '';
                    const cEmail = showClientEmail ? invoice.clientEmail?.trim() : '';
                    const cPhone = showClientPhone ? invoice.clientPhone?.trim() : '';
                    const cGstin = showClientTaxId ? clientGstinClean?.trim() : '';

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
                          {cAddress && <div>{cAddress.replace(/^[\s,]+/, '')}{cPincode ? ` - ${cPincode}` : ''}</div>}
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
                  {showDueDate && invoice.dueDate?.trim() && (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                      <span style={{ fontWeight: 800, color: '#09090b' }}>Due Date</span>
                      <span>{invoice.dueDate.trim()}</span>
                    </div>
                  )}
                  {showPaymentTerms && (() => {
                    const cleanTerms = invoice.terms?.trim();
                    const hasDays = invoice.paymentTermsDays !== undefined && invoice.paymentTermsDays !== null;
                    let displayTerms = cleanTerms || (hasDays ? (invoice.paymentTermsDays === 0 ? 'Immediate / Due on receipt' : `Within ${invoice.paymentTermsDays} days`) : '');
                    if (displayTerms) {
                      displayTerms = displayTerms.replace(/within 0 days\.?/i, 'Immediate / Due on receipt');
                    }
                    if (!displayTerms) return null;

                    return (
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '210px' }}>
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
                  <tr style={{ background: pdfTheme.primaryColor, color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem 0.65rem', fontSize: '0.675rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: '35px', textAlign: 'center' }}>
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
                  {invoice.items.map((item, index) => {
                    const rawDesc = item.description?.trim();
                    const rawCat = item.categoryName?.trim();
                    const hasValidDesc = Boolean(rawDesc && rawDesc !== '-' && rawDesc !== '—');
                    const mainTitle = hasValidDesc ? rawDesc : (rawCat || 'Deliverables & Services');
                    const subTitle = (hasValidDesc && rawCat && rawCat.toLowerCase() !== rawDesc.toLowerCase()) ? rawCat : (item.hsnSac ? `HSN/SAC: ${item.hsnSac}` : '');

                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '0.55rem 0.65rem', fontSize: '0.75rem', textAlign: 'center', fontWeight: 700, color: '#09090b' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '0.55rem 0.65rem', fontSize: '0.775rem', color: '#09090b' }}>
                          <div style={{ fontWeight: 700, color: '#09090b' }}>{mainTitle}</div>
                          {subTitle && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                              {subTitle}
                            </div>
                          )}
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
                    );
                  })}
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

                  {/* Solid Primary Total Block */}
                  <div
                    style={{
                      background: pdfTheme.primaryColor,
                      color: '#ffffff',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '0.35rem',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL:</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900 }}>{formatAmount(invoice.total)}</span>
                  </div>

                  {/* Advance / Total Paid Breakdown */}
                  {effectivePaid > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', padding: '0.2rem 0.25rem', fontWeight: 700, fontSize: '0.775rem', marginTop: '0.15rem' }}>
                      <span>Amount Paid / Advance:</span>
                      <span>-{formatAmount(effectivePaid)}</span>
                    </div>
                  )}

                  {/* Balance Due (Warm Brown Box matching reference) */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    background: pdfTheme.balanceBg, 
                    color: pdfTheme.balanceText, 
                    padding: '0.4rem 0.65rem', 
                    borderRadius: '4px', 
                    fontWeight: 800, 
                    fontSize: '0.85rem', 
                    border: `1px solid ${pdfTheme.balanceBorder}`,
                    marginTop: '0.25rem',
                  }}>
                    <span>Balance Due:</span>
                    <span>{formatAmount(effectiveBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Amount in Words Block */}
              {showAmountInWords && pdfTheme.showAmountInWords && (
                <div style={{ background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    AMOUNT IN WORDS:
                  </span>
                  <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>
                    {numberToWordsINR(invoice.total)}
                  </span>
                </div>
              )}

              {/* Payment History & Settlements */}
              {showPaymentHistory && pdfTheme.showPaymentHistory && matchingPayments && matchingPayments.length > 0 && (
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
                      <span>PAYMENT HISTORY & SETTLEMENTS</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                      {matchingPayments.length} Record{matchingPayments.length > 1 ? 's' : ''} • Total Settled: <strong style={{ color: '#15803d' }}>{formatAmount(effectivePaid)}</strong>
                    </span>
                  </div>
                  {(() => {
                    const hasRefCol = matchingPayments.some((p) => {
                      const rawRef = p.isAdvance && invoice.advanceReference !== undefined ? invoice.advanceReference : (p.referenceNumber || '');
                      return rawRef.trim() !== '' && rawRef.trim() !== '.' && !rawRef.trim().startsWith('ADV-');
                    });

                    const hasNotesCol = matchingPayments.some((p) => {
                      const rawNotes = p.isAdvance && invoice.advanceNotes !== undefined ? invoice.advanceNotes : (p.notes || '');
                      return (
                        rawNotes.trim() !== '' &&
                        rawNotes.trim() !== '.' &&
                        rawNotes.trim() !== 'Advance payment recorded upon invoice issuance' &&
                        rawNotes.trim() !== 'Advance deposit upon invoice issuance' &&
                        rawNotes.trim() !== 'Advance deposit recorded upon invoice issuance'
                      );
                    });

                    return (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.725rem' }}>
                        <thead>
                          <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                            <th style={{ padding: '0.4rem 0.65rem', fontWeight: 700 }}>Date</th>
                            <th style={{ padding: '0.4rem 0.65rem', fontWeight: 700 }}>Method</th>
                            {hasRefCol && <th style={{ padding: '0.4rem 0.65rem', fontWeight: 700 }}>Reference</th>}
                            {hasNotesCol && <th style={{ padding: '0.4rem 0.65rem', fontWeight: 700 }}>Notes</th>}
                            <th style={{ padding: '0.4rem 0.65rem', fontWeight: 700, textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matchingPayments.map((p) => {
                            const rawRef = p.isAdvance && invoice.advanceReference !== undefined ? invoice.advanceReference : (p.referenceNumber || '');
                            const rawNotes = p.isAdvance && invoice.advanceNotes !== undefined ? invoice.advanceNotes : (p.notes || '');

                            const displayRef = rawRef && rawRef.trim() !== '.' && !rawRef.trim().startsWith('ADV-') ? rawRef.trim() : '';
                            const displayNotes =
                              rawNotes &&
                              rawNotes.trim() !== '.' &&
                              rawNotes.trim() !== 'Advance payment recorded upon invoice issuance' &&
                              rawNotes.trim() !== 'Advance deposit upon invoice issuance' &&
                              rawNotes.trim() !== 'Advance deposit recorded upon invoice issuance'
                                ? rawNotes.trim()
                                : '';

                            return (
                              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                                <td style={{ padding: '0.4rem 0.65rem', fontWeight: 500, color: '#09090b', whiteSpace: 'nowrap' }}>
                                  {p.paymentDate}
                                </td>
                                <td style={{ padding: '0.4rem 0.65rem', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontWeight: 700, color: '#334155', marginRight: '6px' }}>
                                    {p.paymentMethod}
                                  </span>
                                  {p.isAdvance && (
                                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '3px', fontWeight: 800, fontSize: '0.625rem' }}>
                                      ADVANCE
                                    </span>
                                  )}
                                </td>
                                {hasRefCol && (
                                  <td style={{ padding: '0.4rem 0.65rem', color: '#334155' }}>
                                    <span className="font-mono" style={{ fontWeight: 600 }}>{displayRef}</span>
                                  </td>
                                )}
                                {hasNotesCol && (
                                  <td style={{ padding: '0.4rem 0.65rem', color: '#64748b' }}>
                                    {displayNotes}
                                  </td>
                                )}
                                <td style={{ padding: '0.4rem 0.65rem', textAlign: 'right', fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap' }}>
                                  +{formatAmount(p.amount)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Bottom Footer Section: Authorised Signatory Above, Solid Black Line, Contact Line Under It */}
            {((pdfTheme.showSignatory && hasSignatory) || hasFooterContact) && (
              <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column' }}>
                {pdfTheme.showSignatory && hasSignatory && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.35rem' }}>
                    <div style={{ textAlign: 'center', minWidth: '190px' }}>
                      <div style={{ borderBottom: '1.5px solid #09090b', marginBottom: '0.35rem', width: '100%', height: '24px' }} />
                      <div style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, fontSize: '0.725rem', color: '#09090b' }}>
                        {signatoryTitle}
                      </div>
                    </div>
                  </div>
                )}

                {/* Solid Black Line across the page before mail, website, phone */}
                <div
                  className="footer-black-line"
                  style={{
                    height: '1.5px',
                    background: '#09090b',
                    backgroundColor: '#09090b',
                    width: '100%',
                    marginTop: '0.85rem',
                    marginBottom: '0.65rem',
                  }}
                />

                {hasFooterContact && (
                  <div style={{ 
                    textAlign: 'center', 
                    fontSize: '0.725rem', 
                    fontWeight: 700, 
                    color: '#09090b',
                    letterSpacing: '0.01em',
                  }}>
                    {footerContact.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <span>{item}</span>
                        {idx < footerContact.length - 1 && <span style={{ margin: '0 0.6rem', color: '#71717a' }}>{pdfTheme.footerSeparator}</span>}
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
