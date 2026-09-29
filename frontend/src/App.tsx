import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoiceViewModal } from './components/InvoiceViewModal';
import { BillList } from './components/BillList';
import { BillEditorModal } from './components/BillEditorModal';
import { BillViewModal } from './components/BillViewModal';
import { ClientList } from './components/ClientList';
import { ProductList } from './components/ProductList';
import { PaymentList } from './components/PaymentList';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { ExpenseList } from './components/ExpenseList';
import { ReportsView } from './components/ReportsView';
import { SaaSBillingView } from './components/SaaSBillingView';
import { QuotesList } from './components/QuotesList';
import { SettingsView } from './components/SettingsView';
import { TeamManagementView } from './components/TeamManagementView';
import { HelpSupportView } from './components/HelpSupportView';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import { Menu, Sun, Moon } from 'lucide-react';

import type {
  Invoice,
  Client,
  Quote,
  RecurringTemplate,
  BusinessSettings,
  Product,
  Bill,
  Payment,
  Expense,
  SaaSSubscriptionState,
  TeamMember,
  AuditLogEntry,
} from './types/invoice';

import {
  getStoredInvoices,
  saveInvoices,
  getStoredBills,
  saveBills,
  getStoredClients,
  saveClients,
  getStoredProducts,
  saveProducts,
  getStoredPayments,
  savePayments,
  getStoredExpenses,
  saveExpenses,
  getStoredQuotes,
  saveQuotes,
  getStoredRecurring,
  getStoredSettings,
  saveSettings,
  getStoredSubscription,
  saveSubscription,
  getStoredTeam,
  saveTeam,
  getStoredAuditLogs,
  recordAuditLog,
  getCurrencySymbol,
  generateNextInvoiceNumber,
  generateNextBillNumber,
  wipeEntireWebsite,
  resetToDemoData,
  clearAllInvoices,
  clearAllClients,
  clearAllQuotes,
  clearAllRecurring,
} from './services/storageService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core App State using lazy initializers
  const [invoices, setInvoices] = useState<Invoice[]>(() => getStoredInvoices());
  const [bills, setBills] = useState<Bill[]>(() => getStoredBills());
  const [clients, setClients] = useState<Client[]>(() => getStoredClients());
  const [products, setProducts] = useState<Product[]>(() => getStoredProducts());
  const [payments, setPayments] = useState<Payment[]>(() => getStoredPayments());
  const [expenses, setExpenses] = useState<Expense[]>(() => getStoredExpenses());
  const [quotes, setQuotes] = useState<Quote[]>(() => getStoredQuotes());
  const [_recurring, setRecurring] = useState<RecurringTemplate[]>(() => getStoredRecurring());
  const [settings, setSettings] = useState<BusinessSettings>(() => getStoredSettings());
  const [subscription, setSubscription] = useState<SaaSSubscriptionState>(() => getStoredSubscription());
  const [team, setTeam] = useState<TeamMember[]>(() => getStoredTeam());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => getStoredAuditLogs());

  // Modal / View States
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isCreatingBill, setIsCreatingBill] = useState(false);

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentInitialDoc, setPaymentInitialDoc] = useState<{ type: 'invoice' | 'bill'; id: string } | undefined>(undefined);

  // Toast Feedback State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync theme attribute to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const currencySymbol = getCurrencySymbol(settings.currency);

  // --------------------------------------------------------------------------
  // INVOICE HANDLERS
  // --------------------------------------------------------------------------
  const handleSaveInvoice = (invoice: Invoice) => {
    // 1. Auto-sync Client in CRM
    const compName = invoice.clientCompany?.trim();
    const contactName = invoice.clientName?.trim();
    const email = invoice.clientEmail?.trim();

    let updatedClients = [...clients];
    let finalClientId = invoice.clientId;

    if (compName || contactName || email) {
      const existingIndex = clients.findIndex((c) => {
        if (invoice.clientId && invoice.clientId !== 'custom' && c.id === invoice.clientId) {
          return true;
        }
        if (compName && c.company.trim().toLowerCase() === compName.toLowerCase()) {
          return true;
        }
        if (email && c.email && c.email.trim().toLowerCase() === email.toLowerCase()) {
          return true;
        }
        return false;
      });

      if (existingIndex !== -1) {
        const existing = clients[existingIndex];
        finalClientId = existing.id;
        const updatedClient: Client = {
          ...existing,
          company: compName || existing.company,
          name: contactName || existing.name,
          email: email || existing.email,
          phone: invoice.clientPhone?.trim() || existing.phone,
          address: invoice.clientAddress?.trim() || existing.address,
          pincode: invoice.clientPincode?.trim() || existing.pincode,
          taxId: invoice.clientTaxId?.trim() || existing.taxId,
        };
        updatedClients[existingIndex] = updatedClient;
        setClients(updatedClients);
        saveClients(updatedClients);
      } else {
        const newClientId = invoice.clientId && invoice.clientId !== 'custom'
          ? invoice.clientId
          : `cli-${Date.now()}`;
        finalClientId = newClientId;

        const newClient: Client = {
          id: newClientId,
          company: compName || contactName || 'Client',
          name: contactName || compName || 'Primary Contact',
          email: email || '',
          phone: invoice.clientPhone?.trim() || '',
          address: invoice.clientAddress?.trim() || '',
          city: '',
          country: 'India',
          pincode: invoice.clientPincode?.trim() || '',
          taxId: invoice.clientTaxId?.trim() || '',
          createdAt: new Date().toISOString().slice(0, 10),
          notes: `Created from invoice ${invoice.invoiceNumber}`,
        };

        updatedClients = [newClient, ...clients];
        setClients(updatedClients);
        saveClients(updatedClients);
        addToast('info', 'Client Saved to CRM', `${newClient.company} is saved in your Client Accounts.`);
      }
    }

    const finalizedInvoice: Invoice = {
      ...invoice,
      clientId: finalClientId || 'custom',
    };

    let updated: Invoice[];
    const exists = invoices.some((i) => i.id === finalizedInvoice.id);
    if (exists) {
      updated = invoices.map((i) => (i.id === finalizedInvoice.id ? finalizedInvoice : i));
      addToast('success', 'Invoice Updated', `Invoice ${finalizedInvoice.invoiceNumber} updated.`);
      recordAuditLog({
        userName: team[0]?.name || 'Admin',
        action: 'Invoice Updated',
        entityType: 'Invoice',
        entityId: finalizedInvoice.id,
        details: `Updated invoice ${finalizedInvoice.invoiceNumber} (${currencySymbol}${finalizedInvoice.total}).`,
      });
    } else {
      updated = [finalizedInvoice, ...invoices];
      addToast('success', 'Invoice Issued', `Invoice ${finalizedInvoice.invoiceNumber} generated.`);
      recordAuditLog({
        userName: team[0]?.name || 'Admin',
        action: 'Invoice Created',
        entityType: 'Invoice',
        entityId: finalizedInvoice.id,
        details: `Issued invoice ${finalizedInvoice.invoiceNumber} to ${finalizedInvoice.clientCompany} (${currencySymbol}${finalizedInvoice.total}).`,
      });
    }

    setInvoices(updated);
    saveInvoices(updated);
    setAuditLogs(getStoredAuditLogs());
    setIsCreatingInvoice(false);
    setEditingInvoice(null);
    setActiveTab('invoices');
  };

  const handleMarkInvoicePaid = (invoiceId: string, method: string = 'Bank Transfer') => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return;

    const updated = invoices.map((inv) => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          status: 'paid' as const,
          paidAmount: inv.total,
          balanceDue: 0,
          paidAt: new Date().toISOString().slice(0, 10),
          paymentMethod: method,
        };
      }
      return inv;
    });

    setInvoices(updated);
    saveInvoices(updated);

    // Record into Payments Ledger automatically
    const newPayment: Payment = {
      id: `PAY-${Date.now()}`,
      documentType: 'invoice',
      documentId: target.id,
      documentNumber: target.invoiceNumber,
      customerId: target.clientId,
      customerName: target.clientName,
      customerCompany: target.clientCompany,
      amount: target.total - (target.paidAmount || 0),
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: method as any,
      referenceNumber: `REC-${Date.now().toString().slice(-6)}`,
      notes: `Settled in full via ${method}`,
      createdAt: new Date().toISOString(),
    };

    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    savePayments(updatedPayments);

    if (viewingInvoice && viewingInvoice.id === invoiceId) {
      setViewingInvoice({
        ...viewingInvoice,
        status: 'paid',
        paidAmount: target.total,
        balanceDue: 0,
        paidAt: new Date().toISOString().slice(0, 10),
        paymentMethod: method,
      });
    }

    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Payment Recorded',
      entityType: 'Payment',
      entityId: newPayment.id,
      details: `Settled full payment of ${currencySymbol}${newPayment.amount} for invoice ${target.invoiceNumber}.`,
    });
    setAuditLogs(getStoredAuditLogs());

    addToast('success', 'Payment Settled', `Invoice ${target.invoiceNumber} recorded as paid via ${method}.`);
  };

  const handleDuplicateInvoice = (invoice: Invoice) => {
    const today = new Date();
    let calculatedDueDate = invoice.dueDate || today.toISOString().slice(0, 10);
    if (invoice.paymentTermsDays !== undefined) {
      const dueObj = new Date(today);
      dueObj.setDate(dueObj.getDate() + invoice.paymentTermsDays);
      calculatedDueDate = dueObj.toISOString().slice(0, 10);
    }

    const duplicated: Invoice = {
      ...invoice,
      id: `inv-${Date.now()}`,
      invoiceNumber: generateNextInvoiceNumber(invoices.length, undefined, settings.invoicePrefix),
      issueDate: today.toISOString().slice(0, 10),
      dueDate: calculatedDueDate,
      status: 'draft',
      paidAmount: 0,
      balanceDue: invoice.total,
      paidAt: undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [duplicated, ...invoices];
    setInvoices(updated);
    saveInvoices(updated);
    addToast('info', 'Invoice Duplicated', `Draft ${duplicated.invoiceNumber} created.`);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    const target = invoices.find((i) => i.id === invoiceId);
    const updated = invoices.filter((i) => i.id !== invoiceId);
    setInvoices(updated);
    saveInvoices(updated);

    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Invoice Deleted',
      entityType: 'Invoice',
      entityId: invoiceId,
      details: `Deleted invoice ${target?.invoiceNumber || invoiceId}.`,
    });
    setAuditLogs(getStoredAuditLogs());

    addToast('info', 'Invoice Deleted', 'Invoice removed from ledger.');
  };

  // --------------------------------------------------------------------------
  // BILL HANDLERS
  // --------------------------------------------------------------------------
  const handleSaveBill = (bill: Bill, recordedPaymentAmount?: number) => {
    let updated: Bill[];
    const exists = bills.some((b) => b.id === bill.id);

    if (exists) {
      updated = bills.map((b) => (b.id === bill.id ? bill : b));
      addToast('success', 'Bill Updated', `Bill ${bill.billNumber} updated.`);
      recordAuditLog({
        userName: team[0]?.name || 'Admin',
        action: 'Bill Updated',
        entityType: 'Bill',
        entityId: bill.id,
        details: `Updated sales bill ${bill.billNumber} (${currencySymbol}${bill.total}).`,
      });
    } else {
      updated = [bill, ...bills];
      addToast('success', 'Bill Issued', `Sales bill ${bill.billNumber} created.`);
      recordAuditLog({
        userName: team[0]?.name || 'Admin',
        action: 'Bill Created',
        entityType: 'Bill',
        entityId: bill.id,
        details: `Created bill ${bill.billNumber} for ${bill.customerCompany || bill.customerName} (${currencySymbol}${bill.total}).`,
      });

      // If initial payment was made with the bill creation, record it in payment ledger
      if (recordedPaymentAmount && recordedPaymentAmount > 0) {
        const newPayment: Payment = {
          id: `PAY-${Date.now()}`,
          documentType: 'bill',
          documentId: bill.id,
          documentNumber: bill.billNumber,
          customerId: bill.customerId,
          customerName: bill.customerName,
          customerCompany: bill.customerCompany,
          amount: recordedPaymentAmount,
          paymentDate: bill.billDate,
          paymentMethod: bill.paymentMethod,
          referenceNumber: `POS-${Date.now().toString().slice(-6)}`,
          notes: 'Immediate settlement upon bill issuance',
          createdAt: new Date().toISOString(),
        };

        const updatedPayments = [newPayment, ...payments];
        setPayments(updatedPayments);
        savePayments(updatedPayments);
      }
    }

    setBills(updated);
    saveBills(updated);
    setAuditLogs(getStoredAuditLogs());
    setIsCreatingBill(false);
    setEditingBill(null);
    setActiveTab('bills');
  };

  const handleDuplicateBill = (bill: Bill) => {
    const today = new Date().toISOString().slice(0, 10);
    const duplicated: Bill = {
      ...bill,
      id: `bill-${Date.now()}`,
      billNumber: generateNextBillNumber(bills.length, undefined, settings.billPrefix),
      billDate: today,
      dueDate: today,
      paymentStatus: 'unpaid',
      paidAmount: 0,
      balanceDue: bill.total,
      createdAt: new Date().toISOString(),
    };

    const updated = [duplicated, ...bills];
    setBills(updated);
    saveBills(updated);
    addToast('info', 'Bill Duplicated', `Created bill ${duplicated.billNumber}.`);
  };

  const handleDeleteBill = (billId: string) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    const target = bills.find((b) => b.id === billId);
    const updated = bills.filter((b) => b.id !== billId);
    setBills(updated);
    saveBills(updated);

    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Bill Deleted',
      entityType: 'Bill',
      entityId: billId,
      details: `Deleted bill ${target?.billNumber || billId}.`,
    });
    setAuditLogs(getStoredAuditLogs());

    addToast('info', 'Bill Deleted', 'Sales bill removed.');
  };

  // --------------------------------------------------------------------------
  // PAYMENT HANDLERS
  // --------------------------------------------------------------------------
  const handleSavePayment = (payment: Payment) => {
    // 1. Add to payments ledger
    const updatedPayments = [payment, ...payments];
    setPayments(updatedPayments);
    savePayments(updatedPayments);

    // 2. Update the settled document balance & status
    if (payment.documentType === 'invoice') {
      const updatedInvoices = invoices.map((inv) => {
        if (inv.id === payment.documentId) {
          const newPaid = (inv.paidAmount || 0) + payment.amount;
          const newBalance = Math.max(0, inv.total - newPaid);
          const newStatus = newBalance <= 0 ? ('paid' as const) : ('sent' as const);

          return {
            ...inv,
            paidAmount: newPaid,
            balanceDue: newBalance,
            status: newStatus,
            paidAt: newStatus === 'paid' ? payment.paymentDate : inv.paidAt,
            paymentMethod: payment.paymentMethod,
          };
        }
        return inv;
      });
      setInvoices(updatedInvoices);
      saveInvoices(updatedInvoices);
    } else {
      const updatedBills = bills.map((b) => {
        if (b.id === payment.documentId) {
          const newPaid = (b.paidAmount || 0) + payment.amount;
          const newBalance = Math.max(0, b.total - newPaid);
          const newStatus = newBalance <= 0 ? ('paid' as const) : ('partially_paid' as const);

          return {
            ...b,
            paidAmount: newPaid,
            balanceDue: newBalance,
            paymentStatus: newStatus,
            paymentMethod: payment.paymentMethod,
          };
        }
        return b;
      });
      setBills(updatedBills);
      saveBills(updatedBills);
    }

    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Payment Logged',
      entityType: 'Payment',
      entityId: payment.id,
      details: `Logged ${currencySymbol}${payment.amount} via ${payment.paymentMethod} for ${payment.documentType} ${payment.documentNumber}.`,
    });
    setAuditLogs(getStoredAuditLogs());

    addToast('success', 'Payment Recorded', `Recorded ${currencySymbol}${payment.amount} for ${payment.documentNumber}.`);
  };

  const handleDeletePayment = (paymentId: string) => {
    if (!window.confirm('Are you sure you want to remove this payment entry?')) return;
    const target = payments.find((p) => p.id === paymentId);
    const updated = payments.filter((p) => p.id !== paymentId);
    setPayments(updated);
    savePayments(updated);

    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Payment Deleted',
      entityType: 'Payment',
      entityId: paymentId,
      details: `Deleted payment receipt ${paymentId} (${currencySymbol}${target?.amount}).`,
    });
    setAuditLogs(getStoredAuditLogs());

    addToast('info', 'Payment Removed', 'Payment entry deleted.');
  };

  // --------------------------------------------------------------------------
  // PRODUCT CATALOG HANDLERS
  // --------------------------------------------------------------------------
  const handleAddProduct = (prod: Product) => {
    const updated = [prod, ...products];
    setProducts(updated);
    saveProducts(updated);
    addToast('success', 'Product Created', `Added ${prod.name} to catalog.`);
  };

  const handleUpdateProduct = (prod: Product) => {
    const updated = products.map((p) => (p.id === prod.id ? prod : p));
    setProducts(updated);
    saveProducts(updated);
    addToast('success', 'Product Updated', `${prod.name} saved.`);
  };

  const handleDeleteProduct = (productId: string) => {
    if (!window.confirm('Delete this product/service from the catalog?')) return;
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    saveProducts(updated);
    addToast('info', 'Product Removed', 'Catalog item deleted.');
  };

  // --------------------------------------------------------------------------
  // EXPENSE HANDLERS
  // --------------------------------------------------------------------------
  const handleAddExpense = (exp: Expense) => {
    const updated = [exp, ...expenses];
    setExpenses(updated);
    saveExpenses(updated);
    addToast('success', 'Expense Logged', `Recorded ${exp.category} (${currencySymbol}${exp.amount}).`);
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (!window.confirm('Delete this expense?')) return;
    const updated = expenses.filter((e) => e.id !== expenseId);
    setExpenses(updated);
    saveExpenses(updated);
    addToast('info', 'Expense Deleted', 'Expense entry removed.');
  };

  // --------------------------------------------------------------------------
  // CLIENT HANDLERS
  // --------------------------------------------------------------------------
  const handleAddClient = (client: Client) => {
    const updated = [client, ...clients];
    setClients(updated);
    saveClients(updated);
    addToast('success', 'Customer Added', `${client.company} saved in CRM.`);
  };

  const handleUpdateClient = (client: Client) => {
    const updated = clients.map((c) => (c.id === client.id ? client : c));
    setClients(updated);
    saveClients(updated);
    addToast('success', 'Customer Updated', `${client.company} profile updated.`);
  };

  const handleDeleteClient = (clientId: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    const updated = clients.filter((c) => c.id !== clientId);
    setClients(updated);
    saveClients(updated);
    addToast('info', 'Customer Deleted', 'Customer removed from CRM.');
  };

  // --------------------------------------------------------------------------
  // QUOTE & SUBSCRIPTION HANDLERS
  // --------------------------------------------------------------------------
  const handleAddQuote = (quote: Quote) => {
    const updated = [quote, ...quotes];
    setQuotes(updated);
    saveQuotes(updated);
    addToast('success', 'Quote Created', `Quotation ${quote.quoteNumber} issued.`);
  };

  const handleConvertQuoteToInvoice = (quote: Quote) => {
    const payTerms = settings.defaultPaymentTermsDays !== undefined ? settings.defaultPaymentTermsDays : 15;
    const today = new Date();
    const dueObj = new Date(today);
    dueObj.setDate(dueObj.getDate() + payTerms);

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: generateNextInvoiceNumber(invoices.length, undefined, settings.invoicePrefix),
      clientId: quote.clientId,
      clientName: quote.clientName,
      clientCompany: quote.clientCompany,
      clientEmail: quote.clientEmail,
      clientAddress: 'Billed from approved proposal quote',
      issueDate: today.toISOString().slice(0, 10),
      dueDate: dueObj.toISOString().slice(0, 10),
      paymentTermsDays: payTerms,
      items: quote.items,
      subtotal: quote.subtotal,
      taxTotal: quote.taxTotal,
      discountRate: quote.discountRate,
      discountTotal: quote.discountTotal,
      shippingFee: 0,
      total: quote.total,
      paidAmount: 0,
      balanceDue: quote.total,
      status: 'sent',
      notes: quote.notes,
      terms: quote.terms,
      currency: quote.currency,
      createdAt: new Date().toISOString(),
    };

    const updatedQuotes = quotes.map((q) => (q.id === quote.id ? { ...q, status: 'converted' as const } : q));
    setQuotes(updatedQuotes);
    saveQuotes(updatedQuotes);

    const updatedInvoices = [newInvoice, ...invoices];
    setInvoices(updatedInvoices);
    saveInvoices(updatedInvoices);

    setEditingInvoice(newInvoice);
    setActiveTab('invoices');
    addToast('success', 'Quote Converted', `Converted ${quote.quoteNumber} into active invoice.`);
  };

  const handleDeleteQuote = (quoteId: string) => {
    const updated = quotes.filter((q) => q.id !== quoteId);
    setQuotes(updated);
    saveQuotes(updated);
    addToast('info', 'Quote Deleted', 'Quote removed.');
  };

  const handleUpdateSubscription = (updatedSub: SaaSSubscriptionState) => {
    setSubscription(updatedSub);
    saveSubscription(updatedSub);
    addToast('success', 'Plan Updated', `Switched to ${updatedSub.currentPlanId.toUpperCase()} tier.`);
  };

  // --------------------------------------------------------------------------
  // TEAM & SETTINGS HANDLERS
  // --------------------------------------------------------------------------
  const handleAddTeamMember = (member: TeamMember) => {
    const updated = [member, ...team];
    setTeam(updated);
    saveTeam(updated);
    addToast('success', 'Member Invited', `Invited ${member.name} as ${member.role}.`);
  };

  const handleDeleteTeamMember = (memberId: string) => {
    const updated = team.filter((m) => m.id !== memberId);
    setTeam(updated);
    saveTeam(updated);
    addToast('info', 'Member Removed', 'Team member access revoked.');
  };

  const handleSaveSettings = (newSettings: BusinessSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    addToast('success', 'Settings Saved', 'Business branding and preferences saved.');
  };

  const handleWipeEntireWebsite = () => {
    const wiped = wipeEntireWebsite();
    setInvoices(wiped.invoices);
    setBills(wiped.bills);
    setClients(wiped.clients);
    setProducts(wiped.products);
    setPayments(wiped.payments);
    setExpenses(wiped.expenses);
    setQuotes(wiped.quotes);
    setRecurring(wiped.recurring);
    setTeam(wiped.team);
    setAuditLogs(wiped.auditLogs);
    setSettings(wiped.settings);
    setSubscription(wiped.subscription);
    setViewingInvoice(null);
    setEditingInvoice(null);
    setIsCreatingInvoice(false);
    setViewingBill(null);
    setEditingBill(null);
    setIsCreatingBill(false);
    addToast('info', 'System Reset', 'All records cleared and company profile set to blank.');
  };

  const handleRestoreDemoData = () => {
    const demo = resetToDemoData();
    setInvoices(demo.invoices);
    setBills(demo.bills);
    setClients(demo.clients);
    setProducts(demo.products);
    setPayments(demo.payments);
    setExpenses(demo.expenses);
    setQuotes(demo.quotes);
    setRecurring(demo.recurring);
    setTeam(demo.team);
    setAuditLogs(demo.auditLogs);
    setSettings(demo.settings);
    setSubscription(demo.subscription);
    addToast('success', 'Demo Data Restored', 'Loaded sample enterprise invoices, bills, payments, and agency settings.');
  };

  // --------------------------------------------------------------------------
  // MAIN CONTENT ROUTER
  // --------------------------------------------------------------------------
  const renderMainContent = () => {
    if (isCreatingInvoice || editingInvoice) {
      return (
        <InvoiceEditor
          invoiceToEdit={editingInvoice}
          clients={clients}
          products={products}
          settings={settings}
          onSave={handleSaveInvoice}
          onAddClient={handleAddClient}
          onCancel={() => {
            setIsCreatingInvoice(false);
            setEditingInvoice(null);
          }}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            invoices={invoices}
            bills={bills}
            payments={payments}
            clients={clients}
            onNewInvoice={() => setIsCreatingInvoice(true)}
            onNewBill={() => {
              setEditingBill(null);
              setIsCreatingBill(true);
            }}
            onNewClient={() => setActiveTab('customers')}
            onNewQuote={() => setActiveTab('quotes')}
            onRecordPayment={() => {
              setPaymentInitialDoc(undefined);
              setIsRecordPaymentOpen(true);
            }}
            onViewInvoice={(inv) => setViewingInvoice(inv)}
            onViewBill={(b) => setViewingBill(b)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            currencySymbol={currencySymbol}
          />
        );

      case 'invoices':
        return (
          <InvoiceList
            invoices={invoices}
            onNewInvoice={() => setIsCreatingInvoice(true)}
            onViewInvoice={(inv) => setViewingInvoice(inv)}
            onEditInvoice={(inv) => setEditingInvoice(inv)}
            onMarkPaid={(id) => handleMarkInvoicePaid(id)}
            onDuplicateInvoice={(inv) => handleDuplicateInvoice(inv)}
            onDeleteInvoice={(id) => handleDeleteInvoice(id)}
          />
        );

      case 'bills':
        return (
          <BillList
            bills={bills}
            onNewBill={() => {
              setEditingBill(null);
              setIsCreatingBill(true);
            }}
            onViewBill={(b) => setViewingBill(b)}
            onEditBill={(b) => {
              setEditingBill(b);
              setIsCreatingBill(true);
            }}
            onDuplicateBill={(b) => handleDuplicateBill(b)}
            onDeleteBill={(id) => handleDeleteBill(id)}
            onRecordPayment={(b) => {
              setPaymentInitialDoc({ type: 'bill', id: b.id });
              setIsRecordPaymentOpen(true);
            }}
          />
        );

      case 'quotes':
        return (
          <QuotesList
            quotes={quotes}
            clients={clients}
            settings={settings}
            onConvertQuoteToInvoice={handleConvertQuoteToInvoice}
            onAddQuote={handleAddQuote}
            onDeleteQuote={handleDeleteQuote}
          />
        );

      case 'customers':
        return (
          <ClientList
            clients={clients}
            invoices={invoices}
            bills={bills}
            payments={payments}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
          />
        );

      case 'products':
        return (
          <ProductList
            products={products}
            settings={settings}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        );

      case 'payments':
        return (
          <PaymentList
            payments={payments}
            invoices={invoices}
            bills={bills}
            settings={settings}
            onOpenRecordPayment={() => {
              setPaymentInitialDoc(undefined);
              setIsRecordPaymentOpen(true);
            }}
            onDeletePayment={handleDeletePayment}
          />
        );

      case 'expenses':
        return (
          <ExpenseList
            expenses={expenses}
            settings={settings}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        );

      case 'reports':
        return (
          <ReportsView
            invoices={invoices}
            bills={bills}
            payments={payments}
            expenses={expenses}
            clients={clients}
            products={products}
            settings={settings}
          />
        );

      case 'billing':
        return (
          <SaaSBillingView
            subscription={subscription}
            settings={settings}
            invoicesCount={invoices.length}
            billsCount={bills.length}
            teamCount={team.length}
            onUpdateSubscription={handleUpdateSubscription}
          />
        );

      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onWipeEntireWebsite={handleWipeEntireWebsite}
            onClearInvoices={() => {
              clearAllInvoices();
              setInvoices([]);
            }}
            onClearClients={() => {
              clearAllClients();
              setClients([]);
            }}
            onClearQuotes={() => {
              clearAllQuotes();
              setQuotes([]);
            }}
            onClearRecurring={() => {
              clearAllRecurring();
              setRecurring([]);
            }}
            onRestoreDemoData={handleRestoreDemoData}
          />
        );

      case 'team':
        return (
          <TeamManagementView
            team={team}
            auditLogs={auditLogs}
            onAddMember={handleAddTeamMember}
            onDeleteMember={handleDeleteTeamMember}
          />
        );

      case 'help':
        return <HelpSupportView settings={settings} />;

      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.45rem' }}
            aria-label="Toggle Navigation Menu"
          >
            <Menu size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: '#ffffff', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/favicon.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {settings.companyName || 'HIGHPHAUS'}
            </span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.35rem 0.5rem' }}
          title="Switch Theme"
        >
          {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </header>

      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`mobile-drawer-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setIsCreatingInvoice(false);
          setEditingInvoice(null);
          setIsCreatingBill(false);
          setEditingBill(null);
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        onNewInvoice={() => {
          setEditingInvoice(null);
          setIsCreatingInvoice(true);
          setIsMobileMenuOpen(false);
        }}
        onNewBill={() => {
          setEditingBill(null);
          setIsCreatingBill(true);
          setIsMobileMenuOpen(false);
        }}
        theme={theme}
        toggleTheme={toggleTheme}
        companyName={settings.companyName}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="main-content">{renderMainContent()}</main>

      {/* Printable Invoice Modal */}
      {viewingInvoice && (
        <InvoiceViewModal
          invoice={viewingInvoice}
          settings={settings}
          onClose={() => setViewingInvoice(null)}
          onMarkPaid={(id, method) => handleMarkInvoicePaid(id, method)}
        />
      )}

      {/* Bill Editor Modal */}
      {isCreatingBill && (
        <BillEditorModal
          billToEdit={editingBill}
          clients={clients}
          products={products}
          settings={settings}
          billsCount={bills.length}
          onSave={handleSaveBill}
          onClose={() => {
            setIsCreatingBill(false);
            setEditingBill(null);
          }}
        />
      )}

      {/* Printable Bill Modal */}
      {viewingBill && (
        <BillViewModal
          bill={viewingBill}
          settings={settings}
          onClose={() => setViewingBill(null)}
          onRecordPayment={(b) => {
            setPaymentInitialDoc({ type: 'bill', id: b.id });
            setIsRecordPaymentOpen(true);
          }}
        />
      )}

      {/* Record Payment Modal */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          invoices={invoices}
          bills={bills}
          settings={settings}
          paymentsCount={payments.length}
          initialDocument={paymentInitialDoc}
          onSavePayment={handleSavePayment}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            setPaymentInitialDoc(undefined);
          }}
        />
      )}

      {/* Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
