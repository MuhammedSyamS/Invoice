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
import { EnterpriseAnalyticsView } from './components/EnterpriseAnalyticsView';
import { SaaSBillingView } from './components/SaaSBillingView';
import { QuotesList } from './components/QuotesList';
import { SettingsView } from './components/SettingsView';
import { TeamManagementView } from './components/TeamManagementView';
import { HelpSupportView } from './components/HelpSupportView';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import type { InitialPaymentPayload } from './components/InvoiceEditor';
import { Menu, Sun, Moon, LayoutDashboard, FileText, Receipt, Users } from 'lucide-react';

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
  Category,
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
  getStoredCategories,
  saveCategories,
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategory,
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
import { deriveInvoiceFinancials, deriveBillFinancials } from './services/calculationEngine';
import { apiService } from './services/apiService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core App State using lazy initializers
  const [invoices, setInvoices] = useState<Invoice[]>(() => getStoredInvoices());
  const [bills, setBills] = useState<Bill[]>(() => getStoredBills());
  const [clients, setClients] = useState<Client[]>(() => getStoredClients());
  const [products, setProducts] = useState<Product[]>(() => getStoredProducts());
  const [categories, setCategories] = useState<Category[]>(() => getStoredCategories());
  const [payments, setPayments] = useState<Payment[]>(() => getStoredPayments());
  const [expenses, setExpenses] = useState<Expense[]>(() => getStoredExpenses());
  const [quotes, setQuotes] = useState<Quote[]>(() => getStoredQuotes());
  const [_recurring, setRecurring] = useState<RecurringTemplate[]>(() => getStoredRecurring());
  const [settings, setSettings] = useState<BusinessSettings>(() => getStoredSettings());
  const [subscription, setSubscription] = useState<SaaSSubscriptionState>(() => getStoredSubscription());
  const [team, setTeam] = useState<TeamMember[]>(() => getStoredTeam());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => getStoredAuditLogs());

  // Cloud Database (MongoDB) Sync on Mount
  useEffect(() => {
    let isMounted = true;
    const syncCloudData = async () => {
      try {
        const cloudRes = await apiService.getCloudData();
        if (!isMounted) return;

        if (cloudRes?.success && cloudRes.data) {
          const cloud = cloudRes.data;
          const hasCloudData =
            (Array.isArray(cloud.invoices) && cloud.invoices.length > 0) ||
            (Array.isArray(cloud.clients) && cloud.clients.length > 0);

          if (hasCloudData) {
            // Load payments first — they are the authoritative source of truth for all balances
            const cloudPayments = Array.isArray(cloud.payments) && cloud.payments.length > 0
              ? cloud.payments
              : [];
            if (cloudPayments.length) {
              setPayments(cloudPayments);
              savePayments(cloudPayments);
            }

            // Re-derive invoice financials from the payment ledger to prevent
            // stale paidAmount / balanceDue stored in MongoDB from causing balance inflation
            if (cloud.invoices?.length) {
              const recalculated = cloud.invoices.map((inv: Invoice) => {
                const derived = deriveInvoiceFinancials(inv, cloudPayments);
                return {
                  ...inv,
                  paidAmount: derived.paidAmount,
                  balanceDue: derived.balanceDue,
                  status: derived.status,
                };
              });
              setInvoices(recalculated);
              saveInvoices(recalculated);
            }

            // Re-derive bill financials from the payment ledger
            if (cloud.bills?.length) {
              const recalcBills = cloud.bills.map((b: Bill) => {
                const derived = deriveBillFinancials(b, cloudPayments);
                return {
                  ...b,
                  paidAmount: derived.paidAmount,
                  balanceDue: derived.balanceDue,
                  paymentStatus: derived.status,
                };
              });
              setBills(recalcBills);
              saveBills(recalcBills);
            }

            if (cloud.clients?.length) {
              setClients(cloud.clients);
              saveClients(cloud.clients);
            }
            if (cloud.products?.length) {
              setProducts(cloud.products);
              saveProducts(cloud.products);
            }
            if (cloud.categories?.length) {
              setCategories(cloud.categories);
              saveCategories(cloud.categories);
            }
            if (cloud.expenses?.length) {
              setExpenses(cloud.expenses);
              saveExpenses(cloud.expenses);
            }
            if (cloud.settings) {
              setSettings(cloud.settings);
              saveSettings(cloud.settings);
            }
          } else {
            // First time connection with empty MongoDB database: seed initial data
            await apiService.seedCloudData({
              invoices: getStoredInvoices(),
              bills: getStoredBills(),
              clients: getStoredClients(),
              products: getStoredProducts(),
              categories: getStoredCategories(),
              payments: getStoredPayments(),
              expenses: getStoredExpenses(),
              settings: getStoredSettings(),
            });
          }
        }
      } catch (err) {
        console.warn('[MongoDB] Sync initial check completed with local cache.', err);
      }
    };

    syncCloudData();
    return () => {
      isMounted = false;
    };
  }, []);

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
  const handleSaveInvoice = (invoice: Invoice, initialPayment?: InitialPaymentPayload) => {
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

    let currentPayments = [...payments];
    const exists = invoices.some((i) => i.id === finalizedInvoice.id);

    // Handle advance payment record in payment ledger (creation, update, or removal)
    if (initialPayment !== undefined) {
      const existingAdvanceIndex = currentPayments.findIndex(
        (p) =>
          p.documentType === 'invoice' &&
          (p.documentId === finalizedInvoice.id || (finalizedInvoice.invoiceNumber && p.documentNumber === finalizedInvoice.invoiceNumber)) &&
          p.isAdvance
      );

      if (initialPayment.amount > 0) {
        if (existingAdvanceIndex !== -1) {
          // Update the existing advance payment record in the ledger
          currentPayments[existingAdvanceIndex] = {
            ...currentPayments[existingAdvanceIndex],
            amount: initialPayment.amount,
            paymentDate: initialPayment.paymentDate,
            paymentMethod: initialPayment.paymentMethod,
            referenceNumber: initialPayment.referenceNumber || currentPayments[existingAdvanceIndex].referenceNumber,
            notes: initialPayment.notes || currentPayments[existingAdvanceIndex].notes,
            customerId: finalizedInvoice.clientId,
            customerName: finalizedInvoice.clientName,
            customerCompany: finalizedInvoice.clientCompany,
          };
          setPayments(currentPayments);
          savePayments(currentPayments);

          recordAuditLog({
            userName: team[0]?.name || 'Admin',
            action: 'Payment Updated',
            entityType: 'Payment',
            entityId: currentPayments[existingAdvanceIndex].id,
            details: `Updated advance payment to ${currencySymbol}${initialPayment.amount} for invoice ${finalizedInvoice.invoiceNumber}.`,
          });
        } else {
          // Add newly recorded advance payment to the ledger
          const advancePayment: Payment = {
            id: `PAY-${Date.now()}`,
            documentType: 'invoice',
            documentId: finalizedInvoice.id,
            documentNumber: finalizedInvoice.invoiceNumber,
            customerId: finalizedInvoice.clientId,
            customerName: finalizedInvoice.clientName,
            customerCompany: finalizedInvoice.clientCompany,
            amount: initialPayment.amount,
            paymentDate: initialPayment.paymentDate,
            paymentMethod: initialPayment.paymentMethod,
            referenceNumber: initialPayment.referenceNumber || `ADV-${Date.now().toString().slice(-6)}`,
            notes: initialPayment.notes || 'Advance deposit recorded upon invoice issuance',
            isAdvance: true,
            recordedBy: team[0]?.name || 'Admin',
            createdAt: new Date().toISOString(),
          };

          currentPayments = [advancePayment, ...currentPayments];
          setPayments(currentPayments);
          savePayments(currentPayments);

          recordAuditLog({
            userName: team[0]?.name || 'Admin',
            action: 'Payment Recorded',
            entityType: 'Payment',
            entityId: advancePayment.id,
            details: `Recorded advance payment of ${currencySymbol}${advancePayment.amount} for invoice ${finalizedInvoice.invoiceNumber} via ${advancePayment.paymentMethod}.`,
          });
        }
      } else if (existingAdvanceIndex !== -1) {
        // User unchecked or cleared advance payment - remove it from the ledger
        const removedPayment = currentPayments[existingAdvanceIndex];
        currentPayments = currentPayments.filter((_, idx) => idx !== existingAdvanceIndex);
        setPayments(currentPayments);
        savePayments(currentPayments);

        recordAuditLog({
          userName: team[0]?.name || 'Admin',
          action: 'Payment Deleted',
          entityType: 'Payment',
          entityId: removedPayment.id,
          details: `Cleared advance payment for invoice ${finalizedInvoice.invoiceNumber}.`,
        });
      }
    }

    // Authoritative financial calculation from payment ledger
    const derived = deriveInvoiceFinancials(finalizedInvoice, currentPayments);
    finalizedInvoice.paidAmount = derived.paidAmount;
    finalizedInvoice.balanceDue = derived.balanceDue;
    finalizedInvoice.status = derived.status;
    finalizedInvoice.advancePaymentAmount = initialPayment && initialPayment.amount > 0 ? initialPayment.amount : undefined;
    let updated: Invoice[];
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
    apiService.saveInvoice(finalizedInvoice);
    setAuditLogs(getStoredAuditLogs());
    setIsCreatingInvoice(false);
    setEditingInvoice(null);
    setActiveTab('invoices');
  };

  const handleMarkInvoicePaid = (invoiceId: string, method: string = 'Bank Transfer') => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return;

    const curPaid = target.paidAmount || 0;
    const remainingToPay = Math.max(0, target.total - curPaid);
    if (remainingToPay <= 0) {
      addToast('info', 'Already Settled', `Invoice ${target.invoiceNumber} is already fully settled.`);
      return;
    }

    // Record into Payments Ledger automatically
    const newPayment: Payment = {
      id: `PAY-${Date.now()}`,
      documentType: 'invoice',
      documentId: target.id,
      documentNumber: target.invoiceNumber,
      customerId: target.clientId,
      customerName: target.clientName,
      customerCompany: target.clientCompany,
      amount: remainingToPay,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: method as any,
      referenceNumber: `REC-${Date.now().toString().slice(-6)}`,
      notes: `Settled in full via ${method}`,
      recordedBy: team[0]?.name || 'Admin',
      createdAt: new Date().toISOString(),
    };

    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    savePayments(updatedPayments);

    const derived = deriveInvoiceFinancials(target, updatedPayments);

    const updated = invoices.map((inv) => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          status: derived.status,
          paidAmount: derived.paidAmount,
          balanceDue: derived.balanceDue,
          paidAt: newPayment.paymentDate,
          paymentMethod: method,
        };
      }
      return inv;
    });

    setInvoices(updated);
    saveInvoices(updated);

    if (viewingInvoice && viewingInvoice.id === invoiceId) {
      setViewingInvoice({
        ...viewingInvoice,
        status: derived.status,
        paidAmount: derived.paidAmount,
        balanceDue: derived.balanceDue,
        paidAt: newPayment.paymentDate,
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
    apiService.deleteInvoice(invoiceId);

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
        apiService.savePayment(newPayment as any);
      }
    }

    setBills(updated);
    saveBills(updated);
    apiService.saveBill(bill);
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
    apiService.saveBill(duplicated);
    addToast('info', 'Bill Duplicated', `Created bill ${duplicated.billNumber}.`);
  };

  const handleDeleteBill = (billId: string) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    const target = bills.find((b) => b.id === billId);
    const updated = bills.filter((b) => b.id !== billId);
    setBills(updated);
    saveBills(updated);
    apiService.deleteBill(billId);

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
    apiService.savePayment(payment as any);

    // 2. Authoritatively recalculate document balances & status
    if (payment.documentType === 'invoice') {
      const updatedInvoices = invoices.map((inv) => {
        if (inv.id === payment.documentId) {
          const derived = deriveInvoiceFinancials(inv, updatedPayments);
          return {
            ...inv,
            paidAmount: derived.paidAmount,
            balanceDue: derived.balanceDue,
            status: derived.status,
            paidAt: derived.status === 'paid' ? payment.paymentDate : inv.paidAt,
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
          const derived = deriveBillFinancials(b, updatedPayments);
          return {
            ...b,
            paidAmount: derived.paidAmount,
            balanceDue: derived.balanceDue,
            paymentStatus: derived.status,
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
    const target = payments.find((p) => p.id === paymentId);
    if (!target) return;
    if (!window.confirm(`Are you sure you want to reverse / delete payment ${target.id} (${currencySymbol}${target.amount})? This will automatically restore the document's outstanding balance.`)) return;

    const nextPayments = payments.filter((p) => p.id !== paymentId);
    setPayments(nextPayments);
    savePayments(nextPayments);
    apiService.deletePayment(paymentId);

    if (target.documentType === 'invoice') {
      const updatedInvoices = invoices.map((inv) => {
        if (inv.id === target.documentId) {
          const derived = deriveInvoiceFinancials(inv, nextPayments);
          return {
            ...inv,
            paidAmount: derived.paidAmount,
            balanceDue: derived.balanceDue,
            status: derived.status,
          };
        }
        return inv;
      });
      setInvoices(updatedInvoices);
      saveInvoices(updatedInvoices);
    } else {
      const updatedBills = bills.map((b) => {
        if (b.id === target.documentId) {
          const derived = deriveBillFinancials(b, nextPayments);
          return {
            ...b,
            paidAmount: derived.paidAmount,
            balanceDue: derived.balanceDue,
            paymentStatus: derived.status,
          };
        }
        return b;
      });
      setBills(updatedBills);
      saveBills(updatedBills);
    }

    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Payment Deleted',
      entityType: 'Payment',
      entityId: paymentId,
      details: `Reversed payment receipt ${paymentId} (${currencySymbol}${target.amount}). Restored outstanding balance for ${target.documentType} ${target.documentNumber}.`,
    });
    setAuditLogs(getStoredAuditLogs());

    addToast('info', 'Payment Reversed', `Payment reversed. Balance restored on ${target.documentNumber}.`);
  };

  // --------------------------------------------------------------------------
  // CATEGORY & SERVICE HANDLERS
  // --------------------------------------------------------------------------
  const handleCreateCategory = (catData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCat = createCategory(catData);
    setCategories(getStoredCategories());
    apiService.saveCategory(newCat);
    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Category Created',
      entityType: 'Category',
      entityId: newCat.id,
      details: `Created custom service category "${newCat.name}".`,
    });
    setAuditLogs(getStoredAuditLogs());
    addToast('success', 'Category Created', `Added category "${newCat.name}".`);
  };

  const handleUpdateCategory = (cat: Category) => {
    updateCategory(cat.id, cat);
    setCategories(getStoredCategories());
    apiService.saveCategory(cat);
    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Category Updated',
      entityType: 'Category',
      entityId: cat.id,
      details: `Updated service category "${cat.name}".`,
    });
    setAuditLogs(getStoredAuditLogs());
    addToast('success', 'Category Updated', `Category "${cat.name}" updated.`);
  };

  const handleArchiveCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    archiveCategory(catId);
    setCategories(getStoredCategories());
    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Category Archived',
      entityType: 'Category',
      entityId: catId,
      details: `Archived category "${cat?.name || catId}". Historical invoices remain preserved.`,
    });
    setAuditLogs(getStoredAuditLogs());
    addToast('info', 'Category Archived', `Category "${cat?.name || 'Category'}" archived.`);
  };

  const handleRestoreCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    restoreCategory(catId);
    setCategories(getStoredCategories());
    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Category Restored',
      entityType: 'Category',
      entityId: catId,
      details: `Restored category "${cat?.name || catId}".`,
    });
    setAuditLogs(getStoredAuditLogs());
    addToast('success', 'Category Restored', `Category "${cat?.name || 'Category'}" is now active.`);
  };

  const handleDeleteCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    const updated = categories.filter((c) => c.id !== catId);
    setCategories(updated);
    saveCategories(updated);
    apiService.deleteCategory(catId);
    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Category Deleted',
      entityType: 'Category',
      entityId: catId,
      details: `Deleted service category "${cat?.name || catId}".`,
    });
    setAuditLogs(getStoredAuditLogs());
    addToast('info', 'Category Deleted', `Category "${cat?.name || 'Category'}" deleted.`);
  };

  // --------------------------------------------------------------------------
  // PRODUCT CATALOG HANDLERS
  // --------------------------------------------------------------------------
  const handleAddProduct = (prod: Product) => {
    const updated = [prod, ...products];
    setProducts(updated);
    saveProducts(updated);
    apiService.saveProduct(prod);
    addToast('success', 'Product Created', `Added ${prod.name} to catalog.`);
  };

  const handleUpdateProduct = (prod: Product) => {
    const updated = products.map((p) => (p.id === prod.id ? prod : p));
    setProducts(updated);
    saveProducts(updated);
    apiService.saveProduct(prod);
    addToast('success', 'Product Updated', `${prod.name} saved.`);
  };

  const handleDeleteProduct = (productId: string) => {
    if (!window.confirm('Delete this product/service from the catalog?')) return;
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    saveProducts(updated);
    apiService.deleteProduct(productId);
    addToast('info', 'Product Removed', 'Catalog item deleted.');
  };

  // --------------------------------------------------------------------------
  // EXPENSE HANDLERS
  // --------------------------------------------------------------------------
  const handleAddExpense = (exp: Expense) => {
    const updated = [exp, ...expenses];
    setExpenses(updated);
    saveExpenses(updated);
    apiService.saveExpense(exp);
    addToast('success', 'Expense Logged', `Recorded ${exp.category} (${currencySymbol}${exp.amount}).`);
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (!window.confirm('Delete this expense?')) return;
    const updated = expenses.filter((e) => e.id !== expenseId);
    setExpenses(updated);
    saveExpenses(updated);
    apiService.deleteExpense(expenseId);
    addToast('info', 'Expense Deleted', 'Expense entry removed.');
  };

  // --------------------------------------------------------------------------
  // CLIENT HANDLERS
  // --------------------------------------------------------------------------
  const handleAddClient = (client: Client) => {
    const updated = [client, ...clients];
    setClients(updated);
    saveClients(updated);
    apiService.saveClient(client);
    addToast('success', 'Customer Added', `${client.company} saved in CRM.`);
  };

  const handleUpdateClient = (client: Client) => {
    const updated = clients.map((c) => (c.id === client.id ? client : c));
    setClients(updated);
    saveClients(updated);
    apiService.saveClient(client);
    addToast('success', 'Customer Updated', `${client.company} profile updated.`);
  };

  const handleDeleteClient = (clientId: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    const updated = clients.filter((c) => c.id !== clientId);
    setClients(updated);
    saveClients(updated);
    apiService.deleteClient(clientId);
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
    if (!window.confirm('Are you sure you want to delete this quote proposal? This action cannot be undone.')) return;
    const updated = quotes.filter((q) => q.id !== quoteId);
    setQuotes(updated);
    saveQuotes(updated);
    addToast('info', 'Quote Deleted', 'Quote proposal removed.');
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
    if (!window.confirm('Are you sure you want to revoke access and remove this team member?')) return;
    const updated = team.filter((m) => m.id !== memberId);
    setTeam(updated);
    saveTeam(updated);
    addToast('info', 'Member Removed', 'Team member access revoked.');
  };

  const handleSaveSettings = (newSettings: BusinessSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    apiService.saveSettings(newSettings);
    addToast('success', 'Settings Saved', 'Business branding and preferences saved.');
  };

  const handleWipeEntireWebsite = () => {
    const wiped = wipeEntireWebsite();
    setInvoices(wiped.invoices);
    setBills(wiped.bills);
    setClients(wiped.clients);
    setProducts(wiped.products);
    setCategories(wiped.categories || []);
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
    setCategories(demo.categories || getStoredCategories());
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
          categories={categories}
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

      case 'analytics':
        return (
          <EnterpriseAnalyticsView
            invoices={invoices}
            bills={bills}
            payments={payments}
            clients={clients}
            categories={categories}
            settings={settings}
            onViewInvoice={(inv) => setViewingInvoice(inv)}
            onViewBill={(b) => setViewingBill(b)}
          />
        );

      case 'invoices':
        return (
          <InvoiceList
            invoices={invoices}
            categories={categories}
            payments={payments}
            onNewInvoice={() => setIsCreatingInvoice(true)}
            onViewInvoice={(inv) => setViewingInvoice(inv)}
            onEditInvoice={(inv) => setEditingInvoice(inv)}
            onMarkPaid={(id) => handleMarkInvoicePaid(id)}
            onDuplicateInvoice={(inv) => handleDuplicateInvoice(inv)}
            onDeleteInvoice={(id) => handleDeleteInvoice(id)}
            onOpenRecordPayment={(inv) => {
              setPaymentInitialDoc({ type: 'invoice', id: inv.id });
              setIsRecordPaymentOpen(true);
            }}
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
            categories={categories}
            invoices={invoices}
            bills={bills}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onArchiveCategory={handleArchiveCategory}
            onRestoreCategory={handleRestoreCategory}
            onDeleteCategory={handleDeleteCategory}
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

  const showBottomNav = !isCreatingInvoice && !isCreatingBill && !viewingInvoice && !viewingBill && !isRecordPaymentOpen;

  return (
    <div className={`app-container ${showBottomNav ? 'has-mobile-bottom-nav' : ''}`}>
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
          payments={payments}
          categories={categories}
          onClose={() => setViewingInvoice(null)}
          onMarkPaid={(id, method) => handleMarkInvoicePaid(id, method)}
          onOpenRecordPayment={(inv) => {
            setPaymentInitialDoc({ type: 'invoice', id: inv.id });
            setIsRecordPaymentOpen(true);
          }}
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

      {/* Mobile App-like Bottom Navigation */}
      {showBottomNav && (
        <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              setIsMobileMenuOpen(false);
            }}
          >
            <LayoutDashboard size={20} />
            <span>Home</span>
          </button>

          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('invoices');
              setIsMobileMenuOpen(false);
            }}
          >
            <FileText size={20} />
            <span>Invoices</span>
          </button>

          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeTab === 'bills' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('bills');
              setIsMobileMenuOpen(false);
            }}
          >
            <Receipt size={20} />
            <span>Bills</span>
          </button>

          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('customers');
              setIsMobileMenuOpen(false);
            }}
          >
            <Users size={20} />
            <span>Clients</span>
          </button>

          <button
            type="button"
            className="mobile-bottom-nav-item"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={20} />
            <span>Menu</span>
          </button>
        </nav>
      )}

      {/* Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>

  );
};

export default App;
