import React, { useState, useRef } from 'react';
import type { Invoice, Client, LineItem, BusinessSettings, InvoiceStatus, Product, Category, PaymentMethod } from '../types/invoice';
import { DEFAULT_CURRENCIES, getCurrencySymbol, generateNextInvoiceNumber, numberToWordsINR } from '../services/storageService';
import { calculateDocumentFinancials } from '../services/calculationEngine';
import { getPdfTheme } from '../services/pdfThemeService';
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  FileText,
  Building2,
  Building,
  CreditCard,
  Calendar,
  Sparkles,
  Upload,
  EyeOff,
  Image as ImageIcon,
  Download,
  Receipt,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CI, CT } from './ClearableInput';


export interface InitialPaymentPayload {
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  notes?: string;
  isAdvance?: boolean;
}

interface InvoiceEditorProps {
  invoiceToEdit?: Invoice | null;
  clients: Client[];
  products?: Product[];
  categories?: Category[];
  settings: BusinessSettings;
  onSave: (invoice: Invoice, initialPayment?: InitialPaymentPayload) => void;
  onAddClient?: (client: Client) => void;
  onCancel: () => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  invoiceToEdit,
  clients,
  products = [],
  categories = [],
  settings,
  onSave,
  onAddClient,
  onCancel,
}) => {
  const isEditing = !!invoiceToEdit;
  const [activeMobileTab, setActiveMobileTab] = useState<'form' | 'preview'>('form');
  const [quickSavedClientMessage, setQuickSavedClientMessage] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // 1. Sender & Company Details (in PDF Header)
  const [companyName, setCompanyName] = useState<string>(
    () => invoiceToEdit?.companyName !== undefined ? invoiceToEdit.companyName : settings.companyName
  );
  const [companyTagline, setCompanyTagline] = useState<string>(
    () => invoiceToEdit?.companyTagline !== undefined ? invoiceToEdit.companyTagline : settings.tagline
  );
  const [companyAddress, setCompanyAddress] = useState<string>(
    () => invoiceToEdit?.companyAddress !== undefined ? invoiceToEdit.companyAddress : settings.address
  );
  const [companyPincode, setCompanyPincode] = useState<string>(
    () => invoiceToEdit?.companyPincode !== undefined ? invoiceToEdit.companyPincode : (settings.pincode || '')
  );
  const [companyTaxId, setCompanyTaxId] = useState<string>(
    () => invoiceToEdit?.companyTaxId !== undefined ? invoiceToEdit.companyTaxId : settings.taxId
  );
  const [showCompanyLogo, setShowCompanyLogo] = useState<boolean>(
    () => invoiceToEdit?.showCompanyLogo !== undefined ? invoiceToEdit.showCompanyLogo : (settings.showLogo !== false)
  );
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>(
    () => invoiceToEdit?.companyLogoUrl || settings.logoUrl || ''
  );

  // 2. Client / Billed To Details (in PDF Recipient)
  const [selectedClientId, setSelectedClientId] = useState<string>(
    () => invoiceToEdit?.clientId || (clients[0]?.id || 'custom')
  );
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

  // 3. Invoice Meta & Dates
  const [currency, setCurrency] = useState<string>(
    () => invoiceToEdit?.currency || settings.currency || 'INR'
  );
  const [issueDate, setIssueDate] = useState<string>(
    () => invoiceToEdit?.issueDate || new Date().toISOString().slice(0, 10)
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    () => invoiceToEdit?.invoiceNumber || generateNextInvoiceNumber(0, issueDate)
  );
  const [paymentTermsDays, setPaymentTermsDays] = useState<number | string>(
    () => {
      if (invoiceToEdit?.paymentTermsDays !== undefined) {
        return invoiceToEdit.paymentTermsDays;
      }
      if (invoiceToEdit) {
        return '';
      }
      return settings.defaultPaymentTermsDays !== undefined ? settings.defaultPaymentTermsDays : 15;
    }
  );
  const [dueDate, setDueDate] = useState<string>(() => {
    if (invoiceToEdit?.dueDate) return invoiceToEdit.dueDate;
    if (invoiceToEdit && invoiceToEdit.paymentTermsDays === undefined) {
      return issueDate || new Date().toISOString().slice(0, 10);
    }
    const initialDays = settings.defaultPaymentTermsDays !== undefined ? settings.defaultPaymentTermsDays : 15;
    const d = new Date(issueDate ? new Date(issueDate).getTime() : Date.now());
    d.setDate(d.getDate() + Number(initialDays || 0));
    return d.toISOString().slice(0, 10);
  });

  // 4. Line Items
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

  // 5. Payment & Banking Details (in PDF)
  const [bankName, setBankName] = useState<string>(
    () => (invoiceToEdit?.bankName && invoiceToEdit.bankName.trim()) || settings.bankName?.trim() || ''
  );
  const [accountName, setAccountName] = useState<string>(
    () => (invoiceToEdit?.accountName && invoiceToEdit.accountName.trim()) || (settings.accountName || settings.companyName)?.trim() || ''
  );
  const [accountNumber, setAccountNumber] = useState<string>(
    () => (invoiceToEdit?.accountNumber && invoiceToEdit.accountNumber.trim()) || settings.accountNumber?.trim() || ''
  );
  const [ifscSwift, setIfscSwift] = useState<string>(
    () => (invoiceToEdit?.ifscSwift && invoiceToEdit.ifscSwift.trim()) || settings.ifscSwift?.trim() || ''
  );
  const [upiId, setUpiId] = useState<string>(
    () => (invoiceToEdit?.upiId && invoiceToEdit.upiId.trim()) || settings.upiId?.trim() || ''
  );

  // 6. Adjustments, Footer & Signatory
  const [discountRate, setDiscountRate] = useState<number>(() => invoiceToEdit?.discountRate || 0);
  const [shippingFee, setShippingFee] = useState<number>(() => invoiceToEdit?.shippingFee || 0);
  const status: InvoiceStatus = invoiceToEdit?.status || 'sent';
  const [notes, setNotes] = useState<string>(
    () => invoiceToEdit?.notes || settings.notesFooter || ''
  );
  const [terms, setTerms] = useState<string>(() => {
    if (invoiceToEdit) {
      if (invoiceToEdit.terms !== undefined) return invoiceToEdit.terms;
      if (invoiceToEdit.paymentTermsDays !== undefined) {
        return `Payment due within ${invoiceToEdit.paymentTermsDays} days.`;
      }
      return '';
    }
    const initialDays = settings.defaultPaymentTermsDays !== undefined ? settings.defaultPaymentTermsDays : 15;
    return initialDays !== undefined ? `Payment due within ${initialDays} days.` : '';
  });

  const [contactPhone, setContactPhone] = useState<string>(
    () => (invoiceToEdit?.contactPhone && invoiceToEdit.contactPhone.trim()) || settings.phone?.trim() || ''
  );
  const [contactEmail, setContactEmail] = useState<string>(
    () => (invoiceToEdit?.contactEmail && invoiceToEdit.contactEmail.trim()) || settings.email?.trim() || ''
  );
  const [contactWebsite, setContactWebsite] = useState<string>(
    () => (invoiceToEdit?.contactWebsite && invoiceToEdit.contactWebsite.trim()) || settings.website?.trim() || ''
  );
  const [signatoryTitle, setSignatoryTitle] = useState<string>(
    () => (invoiceToEdit?.signatoryTitle && invoiceToEdit.signatoryTitle.trim()) || 'Authorised Signatory'
  );

  // 7. Advance / Initial Payment State
  const [recordAdvance, setRecordAdvance] = useState<boolean>(() => {
    return Boolean(
      (invoiceToEdit?.advancePaymentAmount && invoiceToEdit.advancePaymentAmount > 0) ||
      (invoiceToEdit?.paidAmount && invoiceToEdit.paidAmount > 0)
    );
  });
  const [advanceAmount, setAdvanceAmount] = useState<number>(() => {
    return invoiceToEdit?.advancePaymentAmount || invoiceToEdit?.paidAmount || 0;
  });
  const [advanceDate, setAdvanceDate] = useState<string>(() => {
    return invoiceToEdit?.paidAt || issueDate || new Date().toISOString().slice(0, 10);
  });
  const [advanceMethod, setAdvanceMethod] = useState<PaymentMethod>(() => {
    return (invoiceToEdit?.paymentMethod as PaymentMethod) || 'UPI';
  });
  const [advanceReference, setAdvanceReference] = useState<string>('');
  const [advanceNotes, setAdvanceNotes] = useState<string>('Advance deposit upon invoice issuance');

  // 8. Invoice-Level Default Category
  const [invoiceCategoryId, setInvoiceCategoryId] = useState<string>(
    () => invoiceToEdit?.categoryId || ''
  );

  const livePreviewRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPreviewPDF = async () => {
    if (!livePreviewRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const element = livePreviewRef.current;
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
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          `;
          clonedDoc.head.appendChild(style);

          const clonedElement = clonedDoc.querySelector('.live-preview-card') as HTMLElement;
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

      pdf.save(`${invoiceNumber.trim() || 'INVOICE'}.pdf`);
    } catch (err) {
      console.error('Error generating preview PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const currencySymbol = getCurrencySymbol(currency);

  const formatGstin = (taxId?: string): string => {
    if (!taxId) return '';
    return taxId.replace(/^GSTIN[-:\s]*/i, '');
  };

  const companyGstinClean = formatGstin(companyTaxId);
  const clientGstinClean = formatGstin(clientTaxId);

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCompanyLogoUrl(reader.result as string);
      setShowCompanyLogo(true);
    };
    reader.readAsDataURL(file);
  };

  // Clear all details on the current invoice
  const handleClearAllDetails = () => {
    if (window.confirm('Are you sure you want to clear all details on this invoice? Client information, items, pricing, notes, and terms will be emptied.')) {
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

  // Clear Bank Instructions
  const handleClearBankDetails = () => {
    setBankName('');
    setAccountName('');
    setAccountNumber('');
    setIfscSwift('');
    setUpiId('');
  };

  // Restore Bank Instructions from Settings
  const handleRestoreBankDetails = () => {
    setBankName(settings.bankName || '');
    setAccountName(settings.accountName || settings.companyName || '');
    setAccountNumber(settings.accountNumber || '');
    setIfscSwift(settings.ifscSwift || '');
    setUpiId(settings.upiId || '');
  };

  // Clear Sender Profile
  const handleClearSenderDetails = () => {
    setCompanyName('');
    setCompanyTagline('');
    setCompanyAddress('');
    setCompanyPincode('');
    setCompanyTaxId('');
    setShowCompanyLogo(false);
  };

  // Restore Sender Profile from Settings
  const handleRestoreSenderDetails = () => {
    setCompanyName(settings.companyName || '');
    setCompanyTagline(settings.tagline || '');
    setCompanyAddress(settings.address || '');
    setCompanyPincode(settings.pincode || '');
    setCompanyTaxId(settings.taxId || '');
    setShowCompanyLogo(Boolean(settings.logoUrl));
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

  // Quick save custom client to CRM from Invoice Editor
  const handleQuickSaveClient = () => {
    const comp = clientCompany.trim() || clientName.trim() || 'Client';
    const cName = clientName.trim() || comp;
    const newId = `cli-${Date.now()}`;
    const newClient: Client = {
      id: newId,
      company: comp,
      name: cName,
      email: clientEmail.trim(),
      phone: clientPhone.trim(),
      address: clientAddress.trim(),
      city: '',
      country: 'India',
      pincode: clientPincode.trim(),
      taxId: clientTaxId.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
      notes: 'Added from invoice editor',
    };
    if (onAddClient) {
      onAddClient(newClient);
      setSelectedClientId(newId);
      setQuickSavedClientMessage(`✓ "${comp}" registered in Client CRM!`);
      setTimeout(() => setQuickSavedClientMessage(null), 4000);
    }
  };

  // Live calculations using unified financial engine
  const calculation = calculateDocumentFinancials({
    items,
    discountRate,
    shippingFee,
    isInterState: false,
    enableRoundOff: false,
  });

  const subtotal = calculation.subtotal;
  const discountTotal = calculation.discountTotal;
  const taxTotal = calculation.taxTotal;
  const grandTotal = calculation.total;

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
          let sanitizedVal = value;
          if (field === 'quantity') sanitizedVal = Math.max(0, Number(value) || 0);
          if (field === 'unitPrice') sanitizedVal = Math.max(0, Number(value) || 0);
          if (field === 'taxRate') sanitizedVal = Math.min(100, Math.max(0, Number(value) || 0));

          const updated = { ...item, [field]: sanitizedVal };
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
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const qty = item.quantity || 1;
          return {
            ...item,
            productId: product.id,
            description: product.name,
            categoryId: product.categoryId || item.categoryId,
            categoryName: product.categoryName || item.categoryName,
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

  const handleSaveInvoice = (saveStatus: InvoiceStatus = status) => {
    const cleanTerms = terms?.trim();
    const hasDays = paymentTermsDays !== '' && paymentTermsDays !== undefined && !isNaN(Number(paymentTermsDays));

    let finalDays: number | undefined = undefined;
    let finalTerms: string = '';

    if (!cleanTerms) {
      finalDays = undefined;
      finalTerms = '';
    } else if (hasDays) {
      finalDays = Number(paymentTermsDays);
      finalTerms = cleanTerms;
    } else {
      finalDays = undefined;
      finalTerms = cleanTerms;
    }

    const safeAdvance = recordAdvance
      ? Math.min(grandTotal, Math.max(0, Number(advanceAmount) || 0))
      : 0;

    const finalPaidAmount = safeAdvance;
    const finalBalanceDue = Math.max(0, Number((grandTotal - safeAdvance).toFixed(2)));

    let derivedStatus: InvoiceStatus = saveStatus;
    if (saveStatus !== 'draft' && saveStatus !== 'cancelled') {
      if (finalPaidAmount >= grandTotal && grandTotal > 0) {
        derivedStatus = 'paid';
      } else if (finalPaidAmount > 0) {
        derivedStatus = 'partially_paid';
      } else {
        derivedStatus = 'sent';
      }
    }

    const selectedCat = categories.find((c) => c.id === invoiceCategoryId);

    const newInvoice: Invoice = {
      id: invoiceToEdit?.id || `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber.trim(),
      clientId: selectedClientId,
      clientName: clientName?.trim() || '',
      clientCompany: clientCompany?.trim() || clientName?.trim() || 'Client',
      clientEmail: clientEmail?.trim() || '',
      clientPhone: clientPhone?.trim() || '',
      clientAddress: clientAddress?.trim() || '',
      clientPincode: clientPincode?.trim() || '',
      clientTaxId: clientTaxId?.trim() || '',
      issueDate: issueDate.trim(),
      dueDate: dueDate?.trim() || '',
      paymentTermsDays: finalDays,
      items,
      subtotal,
      taxTotal,
      discountRate,
      discountTotal,
      shippingFee,
      total: grandTotal,
      paidAmount: finalPaidAmount,
      balanceDue: finalBalanceDue,
      advancePaymentAmount: safeAdvance > 0 ? safeAdvance : undefined,
      categoryId: invoiceCategoryId || undefined,
      categoryName: selectedCat ? selectedCat.name : undefined,
      status: derivedStatus,
      paidAt: safeAdvance > 0 ? advanceDate : undefined,
      paymentMethod: safeAdvance > 0 ? advanceMethod : undefined,
      notes: notes?.trim() || '',
      terms: finalTerms,
      currency,
      createdAt: invoiceToEdit?.createdAt || new Date().toISOString(),

      // Sender & Company details for this invoice
      companyName: companyName?.trim() || '',
      companyTagline: companyTagline?.trim() || '',
      companyAddress: companyAddress?.trim() || '',
      companyPincode: companyPincode?.trim() || '',
      companyTaxId: companyTaxId?.trim() || '',
      companyLogoUrl,
      showCompanyLogo,

      // Banking details for this invoice
      bankName: bankName?.trim() || '',
      accountName: accountName?.trim() || '',
      accountNumber: accountNumber?.trim() || '',
      ifscSwift: ifscSwift?.trim() || '',
      upiId: upiId?.trim() || '',

      // Footer & Signatory for this invoice
      contactPhone: contactPhone?.trim() || '',
      contactEmail: contactEmail?.trim() || '',
      contactWebsite: contactWebsite?.trim() || '',
      signatoryTitle: signatoryTitle?.trim() || '',
    };

    // Emit initialPayment payload (whether new or edited) so App updates or clears the ledger
    const initialPayment: InitialPaymentPayload = {
      amount: safeAdvance,
      paymentDate: advanceDate,
      paymentMethod: advanceMethod,
      referenceNumber: advanceReference.trim() || `ADV-${Date.now().toString().slice(-6)}`,
      notes: advanceNotes.trim() || 'Advance payment recorded upon invoice issuance',
      isAdvance: true,
    };

    onSave(newInvoice, initialPayment);
  };

  const formatAmount = (num: number) => {
    return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const pdfTheme = getPdfTheme(settings);

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
  const hasSignatory = pdfTheme.showSignatory && Boolean(signatoryTitle && signatoryTitle.trim());
  const hasFooterContact = footerContact.length > 0;

  return (
    <div className="invoice-editor-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
              Full Control Invoice & PDF Builder — Edit every header, client, line item, bank & footer detail.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleClearAllDetails}
            className="btn btn-secondary"
            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
            title="Clear all client, item, and pricing details to start fresh"
          >
            <Trash2 size={16} />
            <span>Clear Client & Items</span>
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
          <span>Edit Details Form</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('preview')}
          className={`editor-view-tab-btn ${activeMobileTab === 'preview' ? 'active' : ''}`}
        >
          <Sparkles size={16} />
          <span>Live PDF Preview</span>
        </button>
      </div>

      {/* Editor Main Content: Split Grid */}
      <div className="editor-layout-grid">
        {/* Left Side: Form Controls */}
        <div style={{ display: activeMobileTab === 'form' ? 'flex' : undefined, flexDirection: 'column', gap: '1.25rem' }} className={activeMobileTab !== 'form' ? 'hide-mobile' : ''}>
          
          {/* SECTION 1: Sender & Company Details (in PDF Header) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building size={18} />
                  <span>Sender & Company Profile (PDF Header)</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Appears in the top-left of the invoice PDF. Overrides global settings for this invoice.
                </span>
              </div>
              {companyName || companyAddress || companyTaxId ? (
                <button
                  type="button"
                  onClick={handleClearSenderDetails}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  title="Clear sender info"
                >
                  <Trash2 size={12} /> Remove Sender Details
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRestoreSenderDetails}
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--primary-color, #6366f1)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  title="Restore company sender details from settings"
                >
                  <Plus size={12} /> + Add Default Sender Info
                </button>
              )}
            </div>

            {/* Logo Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '0.85rem', background: 'var(--bg-input)', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', background: '#ffffff', borderRadius: '6px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                  {!showCompanyLogo ? (
                    <EyeOff size={18} color="#71717a" />
                  ) : (
                    <img src={companyLogoUrl || '/favicon.png'} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {showCompanyLogo ? 'Invoice Logo Displayed' : 'Logo Hidden on this Invoice'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Controls whether a logo appears in this PDF header.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="btn btn-secondary btn-sm"
                >
                  <Upload size={13} />
                  <span>Change</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompanyLogo(!showCompanyLogo)}
                  className="btn btn-secondary btn-sm"
                  style={{ color: showCompanyLogo ? '#ef4444' : 'var(--text-primary)' }}
                >
                  {showCompanyLogo ? <EyeOff size={13} /> : <ImageIcon size={13} />}
                  <span>{showCompanyLogo ? 'Hide' : 'Show'}</span>
                </button>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Company Legal Name</label>
                <CI type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} onClear={() => setCompanyName('')} className="form-input" placeholder="e.g. Highphaus" />
              </div>

              <div className="form-group">
                <label className="form-label">Agency Tagline / Subtitle</label>
                <CI type="text" value={companyTagline} onChange={(e) => setCompanyTagline(e.target.value)} onClear={() => setCompanyTagline('')} className="form-input" placeholder="e.g. Creative Marketing Agency" />
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Office Address</label>
                <CI type="text" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} onClear={() => setCompanyAddress('')} className="form-input" placeholder="Street, City, State" />
              </div>

              <div className="form-group">
                <label className="form-label">PIN Code</label>
                <CI type="text" value={companyPincode} onChange={(e) => setCompanyPincode(e.target.value)} onClear={() => setCompanyPincode('')} className="form-input font-mono" placeholder="e.g. 695608" />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN / Corporate Tax ID</label>
                <CI type="text" value={companyTaxId} onChange={(e) => setCompanyTaxId(e.target.value)} onClear={() => setCompanyTaxId('')} className="form-input font-mono" placeholder="GSTIN-..." />
              </div>
            </div>
          </div>

          {/* SECTION 2: Client & Billing Address ("Invoice To" in PDF) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} />
                <span>Billed To: Client Details (PDF Recipient)</span>
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Invoice Recipient
              </span>
            </div>

            {/* Unified Client Dropdown */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Select Client from CRM or Enter Custom Details</label>
                {selectedClientId === 'custom' && (clientCompany.trim() || clientName.trim()) && onAddClient && (
                  <button
                    type="button"
                    onClick={handleQuickSaveClient}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', height: 'auto' }}
                    title="Save this new client to your CRM immediately"
                  >
                    <Plus size={13} />
                    <span>Save to Client CRM Now</span>
                  </button>
                )}
              </div>
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

              {/* CRM Sync Helper / Feedback Badge */}
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {quickSavedClientMessage ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--success, #10b981)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={13} />
                    {quickSavedClientMessage}
                  </span>
                ) : selectedClientId === 'custom' ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={13} color="var(--primary)" />
                    Clients entered on this invoice will automatically be added to your <strong>Client Accounts List</strong> for future invoices.
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building size={13} color="var(--primary)" />
                    Linked to CRM: <strong>{clients.find((c) => c.id === selectedClientId)?.company || clientCompany}</strong> (Updates here sync with their CRM profile).
                  </span>
                )}
              </div>
            </div>

            {/* Row 1: Company Name & Contact Person (2 Columns) */}
            <div className="grid-2" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Client Company Name</label>
                <CI type="text" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} onClear={() => setClientCompany('')} className="form-input" placeholder="e.g. Apex Apparel & Lifestyle" />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Person Name</label>
                <CI type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} onClear={() => setClientName('')} className="form-input" placeholder="e.g. Robert Sterling" />
              </div>
            </div>

            {/* Row 2: Billing Address & PIN Code (2 Columns) */}
            <div className="grid-2" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Billing Address</label>
                <CI type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} onClear={() => setClientAddress('')} className="form-input" placeholder="e.g. 102 Fashion Avenue, Lower Parel, Mumbai, India" />
              </div>

              <div className="form-group">
                <label className="form-label">Client PIN Code</label>
                <CI type="text" value={clientPincode} onChange={(e) => setClientPincode(e.target.value)} onClear={() => setClientPincode('')} className="form-input font-mono" placeholder="e.g. 400013" />
              </div>
            </div>

            {/* Row 3: Email, Phone & GSTIN (3 Columns) */}
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Billing Email</label>
                <CI type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} onClear={() => setClientEmail('')} className="form-input" placeholder="r.sterling@company.com" />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <CI type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} onClear={() => setClientPhone('')} className="form-input" placeholder="+91 98200 11223" />
              </div>

              <div className="form-group">
                <label className="form-label">Client GSTIN / Tax ID</label>
                <CI type="text" value={clientTaxId} onChange={(e) => setClientTaxId(e.target.value)} onClear={() => setClientTaxId('')} className="form-input font-mono" placeholder="GSTIN-27APXAP9042K1Z4" />
              </div>
            </div>
          </div>

          {/* SECTION 3: Invoice Metadata & Dates */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} />
              <span>Invoice Dates & Terms</span>
            </h3>

            <div className="grid-3" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Invoice Number</label>
                <CI type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} onClear={() => setInvoiceNumber('')} className="form-input font-mono" style={{ fontWeight: 800 }} />
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
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
                <label className="form-label">Primary Category</label>
                <select
                  value={invoiceCategoryId}
                  onChange={(e) => setInvoiceCategoryId(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Auto from items / General --</option>
                  {categories.filter(c => c.status !== 'archived').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => {
                    const newIssueDate = e.target.value;
                    setIssueDate(newIssueDate);
                    if (!isEditing) {
                      setInvoiceNumber(generateNextInvoiceNumber(0, newIssueDate));
                    }
                    if (newIssueDate) {
                      const days = paymentTermsDays === '' ? 0 : Number(paymentTermsDays);
                      const issueObj = new Date(newIssueDate);
                      issueObj.setDate(issueObj.getDate() + days);
                      setDueDate(issueObj.toISOString().slice(0, 10));
                    }
                  }}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <CI
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    const newDueDate = e.target.value;
                    setDueDate(newDueDate);
                    if (issueDate && newDueDate) {
                      const diffTime = new Date(newDueDate).getTime() - new Date(issueDate).getTime();
                      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                      const validDays = isNaN(diffDays) ? 0 : Math.max(0, diffDays);
                      setPaymentTermsDays(validDays);
                      setTerms(`Payment due within ${validDays} days.`);
                    }
                  }}
                  onClear={() => { setDueDate(''); setPaymentTermsDays(''); setTerms(''); }}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Payment Terms (Days)</label>
                  {(paymentTermsDays !== '' && paymentTermsDays !== undefined && paymentTermsDays !== 0) || Boolean(terms?.trim()) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentTermsDays('');
                        setTerms('');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.12rem 0.45rem', fontSize: '0.7rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#ef4444' }}
                      title="Clear to remove payment terms completely"
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const defaultDays = settings.defaultPaymentTermsDays !== undefined ? settings.defaultPaymentTermsDays : 15;
                        setPaymentTermsDays(defaultDays);
                        setTerms(`Payment due within ${defaultDays} days.`);
                        if (issueDate) {
                          const issueObj = new Date(issueDate);
                          issueObj.setDate(issueObj.getDate() + defaultDays);
                          setDueDate(issueObj.toISOString().slice(0, 10));
                        }
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.12rem 0.45rem', fontSize: '0.7rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--primary-color, #6366f1)' }}
                      title="Add standard payment terms"
                    >
                      <Plus size={11} /> + Add
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  value={paymentTermsDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || !val.trim()) {
                      setPaymentTermsDays('');
                      setTerms('');
                      return;
                    }
                    const days = Math.max(0, parseInt(val, 10) || 0);
                    setPaymentTermsDays(days);
                    if (issueDate) {
                      const issueObj = new Date(issueDate);
                      issueObj.setDate(issueObj.getDate() + days);
                      setDueDate(issueObj.toISOString().slice(0, 10));
                    }
                    setTerms(`Payment due within ${days} days.`);
                  }}
                  className="form-input font-mono"
                  placeholder="Leave blank to remove"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Line Items */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Deliverables & Line Items
              </h3>
              <button type="button" onClick={handleAddItem} className="btn btn-secondary btn-sm">
                <Plus size={14} />
                <span>Add Deliverable</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item, index) => (
                <div key={item.id} style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                      ITEM #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="btn btn-danger btn-sm"
                      disabled={items.length <= 1}
                      style={{ padding: '0.25rem 0.45rem' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: products.length > 0 ? '1.2fr 1fr' : '1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                    {products.length > 0 && (
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Load from Catalog</label>
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
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Service Category</label>
                      <select
                        value={item.categoryId || ''}
                        onChange={(e) => {
                          const catId = e.target.value;
                          const found = categories.find((c) => c.id === catId);
                          setItems(
                            items.map((i) =>
                              i.id === item.id
                                ? {
                                    ...i,
                                    categoryId: catId || undefined,
                                    categoryName: found ? found.name : undefined,
                                  }
                                : i
                            )
                          );
                        }}
                        className="form-select"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                      >
                        <option value="">-- General / No Category --</option>
                        {categories
                          .filter((c) => c.status === 'active' || c.id === item.categoryId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Deliverable Description</label>
                    <input
                      type="text"
                      placeholder="Service or product description..."
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="form-input"
                    />
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
                        value={item.taxRate ?? (settings.defaultTaxRate || 0)}
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

          {/* SECTION 4.5: Advance / Initial Payment Support (Always Editable) */}
          <div
            className="card"
            style={{
              border: recordAdvance ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
              background: recordAdvance ? 'rgba(59, 130, 246, 0.03)' : undefined,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: recordAdvance ? '1rem' : 0, flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="recordAdvanceCheckbox"
                    checked={recordAdvance}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRecordAdvance(checked);
                      if (checked && advanceAmount <= 0) {
                        setAdvanceAmount(Number((grandTotal / 2).toFixed(2)));
                      }
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="recordAdvanceCheckbox" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Record Advance / Partial Payment
                  </label>
                  {isEditing && (
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color, #6366f1)', fontWeight: 700 }}>
                      Editable
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 1.5rem' }}>
                  {isEditing
                    ? 'Modify, update or clear the advance payment for this invoice. Real-time balance calculations apply.'
                    : 'Acknowledge upfront deposit upon invoice issuance. Automatically calculates remaining balance due.'}
                </p>
              </div>
              {recordAdvance && (
                <span className={`badge badge-${advanceAmount >= grandTotal && grandTotal > 0 ? 'paid' : 'partially_paid'}`}>
                  {advanceAmount >= grandTotal && grandTotal > 0 ? 'Full Advance' : 'Partial Advance'}
                </span>
              )}
            </div>

            {recordAdvance && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Advance Amount Received ({currencySymbol})</label>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      step="0.01"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(Math.max(0, Number(e.target.value) || 0))}
                      className="form-input font-mono"
                      style={{ fontWeight: 800 }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input
                      type="date"
                      value={advanceDate}
                      onChange={(e) => setAdvanceDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select
                      value={advanceMethod}
                      onChange={(e) => setAdvanceMethod(e.target.value as PaymentMethod)}
                      className="form-select"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Card">Card</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">UTR / Reference / Transaction ID</label>
                    <CI type="text" placeholder="e.g. UPI-983210492 / NEFT-HDFC-991823" value={advanceReference} onChange={(e) => setAdvanceReference(e.target.value)} onClear={() => setAdvanceReference('')} className="form-input font-mono" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Notes / Memo</label>
                    <CI type="text" placeholder="e.g. Initial 50% project advance deposit" value={advanceNotes} onChange={(e) => setAdvanceNotes(e.target.value)} onClear={() => setAdvanceNotes('')} className="form-input" />
                  </div>
                </div>

                {/* Live Financial Breakdown Card */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Project Amount</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatAmount(grandTotal)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.675rem', color: 'var(--success)', textTransform: 'uppercase', fontWeight: 700 }}>Advance Paid</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>{formatAmount(Math.min(grandTotal, advanceAmount))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.675rem', color: 'var(--warning)', textTransform: 'uppercase', fontWeight: 700 }}>Remaining Balance Due</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: Math.max(0, grandTotal - advanceAmount) > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                      {formatAmount(Math.max(0, grandTotal - advanceAmount))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: Banking & Wire Instructions (in PDF) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CreditCard size={18} />
                  <span>Payment & Bank Wire Instructions (PDF Details)</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Appears in the Payment Details box of the PDF. Leave blank to omit.
                </span>
              </div>
              {bankName || accountName || accountNumber || ifscSwift || upiId ? (
                <button
                  type="button"
                  onClick={handleClearBankDetails}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  title="Clear banking instructions for this invoice"
                >
                  <Trash2 size={12} /> Remove Bank Details
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRestoreBankDetails}
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--primary-color, #6366f1)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  title="Restore bank details from company settings"
                >
                  <Plus size={12} /> + Add Default Bank Details
                </button>
              )}
            </div>

            <div className="grid-2" style={{ marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <CI type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} onClear={() => setBankName('')} className="form-input" placeholder="e.g. HDFC Bank Ltd" />
              </div>

              <div className="form-group">
                <label className="form-label">Account Holder Name</label>
                <CI type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} onClear={() => setAccountName('')} className="form-input" placeholder="Account holder name" />
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <CI type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} onClear={() => setAccountNumber('')} className="form-input font-mono" placeholder="Account #" />
              </div>

              <div className="form-group">
                <label className="form-label">IFSC / SWIFT Code</label>
                <CI type="text" value={ifscSwift} onChange={(e) => setIfscSwift(e.target.value)} onClear={() => setIfscSwift('')} className="form-input font-mono" placeholder="IFSC / SWIFT" />
              </div>

              <div className="form-group">
                <label className="form-label">UPI ID / Virtual Address</label>
                <CI type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} onClear={() => setUpiId('')} className="form-input font-mono" placeholder="name@upi" />
              </div>
            </div>
          </div>

          {/* SECTION 6: Adjustments, Notes, Signatory & Footer */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Adjustments, Notes, Signatory & Contact Footer
            </h3>

            <div className="grid-2" style={{ marginBottom: '0.75rem' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Discount Rate (%)</label>
                  {discountRate > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiscountRate(0)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.12rem 0.45rem', fontSize: '0.7rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#ef4444' }}
                      title="Remove discount"
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  )}
                </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Logistics / Media Fee ({currencySymbol})</label>
                  {shippingFee > 0 && (
                    <button
                      type="button"
                      onClick={() => setShippingFee(0)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.12rem 0.45rem', fontSize: '0.7rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#ef4444' }}
                      title="Remove shipping fee"
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Number(e.target.value))}
                  className="form-input font-mono"
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '0.75rem' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Payment Terms Text</label>
                  {(Boolean(terms?.trim()) || (paymentTermsDays !== '' && paymentTermsDays !== undefined && paymentTermsDays !== 0)) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTerms('');
                        setPaymentTermsDays('');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444' }}
                      title="Clear to remove payment terms completely"
                    >
                      <Trash2 size={11} /> Remove Terms
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const defaultDays = settings.defaultPaymentTermsDays !== undefined ? settings.defaultPaymentTermsDays : 15;
                        setPaymentTermsDays(defaultDays);
                        setTerms(`Payment due within ${defaultDays} days.`);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-color, #6366f1)' }}
                      title="Add default payment terms"
                    >
                      <Plus size={11} /> + Add Terms
                    </button>
                  )}
                </div>
                <CI
                  type="text"
                  value={terms}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTerms(val);
                    if (!val.trim()) {
                      setPaymentTermsDays('');
                    } else {
                      const match = val.match(/\bwithin\s+(\d+)\s+days?\b/i) || val.match(/\b(\d+)\s+days?\b/i);
                      if (match) {
                        const parsed = parseInt(match[1], 10);
                        if (!isNaN(parsed)) {
                          setPaymentTermsDays(parsed);
                        }
                      }
                    }
                  }}
                  onClear={() => { setTerms(''); setPaymentTermsDays(''); }}
                  className="form-input"
                  placeholder="Leave blank or space to remove payment terms"
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  When left blank or removed, Payment Terms and its label are completely hidden on the invoice.
                </span>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Authorised Signatory Label / Title</label>
                  {signatoryTitle?.trim() ? (
                    <button
                      type="button"
                      onClick={() => setSignatoryTitle('')}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444' }}
                      title="Clear to remove signatory and signature line"
                    >
                      <Trash2 size={11} /> Remove Signatory
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSignatoryTitle('Authorised Signatory')}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-color, #6366f1)' }}
                      title="Add authorised signatory"
                    >
                      <Plus size={11} /> + Add Signatory
                    </button>
                  )}
                </div>
                <CI
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  onClear={() => setSignatoryTitle('')}
                  className="form-input"
                  placeholder="Leave blank to remove signatory & signature line"
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  When removed or blank, the signature line and title are completely hidden on the invoice.
                </span>
              </div>
            </div>

            {/* Footer Contact Bar Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Footer Contact Bar</span>
              {contactPhone || contactEmail || contactWebsite ? (
                <button
                  type="button"
                  onClick={() => {
                    setContactPhone('');
                    setContactEmail('');
                    setContactWebsite('');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.12rem 0.45rem', fontSize: '0.7rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#ef4444' }}
                  title="Remove all footer contact info"
                >
                  <Trash2 size={11} /> Remove Contact Info
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setContactPhone(settings.phone || '');
                    setContactEmail(settings.email || '');
                    setContactWebsite(settings.website || '');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.12rem 0.45rem', fontSize: '0.7rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--primary-color, #6366f1)' }}
                  title="Add company contact details to footer"
                >
                  <Plus size={11} /> + Add Contact Info
                </button>
              )}
            </div>

            <div className="grid-3" style={{ marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Footer Phone</label>
                <CI type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} onClear={() => setContactPhone('')} className="form-input" placeholder="+91..." />
              </div>

              <div className="form-group">
                <label className="form-label">Footer Email</label>
                <CI type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} onClear={() => setContactEmail('')} className="form-input" placeholder="hello@company.com" />
              </div>

              <div className="form-group">
                <label className="form-label">Footer Website</label>
                <CI type="text" value={contactWebsite} onChange={(e) => setContactWebsite(e.target.value)} onClear={() => setContactWebsite('')} className="form-input" placeholder="www.company.com" />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Client Notes / Special Instructions</label>
                {!notes?.trim() && (
                  <button
                    type="button"
                    onClick={() => setNotes(settings.notesFooter || 'Thank you for your business!')}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-color, #6366f1)' }}
                    title="Add default client notes"
                  >
                    <Plus size={11} /> + Add Notes
                  </button>
                )}
              </div>
              <CT
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onClear={() => setNotes('')}
                className="form-textarea"
                rows={2}
                placeholder="Thank you for your business..."
              />
            </div>
          </div>
        </div>

        {/* Right Side: Creative & Compact Document Live Preview */}
        <div style={{ position: 'sticky', top: '1rem', height: 'fit-content' }} className={activeMobileTab !== 'preview' ? 'hide-mobile' : ''}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem', letterSpacing: '0.05em' }}>
              <Sparkles size={14} color="#ffffff" />
              <span>Live Document Preview (Real-Time PDF View)</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadPreviewPDF}
              disabled={isGeneratingPdf}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              title="Download this exact live preview as PDF"
            >
              <Download size={13} />
              <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>

          <div
            ref={livePreviewRef}
            className="card live-preview-card"
            style={{
              background: '#ffffff',
              color: '#09090b',
              padding: '1.75rem',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
              fontSize: '0.8rem',
              fontFamily: pdfTheme.fontFamily,
            }}
          >
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
                {(companyAddress || companyGstinClean) && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.725rem', color: '#3f3f46', lineHeight: 1.35, maxWidth: '300px' }}>
                    {companyAddress && <div style={{ fontWeight: 600 }}>{companyAddress}{companyPincode ? ` - ${companyPincode}` : ''}</div>}
                    {companyGstinClean && (
                      <div style={{ marginTop: '0.15rem' }}>
                        GSTIN: <strong>{companyGstinClean}</strong>
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
                  const cCompany = clientCompany?.trim();
                  const cName = clientName?.trim();
                  const cAddress = clientAddress?.trim();
                  const cPincode = clientPincode?.trim();
                  const cEmail = clientEmail?.trim();
                  const cPhone = clientPhone?.trim();
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
                {invoiceNumber?.trim() && (
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                    <span style={{ fontWeight: 800, color: '#09090b' }}>Invoice#</span>
                    <span className="font-mono" style={{ fontWeight: 800, color: '#09090b' }}>{invoiceNumber.trim()}</span>
                  </div>
                )}
                {issueDate?.trim() && (
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                    <span style={{ fontWeight: 800, color: '#09090b' }}>Date</span>
                    <span>{issueDate.trim()}</span>
                  </div>
                )}
                {dueDate?.trim() && (
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                    <span style={{ fontWeight: 800, color: '#09090b' }}>Due Date</span>
                    <span>{dueDate.trim()}</span>
                  </div>
                )}
                {(() => {
                  const cleanTerms = terms?.trim();
                  if (!cleanTerms) return null;

                  return (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', maxWidth: '190px' }}>
                      <span style={{ fontWeight: 800, color: '#09090b' }}>Payment Terms</span>
                      <span>{cleanTerms}</span>
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
                  <th style={{ padding: '0.5rem 0.65rem', fontSize: '0.675rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '60px' }}>
                    Qty.
                  </th>
                  <th style={{ padding: '0.5rem 0.65rem', fontSize: '0.675rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', width: '110px' }}>
                    Price
                  </th>
                  <th style={{ padding: '0.5rem 0.65rem', fontSize: '0.675rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', width: '110px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: hasBankInfo ? '1.1fr 0.9fr' : '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {hasBankInfo && (
                <div style={{ fontSize: '0.725rem', color: '#3f3f46', lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 800, color: '#09090b', marginBottom: '0.35rem', fontSize: '0.775rem' }}>
                    Payment Details
                  </div>
                  {(accountName?.trim() || companyName?.trim()) && (
                    <div>Account Name: <strong>{accountName?.trim() || companyName?.trim()}</strong></div>
                  )}
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
                  <span style={{ fontSize: '1.05rem', fontWeight: 900 }}>{formatAmount(grandTotal)}</span>
                </div>

                {recordAdvance && advanceAmount > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', padding: '0.2rem 0.25rem', fontWeight: 700, fontSize: '0.775rem' }}>
                      <span>Amount Paid / Advance:</span>
                      <span>-{formatAmount(Math.min(grandTotal, advanceAmount))}</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      background: pdfTheme.balanceBg, 
                      color: pdfTheme.balanceText, 
                      padding: '0.35rem 0.5rem', 
                      borderRadius: '4px', 
                      fontWeight: 800, 
                      fontSize: '0.825rem', 
                      border: `1px solid ${pdfTheme.balanceBorder}` 
                    }}>
                      <span>Balance Due:</span>
                      <span>{formatAmount(Math.max(0, grandTotal - advanceAmount))}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Amount in Words Block */}
            {pdfTheme.showAmountInWords && (
              <div style={{ background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  AMOUNT IN WORDS:
                </span>
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#09090b' }}>
                  {numberToWordsINR(grandTotal)}
                </span>
              </div>
            )}

            {/* Payment History & Settlements */}
            {pdfTheme.showPaymentHistory && recordAdvance && advanceAmount > 0 && (
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
                    1 Record • Total Settled: <strong style={{ color: '#15803d' }}>{formatAmount(advanceAmount)}</strong>
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.725rem' }}>
                  <thead>
                    <tr style={{ background: '#ffffff', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.4rem 0.65rem', fontWeight: 700 }}>Date</th>
                      <th style={{ padding: '0.4rem 0.65rem', fontWeight: 700 }}>Method</th>
                      <th style={{ padding: '0.4rem 0.65rem', fontWeight: 700 }}>Reference</th>
                      <th style={{ padding: '0.4rem 0.65rem', fontWeight: 700 }}>Notes</th>
                      <th style={{ padding: '0.4rem 0.65rem', fontWeight: 700, textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                      <td style={{ padding: '0.4rem 0.65rem', color: '#334155', whiteSpace: 'nowrap' }}>
                        {advanceDate || issueDate || 'Today'}
                      </td>
                      <td style={{ padding: '0.4rem 0.65rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, color: '#334155', marginRight: '6px' }}>
                          {advanceMethod}
                        </span>
                        <span
                          style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            fontWeight: 800,
                            fontSize: '0.625rem',
                            padding: '1px 6px',
                            borderRadius: '3px',
                          }}
                        >
                          ADVANCE
                        </span>
                      </td>
                      <td style={{ padding: '0.4rem 0.65rem', color: '#334155' }}>
                        <span className="font-mono" style={{ fontWeight: 600 }}>{advanceReference?.trim() || '—'}</span>
                      </td>
                      <td style={{ padding: '0.4rem 0.65rem', color: '#64748b' }}>
                        {advanceNotes?.trim() || 'Advance payment recorded upon invoice issuance'}
                      </td>
                      <td style={{ padding: '0.4rem 0.65rem', textAlign: 'right', fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap' }}>
                        +{formatAmount(advanceAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Footer Section: Authorised Signatory Above, Contact Line Under It */}
            {((pdfTheme.showSignatory && hasSignatory) || hasFooterContact) && (
              <div style={{ borderTop: `2px solid ${pdfTheme.accentColor}`, paddingTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {pdfTheme.showSignatory && hasSignatory && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'center', minWidth: '180px' }}>
                      <div style={{ borderBottom: '1.5px solid #09090b', marginBottom: '0.35rem', width: '100%', height: '26px' }} />
                      <div style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, fontSize: '0.725rem', color: '#09090b' }}>
                        {signatoryTitle || pdfTheme.signatoryTitle}
                      </div>
                    </div>
                  </div>
                )}
                {hasFooterContact && (
                  <div style={{ 
                    borderTop: (pdfTheme.showSignatory && hasSignatory) ? '1px solid #e4e4e7' : 'none', 
                    paddingTop: (pdfTheme.showSignatory && hasSignatory) ? '0.5rem' : '0', 
                    textAlign: 'center', 
                    fontSize: '0.725rem', 
                    fontWeight: 700, 
                    color: '#09090b' 
                  }}>
                    {footerContact.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <span>{item}</span>
                        {idx < footerContact.length - 1 && <span style={{ margin: '0 0.6rem', color: '#a1a1aa' }}>{pdfTheme.footerSeparator}</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="mobile-sticky-action-bar">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          style={{ flex: 1, minHeight: '40px' }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button
          type="button"
          onClick={() => handleSaveInvoice('draft')}
          className="btn btn-secondary"
          style={{ flex: 1, minHeight: '40px' }}
        >
          <FileText size={16} />
          <span>Draft</span>
        </button>
        <button
          type="button"
          onClick={() => handleSaveInvoice('sent')}
          className="btn btn-primary"
          style={{ flex: 1.4, minHeight: '40px' }}
        >
          <Save size={16} />
          <span>{isEditing ? 'Update' : 'Save'}</span>
        </button>
      </div>
    </div>
  );
};

