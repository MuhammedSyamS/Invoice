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
import { AuthModal } from './components/AuthModal';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import type { InitialPaymentPayload } from './components/InvoiceEditor';
import { Menu, Sun, Moon, LayoutDashboard, FileText, Receipt, Users, User, LogOut } from 'lucide-react';

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
  AuthUser,
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
  getStoredExpenseCategories,
  getStoredQuotes,
  saveQuotes,
  getStoredRecurring,
  saveRecurring,
  getStoredSettings,
  saveSettings,
  getStoredSubscription,
  saveSubscription,
  getStoredTeam,
  saveTeam,
  getStoredAuditLogs,
  recordAuditLog,
  getStoredAuthUser,
  saveStoredAuthUser,
  getCurrencySymbol,
  generateNextInvoiceNumber,
  generateNextBillNumber,
} from './services/storageService';
import { deriveInvoiceFinancials, deriveBillFinancials } from './services/calculationEngine';
import { apiService } from './services/apiService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredAuthUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Core App State using lazy initializers
  const [invoices, setInvoices] = useState<Invoice[]>(() => getStoredInvoices());
  const [bills, setBills] = useState<Bill[]>(() => getStoredBills());
  const [clients, setClients] = useState<Client[]>(() => getStoredClients());
  const [products, setProducts] = useState<Product[]>(() => getStoredProducts());
  const [categories, setCategories] = useState<Category[]>(() => getStoredCategories());
  const [payments, setPayments] = useState<Payment[]>(() => getStoredPayments());
  const [expenses, setExpenses] = useState<Expense[]>(() => getStoredExpenses());
  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => getStoredExpenseCategories());
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

          // 1. Authoritative Payments Ledger from MongoDB
          const cloudPayments = Array.isArray(cloud.payments) ? cloud.payments : [];
          setPayments(cloudPayments);
          savePayments(cloudPayments);

          // 2. Invoices synced from MongoDB
          if (Array.isArray(cloud.invoices)) {
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

          // 3. Bills synced from MongoDB
          if (Array.isArray(cloud.bills)) {
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

          // 4. Clients synced from MongoDB
          if (Array.isArray(cloud.clients)) {
            setClients(cloud.clients);
            saveClients(cloud.clients);
          }

          // 5. Products synced from MongoDB
          if (Array.isArray(cloud.products)) {
            setProducts(cloud.products);
            saveProducts(cloud.products);
          }

          // 6. Categories synced from MongoDB
          if (Array.isArray(cloud.categories) && cloud.categories.length > 0) {
            setCategories(cloud.categories);
            saveCategories(cloud.categories);
          }

          // 7. Expenses synced from MongoDB
          if (Array.isArray(cloud.expenses)) {
            setExpenses(cloud.expenses);
            saveExpenses(cloud.expenses);
          }

          // 8. Settings synced from MongoDB
          if (cloud.settings && cloud.settings.companyName) {
            setSettings(cloud.settings);
            saveSettings(cloud.settings);
          }

          // 9. Quotes synced from MongoDB
          if (Array.isArray(cloud.quotes)) {
            setQuotes(cloud.quotes);
            saveQuotes(cloud.quotes);
          }

          // 10. Recurring retainers synced from MongoDB
          if (Array.isArray(cloud.recurring)) {
            setRecurring(cloud.recurring);
            saveRecurring(cloud.recurring);
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
  const handleSaveInvoice = async (invoice: Invoice, initialPayment?: InitialPaymentPayload) => {
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
        if (compName && c.company && String(c.company).trim().toLowerCase() === compName.toLowerCase()) {
          return true;
        }
        if (email && c.email && String(c.email).trim().toLowerCase() === email.toLowerCase()) {
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
        apiService.saveClient(updatedClient);
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
        apiService.saveClient(newClient);
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
      const invId = finalizedInvoice.id ? String(finalizedInvoice.id).trim() : '';
      const invMongoId = (finalizedInvoice as any)._id ? String((finalizedInvoice as any)._id).trim() : '';
      const invNum = finalizedInvoice.invoiceNumber ? String(finalizedInvoice.invoiceNumber).trim().toUpperCase() : '';

      // Find ALL matching payments strictly for THIS invoice
      const matchingAdvanceIndices: number[] = [];
      currentPayments.forEach((p, idx) => {
        if (!p || p.documentType !== 'invoice') return;
        const pDocId = p.documentId ? String(p.documentId).trim() : '';
        const pDocNum = p.documentNumber ? String(p.documentNumber).trim().toUpperCase() : '';

        let matchesDoc = false;
        if (pDocId) {
          matchesDoc = Boolean((invId && pDocId === invId) || (invMongoId && pDocId === invMongoId));
        } else if (invNum && pDocNum) {
          matchesDoc = Boolean(pDocNum === invNum);
        }

        if (matchesDoc && (p.isAdvance || p.referenceNumber?.startsWith('ADV') || p.notes?.includes('advance') || p.notes?.includes('Advance'))) {
          matchingAdvanceIndices.push(idx);
        }
      });
      // Fallback: if no advance-flagged payment matched, check if any payment matches this invoice
      if (matchingAdvanceIndices.length === 0) {
        currentPayments.forEach((p, idx) => {
          if (!p || p.documentType !== 'invoice') return;
          const pDocId = p.documentId ? String(p.documentId).trim() : '';
          const pDocNum = p.documentNumber ? String(p.documentNumber).trim().toUpperCase() : '';

          let matchesDoc = false;
          if (pDocId) {
            matchesDoc = Boolean((invId && pDocId === invId) || (invMongoId && pDocId === invMongoId));
          } else if (invNum && pDocNum) {
            matchesDoc = Boolean(pDocNum === invNum);
          }

          if (matchesDoc) {
            matchingAdvanceIndices.push(idx);
          }
        });
      }

      if (initialPayment.amount > 0) {
        const targetCleanRef = initialPayment.referenceNumber ? initialPayment.referenceNumber.trim() : '';
        const targetCleanNotes = initialPayment.notes ? initialPayment.notes.trim() : '';

        if (matchingAdvanceIndices.length > 0) {
          const targetIdx = matchingAdvanceIndices[0];
          const updatedPayment: Payment = {
            ...currentPayments[targetIdx],
            amount: initialPayment.amount,
            paymentDate: initialPayment.paymentDate,
            paymentMethod: initialPayment.paymentMethod,
            referenceNumber: targetCleanRef,
            notes: targetCleanNotes,
            customerId: finalizedInvoice.clientId,
            customerName: finalizedInvoice.clientName,
            clientName: finalizedInvoice.clientName,
            customerCompany: finalizedInvoice.clientCompany,
            documentId: finalizedInvoice.id,
            documentNumber: finalizedInvoice.invoiceNumber,
            isAdvance: true,
          };
          currentPayments[targetIdx] = updatedPayment;

          // Remove any duplicate advance payment records created previously for this invoice
          const duplicateIndices = matchingAdvanceIndices.slice(1);
          if (duplicateIndices.length > 0) {
            const dupIds = duplicateIndices.map((i) => currentPayments[i].id);
            currentPayments = currentPayments.filter((p) => !dupIds.includes(p.id));
            dupIds.forEach((id) => apiService.deletePayment(id));
          }

          setPayments(currentPayments);
          savePayments(currentPayments);
          apiService.savePayment(updatedPayment as any);

          recordAuditLog({
            userName: team[0]?.name || 'Admin',
            action: 'Payment Updated',
            entityType: 'Payment',
            entityId: updatedPayment.id,
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
            clientName: finalizedInvoice.clientName,
            customerCompany: finalizedInvoice.clientCompany,
            amount: initialPayment.amount,
            paymentDate: initialPayment.paymentDate,
            paymentMethod: initialPayment.paymentMethod,
            referenceNumber: targetCleanRef,
            notes: targetCleanNotes,
            isAdvance: true,
            recordedBy: team[0]?.name || 'Admin',
            createdAt: new Date().toISOString(),
          };

          currentPayments = [advancePayment, ...currentPayments];
          setPayments(currentPayments);
          savePayments(currentPayments);
          apiService.savePayment(advancePayment as any);

          recordAuditLog({
            userName: team[0]?.name || 'Admin',
            action: 'Payment Recorded',
            entityType: 'Payment',
            entityId: advancePayment.id,
            details: `Recorded advance payment of ${currencySymbol}${advancePayment.amount} for invoice ${finalizedInvoice.invoiceNumber} via ${advancePayment.paymentMethod}.`,
          });
        }
      } else if (matchingAdvanceIndices.length > 0) {
        // User unchecked or cleared advance payment - remove it from the ledger
        const removeIds = matchingAdvanceIndices.map((i) => currentPayments[i].id);
        currentPayments = currentPayments.filter((p) => !removeIds.includes(p.id));
        setPayments(currentPayments);
        savePayments(currentPayments);
        removeIds.forEach((id) => apiService.deletePayment(id));

        recordAuditLog({
          userName: team[0]?.name || 'Admin',
          action: 'Payment Deleted',
          entityType: 'Payment',
          entityId: removeIds[0],
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

    const actorName = currentUser?.name || team[0]?.name || 'Admin';
    finalizedInvoice.lastModifiedBy = actorName;
    finalizedInvoice.lastModifiedAt = new Date().toISOString();

    let updated: Invoice[];
    if (exists) {
      updated = invoices.map((i) => (i.id === finalizedInvoice.id ? finalizedInvoice : i));
      addToast('success', 'Invoice Updated', `Invoice ${finalizedInvoice.invoiceNumber} updated.`);
      recordAuditLog({
        userName: actorName,
        action: 'Invoice Updated',
        entityType: 'Invoice',
        entityId: finalizedInvoice.id,
        details: `Updated invoice ${finalizedInvoice.invoiceNumber} (${currencySymbol}${finalizedInvoice.total}).`,
      });
    } else {
      updated = [finalizedInvoice, ...invoices];
      addToast('success', 'Invoice Issued', `Invoice ${finalizedInvoice.invoiceNumber} generated.`);
      recordAuditLog({
        userName: actorName,
        action: 'Invoice Created',
        entityType: 'Invoice',
        entityId: finalizedInvoice.id,
        details: `Issued invoice ${finalizedInvoice.invoiceNumber} to ${finalizedInvoice.clientCompany} (${currencySymbol}${finalizedInvoice.total}).`,
      });
    }

    // SAVE DIRECTLY TO MONGODB DATABASE
    const saveRes = await apiService.saveInvoice(finalizedInvoice);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to save invoice to MongoDB database.');
      return;
    }

    setInvoices(updated);
    saveInvoices(updated);
    if (viewingInvoice && viewingInvoice.id === finalizedInvoice.id) {
      setViewingInvoice(finalizedInvoice);
    }
    setAuditLogs(getStoredAuditLogs());
    setIsCreatingInvoice(false);
    setEditingInvoice(null);
    setActiveTab('invoices');
  };

  const handleMarkInvoicePaid = async (invoiceId: string, method: string = 'Bank Transfer') => {
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

    // Save payment to database first
    const payRes = await apiService.savePayment(newPayment as any);
    if (!payRes || payRes.success === false) {
      addToast('error', 'Database Error', payRes?.error || 'Failed to record payment in MongoDB.');
      return;
    }

    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    savePayments(updatedPayments);

    const derived = deriveInvoiceFinancials(target, updatedPayments);

    const updatedInvoice: Invoice = {
      ...target,
      status: derived.status,
      paidAmount: derived.paidAmount,
      balanceDue: derived.balanceDue,
      paidAt: newPayment.paymentDate,
      paymentMethod: method,
    };

    // Save updated invoice to MongoDB
    await apiService.saveInvoice(updatedInvoice);

    const updated = invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv));
    setInvoices(updated);
    saveInvoices(updated);

    if (viewingInvoice && viewingInvoice.id === invoiceId) {
      setViewingInvoice(updatedInvoice);
    }

    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Payment Recorded',
      entityType: 'Payment',
      entityId: newPayment.id,
      details: `Settled full payment of ${currencySymbol}${newPayment.amount} for invoice ${target.invoiceNumber}.`,
    });
    setAuditLogs(getStoredAuditLogs());

    addToast('success', 'Payment Settled', `Invoice ${target.invoiceNumber} recorded as paid via ${method} and saved to MongoDB.`);
  };

  const handleDuplicateInvoice = async (invoice: Invoice) => {
    const today = new Date();
    let calculatedDueDate = invoice.dueDate || today.toISOString().slice(0, 10);
    if (invoice.paymentTermsDays !== undefined) {
      const dueObj = new Date(today);
      dueObj.setDate(dueObj.getDate() + invoice.paymentTermsDays);
      calculatedDueDate = dueObj.toISOString().slice(0, 10);
    }

    const existingNumbers = new Set(invoices.map((i) => (i.invoiceNumber || '').trim().toUpperCase()));
    let dupCount = invoices.length;
    let nextNum = generateNextInvoiceNumber(dupCount, undefined, settings.invoicePrefix);
    while (existingNumbers.has(nextNum.trim().toUpperCase())) {
      dupCount++;
      nextNum = generateNextInvoiceNumber(dupCount, undefined, settings.invoicePrefix);
    }

    const duplicated: Invoice = {
      ...invoice,
      id: `inv-${Date.now()}`,
      invoiceNumber: nextNum,
      issueDate: today.toISOString().slice(0, 10),
      dueDate: calculatedDueDate,
      status: 'draft',
      paidAmount: 0,
      balanceDue: invoice.total,
      advancePaymentAmount: undefined,
      advanceReference: undefined,
      advanceNotes: undefined,
      paidAt: undefined,
      paymentMethod: undefined,
      createdAt: new Date().toISOString(),
    };

    const saveRes = await apiService.saveInvoice(duplicated);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to duplicate invoice in MongoDB.');
      return;
    }

    const updated = [duplicated, ...invoices];
    setInvoices(updated);
    saveInvoices(updated);
    addToast('info', 'Invoice Duplicated', `Draft ${duplicated.invoiceNumber} created and saved to MongoDB.`);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    const target = invoices.find((i) => i.id === invoiceId);

    const delRes = await apiService.deleteInvoice(invoiceId);
    if (!delRes || delRes.success === false) {
      addToast('error', 'Database Error', delRes?.error || 'Failed to delete invoice from MongoDB.');
      return;
    }

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

    addToast('info', 'Invoice Deleted', 'Invoice deleted from MongoDB ledger.');
  };

  // --------------------------------------------------------------------------
  // BILL HANDLERS
  // --------------------------------------------------------------------------
  const handleSaveBill = async (bill: Bill, recordedPaymentAmount?: number) => {
    let updated: Bill[];
    const exists = bills.some((b) => b.id === bill.id);
    const actorName = currentUser?.name || team[0]?.name || 'Admin';

    bill.lastModifiedBy = actorName;
    bill.lastModifiedAt = new Date().toISOString();

    // 1. If initial payment was made with the bill creation, record it in payment ledger
    if (!exists && recordedPaymentAmount && recordedPaymentAmount > 0) {
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

      const payRes = await apiService.savePayment(newPayment as any);
      if (!payRes || payRes.success === false) {
        addToast('error', 'Database Error', payRes?.error || 'Failed to save bill payment to MongoDB.');
        return;
      }

      const updatedPayments = [newPayment, ...payments];
      setPayments(updatedPayments);
      savePayments(updatedPayments);
    }

    // 2. Save bill directly to MongoDB
    const saveRes = await apiService.saveBill(bill);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to save bill to MongoDB database.');
      return;
    }

    if (exists) {
      updated = bills.map((b) => (b.id === bill.id ? bill : b));
      addToast('success', 'Bill Updated', `Bill ${bill.billNumber} saved to MongoDB.`);
      recordAuditLog({
        userName: actorName,
        action: 'Bill Updated',
        entityType: 'Bill',
        entityId: bill.id,
        details: `Updated sales bill ${bill.billNumber} (${currencySymbol}${bill.total}).`,
      });
    } else {
      updated = [bill, ...bills];
      addToast('success', 'Bill Issued', `Sales bill ${bill.billNumber} saved to MongoDB.`);
      recordAuditLog({
        userName: actorName,
        action: 'Bill Created',
        entityType: 'Bill',
        entityId: bill.id,
        details: `Created bill ${bill.billNumber} for ${bill.customerCompany || bill.customerName} (${currencySymbol}${bill.total}).`,
      });
    }

    setBills(updated);
    saveBills(updated);
    setAuditLogs(getStoredAuditLogs());
    setIsCreatingBill(false);
    setEditingBill(null);
    setActiveTab('bills');
  };

  const handleDuplicateBill = async (bill: Bill) => {
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

    const saveRes = await apiService.saveBill(duplicated);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to duplicate bill in MongoDB.');
      return;
    }

    const updated = [duplicated, ...bills];
    setBills(updated);
    saveBills(updated);
    addToast('info', 'Bill Duplicated', `Created bill ${duplicated.billNumber} in MongoDB.`);
  };

  const handleDeleteBill = async (billId: string) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    const target = bills.find((b) => b.id === billId);

    const delRes = await apiService.deleteBill(billId);
    if (!delRes || delRes.success === false) {
      addToast('error', 'Database Error', delRes?.error || 'Failed to delete bill from MongoDB.');
      return;
    }

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

    addToast('info', 'Bill Deleted', 'Sales bill deleted from MongoDB.');
  };

  // --------------------------------------------------------------------------
  // PAYMENT HANDLERS
  // --------------------------------------------------------------------------
  const handleSavePayment = async (payment: Payment) => {
    // 1. Save payment to MongoDB first
    const saveRes = await apiService.savePayment(payment as any);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to record payment in MongoDB.');
      return;
    }

    // 2. Add to payments ledger
    const updatedPayments = [payment, ...payments];
    setPayments(updatedPayments);
    savePayments(updatedPayments);

    // 3. Authoritatively recalculate document balances & status in MongoDB
    if (payment.documentType === 'invoice') {
      const pDocId = payment.documentId ? String(payment.documentId).trim() : '';
      const updatedInvoices = invoices.map((inv) => {
        const isMatch =
          (pDocId && inv.id === pDocId) ||
          (pDocId && (inv as any)._id && String((inv as any)._id) === pDocId);
        if (isMatch) {
          const derived = deriveInvoiceFinancials(inv, updatedPayments);
          const upInv = {
            ...inv,
            paidAmount: derived.paidAmount,
            balanceDue: derived.balanceDue,
            status: derived.status,
            paidAt: derived.status === 'paid' ? payment.paymentDate : inv.paidAt,
            paymentMethod: payment.paymentMethod,
          };
          apiService.saveInvoice(upInv);
          return upInv;
        }
        return inv;
      });
      setInvoices(updatedInvoices);
      saveInvoices(updatedInvoices);
    } else {
      const pDocId = payment.documentId ? String(payment.documentId).trim() : '';
      const updatedBills = bills.map((b) => {
        const isMatch =
          (pDocId && b.id === pDocId) ||
          (pDocId && (b as any)._id && String((b as any)._id) === pDocId);
        if (isMatch) {
          const derived = deriveBillFinancials(b, updatedPayments);
          const upBill = {
            ...b,
            paidAmount: derived.paidAmount,
            balanceDue: derived.balanceDue,
            paymentStatus: derived.status,
            paymentMethod: payment.paymentMethod,
          };
          apiService.saveBill(upBill);
          return upBill;
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

    addToast('success', 'Payment Recorded', `Recorded ${currencySymbol}${payment.amount} for ${payment.documentNumber} in MongoDB.`);
  };

  const handleDeletePayment = async (paymentId: string) => {
    const target = payments.find((p) => p.id === paymentId);
    if (!target) return;
    if (!window.confirm(`Are you sure you want to reverse / delete payment ${target.id} (${currencySymbol}${target.amount})? This will automatically restore the document's outstanding balance.`)) return;

    const delRes = await apiService.deletePayment(paymentId);
    if (!delRes || delRes.success === false) {
      addToast('error', 'Database Error', delRes?.error || 'Failed to delete payment from MongoDB.');
      return;
    }

    const nextPayments = payments.filter((p) => p.id !== paymentId);
    setPayments(nextPayments);
    savePayments(nextPayments);

    if (target.documentType === 'invoice') {
      const tDocId = target.documentId ? String(target.documentId).trim() : '';
      const updatedInvoices = invoices.map((inv) => {
        const isMatch =
          (tDocId && inv.id === tDocId) ||
          (tDocId && (inv as any)._id && String((inv as any)._id) === tDocId);
        if (isMatch) {
          const derived = deriveInvoiceFinancials(inv, nextPayments);
          const upInv = {
            ...inv,
            paidAmount: derived.paidAmount,
            balanceDue: derived.balanceDue,
            status: derived.status,
          };
          apiService.saveInvoice(upInv);
          return upInv;
        }
        return inv;
      });
      setInvoices(updatedInvoices);
      saveInvoices(updatedInvoices);
    } else {
      const tDocId = target.documentId ? String(target.documentId).trim() : '';
      const updatedBills = bills.map((b) => {
        const isMatch =
          (tDocId && b.id === tDocId) ||
          (tDocId && (b as any)._id && String((b as any)._id) === tDocId);
        if (isMatch) {
          const derived = deriveBillFinancials(b, nextPayments);
          const upBill = {
            ...b,
            paidAmount: derived.paidAmount,
            balanceDue: derived.balanceDue,
            paymentStatus: derived.status,
          };
          apiService.saveBill(upBill);
          return upBill;
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
  const handleCreateCategory = async (catData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCat = createCategory(catData);
    const saveRes = await apiService.saveCategory(newCat);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to save category to MongoDB.');
      return;
    }
    setCategories(getStoredCategories());
    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Category Created',
      entityType: 'Category',
      entityId: newCat.id,
      details: `Created custom service category "${newCat.name}".`,
    });
    setAuditLogs(getStoredAuditLogs());
    addToast('success', 'Category Created', `Added category "${newCat.name}" to MongoDB.`);
  };

  const handleUpdateCategory = async (cat: Category) => {
    const saveRes = await apiService.saveCategory(cat);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to update category in MongoDB.');
      return;
    }
    updateCategory(cat.id, cat);
    setCategories(getStoredCategories());
    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Category Updated',
      entityType: 'Category',
      entityId: cat.id,
      details: `Updated service category "${cat.name}".`,
    });
    setAuditLogs(getStoredAuditLogs());
    addToast('success', 'Category Updated', `Category "${cat.name}" updated in MongoDB.`);
  };

  const handleArchiveCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    archiveCategory(catId);
    if (cat) {
      apiService.saveCategory({ ...cat, status: 'archived' });
    }
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
    if (cat) {
      apiService.saveCategory({ ...cat, status: 'active' });
    }
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

  const handleDeleteCategory = async (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    const delRes = await apiService.deleteCategory(catId);
    if (!delRes || delRes.success === false) {
      addToast('error', 'Database Error', delRes?.error || 'Failed to delete category from MongoDB.');
      return;
    }
    const updated = categories.filter((c) => c.id !== catId);
    setCategories(updated);
    saveCategories(updated);
    recordAuditLog({
      userName: team[0]?.name || 'Admin',
      action: 'Category Deleted',
      entityType: 'Category',
      entityId: catId,
      details: `Deleted service category "${cat?.name || catId}".`,
    });
    setAuditLogs(getStoredAuditLogs());
    addToast('info', 'Category Deleted', `Category "${cat?.name || 'Category'}" deleted from MongoDB.`);
  };

  // --------------------------------------------------------------------------
  // PRODUCT CATALOG HANDLERS
  // --------------------------------------------------------------------------
  const handleAddProduct = async (prod: Product) => {
    const saveRes = await apiService.saveProduct(prod);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to save product/service to MongoDB.');
      return;
    }
    const updated = [prod, ...products];
    setProducts(updated);
    saveProducts(updated);
    addToast('success', 'Product Created', `Added ${prod.name} to MongoDB catalog.`);
  };

  const handleUpdateProduct = async (prod: Product) => {
    const saveRes = await apiService.saveProduct(prod);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to update product in MongoDB.');
      return;
    }
    const updated = products.map((p) => (p.id === prod.id ? prod : p));
    setProducts(updated);
    saveProducts(updated);
    addToast('success', 'Product Updated', `${prod.name} updated in MongoDB.`);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Delete this product/service from the catalog?')) return;
    const delRes = await apiService.deleteProduct(productId);
    if (!delRes || delRes.success === false) {
      addToast('error', 'Database Error', delRes?.error || 'Failed to delete product from MongoDB.');
      return;
    }
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    saveProducts(updated);
    addToast('info', 'Product Removed', 'Catalog item deleted from MongoDB.');
  };

  // --------------------------------------------------------------------------
  // EXPENSE HANDLERS
  // --------------------------------------------------------------------------
  const handleAddExpense = async (exp: Expense) => {
    const actorName = currentUser?.name || team[0]?.name || 'Admin';
    const nowIso = new Date().toISOString();
    const expenseWithAudit: Expense = {
      ...exp,
      createdBy: exp.createdBy || actorName,
      createdAt: exp.createdAt || nowIso,
      lastModifiedBy: exp.lastModifiedBy || actorName,
      lastModifiedAt: exp.lastModifiedAt || nowIso,
    };

    const saveRes = await apiService.saveExpense(expenseWithAudit);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to save expense to MongoDB.');
      return;
    }

    const updated = [expenseWithAudit, ...expenses];
    setExpenses(updated);
    saveExpenses(updated);

    recordAuditLog({
      userName: actorName,
      action: 'Expense Logged',
      entityType: 'Expense',
      entityId: exp.id,
      details: `Logged expense for "${exp.payee}" (${currencySymbol}${exp.amount}) under ${exp.category}${exp.reason ? ` for reason: "${exp.reason}"` : ''}.`,
    });
    setAuditLogs(getStoredAuditLogs());
    addToast('success', 'Expense Logged', `Recorded ${exp.category} (${currencySymbol}${exp.amount}) in MongoDB.`);
  };

  const handleAddMultipleExpenses = async (newExpenses: Expense[]) => {
    if (!newExpenses.length) return;
    const actorName = currentUser?.name || team[0]?.name || 'Admin';
    const nowIso = new Date().toISOString();
    const enriched = newExpenses.map((exp) => ({
      ...exp,
      createdBy: exp.createdBy || actorName,
      createdAt: exp.createdAt || nowIso,
      lastModifiedBy: exp.lastModifiedBy || actorName,
      lastModifiedAt: exp.lastModifiedAt || nowIso,
    }));

    for (const exp of enriched) {
      const saveRes = await apiService.saveExpense(exp);
      if (!saveRes || saveRes.success === false) {
        addToast('error', 'Database Error', `Failed to save expense "${exp.payee}" to MongoDB.`);
        return;
      }
    }

    const updated = [...enriched, ...expenses];
    setExpenses(updated);
    saveExpenses(updated);

    const sharedReason = enriched[0]?.reason || 'Shared Purpose';
    const totalAmount = enriched.reduce((s, e) => s + (e.amount || 0), 0);
    recordAuditLog({
      userName: actorName,
      action: 'Batch Expenses Logged',
      entityType: 'Expense',
      entityId: enriched[0].id,
      details: `Logged ${enriched.length} linked expense entries totaling ${currencySymbol}${totalAmount} for reason "${sharedReason}".`,
    });
    setAuditLogs(getStoredAuditLogs());
    addToast('success', 'Batch Expenses Saved', `Logged ${enriched.length} expense items (${currencySymbol}${totalAmount}) in MongoDB.`);
  };

  const handleUpdateExpense = async (updatedExp: Expense) => {
    const actorName = currentUser?.name || team[0]?.name || 'Admin';
    const expenseWithAudit: Expense = {
      ...updatedExp,
      lastModifiedBy: actorName,
      lastModifiedAt: new Date().toISOString(),
    };

    const saveRes = await apiService.saveExpense(expenseWithAudit);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to update expense in MongoDB.');
      return;
    }

    const updated = expenses.map((e) => (e.id === expenseWithAudit.id ? expenseWithAudit : e));
    setExpenses(updated);
    saveExpenses(updated);

    recordAuditLog({
      userName: actorName,
      action: 'Expense Updated',
      entityType: 'Expense',
      entityId: expenseWithAudit.id,
      details: `Updated expense for "${expenseWithAudit.payee}" (${currencySymbol}${expenseWithAudit.amount}).`,
    });
    setAuditLogs(getStoredAuditLogs());
    addToast('success', 'Expense Updated', `Updated ${expenseWithAudit.payee} expense in MongoDB.`);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    const actorName = currentUser?.name || team[0]?.name || 'Admin';
    const target = expenses.find((e) => e.id === expenseId);

    const delRes = await apiService.deleteExpense(expenseId);
    if (!delRes || delRes.success === false) {
      addToast('error', 'Database Error', delRes?.error || 'Failed to delete expense from MongoDB.');
      return;
    }

    const updated = expenses.filter((e) => e.id !== expenseId);
    setExpenses(updated);
    saveExpenses(updated);

    recordAuditLog({
      userName: actorName,
      action: 'Expense Deleted',
      entityType: 'Expense',
      entityId: expenseId,
      details: `Deleted expense for "${target?.payee || expenseId}" (${currencySymbol}${target?.amount || 0}).`,
    });
    setAuditLogs(getStoredAuditLogs());
    addToast('info', 'Expense Deleted', 'Expense entry deleted from MongoDB.');
  };

  const handleAddExpenseCategory = (name: string) => {
    setExpenseCategories((prev) => [...new Set([...prev, name])]);
    addToast('success', 'Expense Category Added', `Added "${name}" to expense categories.`);
  };

  const handleUpdateExpenseCategory = (oldName: string, newName: string) => {
    setExpenseCategories((prev) => prev.map((c) => (c.toLowerCase() === oldName.toLowerCase() ? newName : c)));
    setExpenses(getStoredExpenses());
    addToast('success', 'Expense Category Updated', `Renamed "${oldName}" to "${newName}".`);
  };

  const handleDeleteExpenseCategory = (name: string) => {
    setExpenseCategories((prev) => prev.filter((c) => c.toLowerCase() !== name.toLowerCase()));
    addToast('info', 'Expense Category Deleted', `Removed "${name}" from categories.`);
  };

  // --------------------------------------------------------------------------
  // CLIENT HANDLERS
  // --------------------------------------------------------------------------
  const handleAddClient = async (client: Client) => {
    const saveRes = await apiService.saveClient(client);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to save customer to MongoDB.');
      return;
    }
    const updated = [client, ...clients];
    setClients(updated);
    saveClients(updated);
    addToast('success', 'Customer Added', `${client.company} saved in MongoDB CRM.`);
  };

  const handleUpdateClient = async (client: Client) => {
    const saveRes = await apiService.saveClient(client);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to update customer in MongoDB.');
      return;
    }
    const updated = clients.map((c) => (c.id === client.id ? client : c));
    setClients(updated);
    saveClients(updated);
    addToast('success', 'Customer Updated', `${client.company} updated in MongoDB CRM.`);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    const delRes = await apiService.deleteClient(clientId);
    if (!delRes || delRes.success === false) {
      addToast('error', 'Database Error', delRes?.error || 'Failed to delete customer from MongoDB.');
      return;
    }
    const updated = clients.filter((c) => c.id !== clientId);
    setClients(updated);
    saveClients(updated);
    addToast('info', 'Customer Deleted', 'Customer removed from MongoDB CRM.');
  };

  // --------------------------------------------------------------------------
  // QUOTE & SUBSCRIPTION HANDLERS
  // --------------------------------------------------------------------------
  const handleAddQuote = async (quote: Quote) => {
    const updated = [quote, ...quotes];
    setQuotes(updated);
    saveQuotes(updated);
    await apiService.saveQuote(quote);
    addToast('success', 'Quote Created', `Quotation ${quote.quoteNumber} issued and saved to MongoDB.`);
  };

  const handleConvertQuoteToInvoice = async (quote: Quote) => {
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
    const convertedQuote: Quote = { ...quote, status: 'converted' as const };
    await apiService.saveQuote(convertedQuote);

    const updatedInvoices = [newInvoice, ...invoices];
    setInvoices(updatedInvoices);
    saveInvoices(updatedInvoices);
    await apiService.saveInvoice(newInvoice);

    setEditingInvoice(newInvoice);
    setActiveTab('invoices');
    addToast('success', 'Quote Converted', `Converted ${quote.quoteNumber} into active invoice.`);
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!window.confirm('Are you sure you want to delete this quote proposal? This action cannot be undone.')) return;
    const delRes = await apiService.deleteQuote(quoteId);
    if (!delRes || delRes.success === false) {
      addToast('error', 'Database Error', delRes?.error || 'Failed to delete quote from MongoDB.');
      return;
    }
    const updated = quotes.filter((q) => q.id !== quoteId);
    setQuotes(updated);
    saveQuotes(updated);
    addToast('info', 'Quote Deleted', 'Quote proposal removed from MongoDB.');
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

  const handleSaveSettings = async (newSettings: BusinessSettings) => {
    const saveRes = await apiService.saveSettings(newSettings);
    if (!saveRes || saveRes.success === false) {
      addToast('error', 'Database Error', saveRes?.error || 'Failed to save settings to MongoDB.');
      return;
    }
    setSettings(newSettings);
    saveSettings(newSettings);
    addToast('success', 'Settings Saved', 'Business branding and preferences saved to MongoDB.');
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
          invoices={invoices}
          products={products}
          categories={categories}
          settings={settings}
          payments={payments}
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
            expenses={expenses}
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
            currentUser={currentUser}
            expenseCategories={expenseCategories}
            onAddExpenseCategory={handleAddExpenseCategory}
            onAddExpense={handleAddExpense}
            onAddMultipleExpenses={handleAddMultipleExpenses}
            onUpdateExpense={handleUpdateExpense}
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
            expenses={expenses}
            payments={payments}
            expenseCategories={expenseCategories}
            onAddExpenseCategory={handleAddExpenseCategory}
            onUpdateExpenseCategory={handleUpdateExpenseCategory}
            onDeleteExpenseCategory={handleDeleteExpenseCategory}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onArchiveCategory={handleArchiveCategory}
            onRestoreCategory={handleRestoreCategory}
            onDeleteCategory={handleDeleteCategory}
            onSaveSettings={handleSaveSettings}
          />
        );

      case 'team':
        return (
          <TeamManagementView
            team={team}
            auditLogs={auditLogs}
            currentUser={currentUser}
            onAddMember={handleAddTeamMember}
            onDeleteMember={handleDeleteTeamMember}
            onRefreshTeam={() => setTeam(getStoredTeam())}
          />
        );

      case 'help':
        return <HelpSupportView settings={settings} />;

      default:
        return null;
    }
  };

  // Mandatory Authentication Access Gate: User MUST log in or sign up before accessing the SaaS
  if (!currentUser) {
    return (
      <div
        className={`app-container ${theme}`}
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.12) 0%, var(--bg-primary) 70%)',
          padding: '1.5rem',
        }}
      >
        <AuthModal
          isOpen={true}
          isForcedAuth={true}
          currentUser={null}
          companyName={settings.companyName || 'HIGHPHAUS'}
          onClose={() => {}}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            addToast('success', 'Access Granted', `Welcome to ${settings.companyName || 'HIGHPHAUS'}, ${user.name}!`);
          }}
          onLogout={() => {}}
          onAddTeamMember={(newMember) => {
            handleAddTeamMember(newMember);
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="User Profile & Account"
          >
            <User size={15} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              {currentUser ? currentUser.name.split(' ')[0] : 'Sign In'}
            </span>
          </button>

          {currentUser && (
            <button
              onClick={() => {
                setCurrentUser(null);
                saveStoredAuthUser(null);
                addToast('info', 'Signed Out', 'You have been signed out.');
              }}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.35rem 0.5rem', color: 'var(--danger)' }}
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.35rem 0.5rem' }}
            title="Switch Theme"
          >
            {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
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
        currentUser={currentUser}
        pendingApprovalsCount={currentUser?.role === 'Owner' || currentUser?.email === 'admin@highphaus.com' ? team.filter((m) => m.status === 'pending').length : 0}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          setCurrentUser(null);
          saveStoredAuthUser(null);
          addToast('info', 'Signed Out', 'You have been signed out.');
        }}
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

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        currentUser={currentUser}
        companyName={settings.companyName || 'HIGHPHAUS'}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          addToast('success', 'Authenticated', `Signed in as ${user.name} (${user.role}).`);
        }}
        onLogout={() => {
          setCurrentUser(null);
          saveStoredAuthUser(null);
          addToast('info', 'Signed Out', 'You have been signed out.');
        }}
        onAddTeamMember={(newMember) => {
          handleAddTeamMember(newMember);
        }}
      />

      {/* Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>

  );
};

export default App;
