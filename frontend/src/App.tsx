import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoiceViewModal } from './components/InvoiceViewModal';
import { ClientList } from './components/ClientList';
import { QuotesList } from './components/QuotesList';
import { RecurringList } from './components/RecurringList';
import { SettingsView } from './components/SettingsView';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import { Menu, Sun, Moon } from 'lucide-react';

import type { Invoice, Client, Quote, RecurringTemplate, BusinessSettings } from './types/invoice';
import {
  getStoredInvoices,
  saveInvoices,
  getStoredClients,
  saveClients,
  getStoredQuotes,
  saveQuotes,
  getStoredRecurring,
  saveRecurring,
  getStoredSettings,
  saveSettings,
  getCurrencySymbol,
  generateNextInvoiceNumber,
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

  // Core App State using lazy initializers (no linter warnings or double render flicker)
  const [invoices, setInvoices] = useState<Invoice[]>(() => getStoredInvoices());
  const [clients, setClients] = useState<Client[]>(() => getStoredClients());
  const [quotes, setQuotes] = useState<Quote[]>(() => getStoredQuotes());
  const [recurring, setRecurring] = useState<RecurringTemplate[]>(() => getStoredRecurring());
  const [settings, setSettings] = useState<BusinessSettings>(() => getStoredSettings());

  // Modal / View States
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

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

  // Invoice Handlers
  const handleSaveInvoice = (invoice: Invoice) => {
    let updated: Invoice[];
    const exists = invoices.some((i) => i.id === invoice.id);
    if (exists) {
      updated = invoices.map((i) => (i.id === invoice.id ? invoice : i));
      addToast('success', 'Invoice Updated', `Invoice ${invoice.invoiceNumber} updated successfully.`);
    } else {
      updated = [invoice, ...invoices];
      addToast('success', 'Invoice Issued', `Invoice ${invoice.invoiceNumber} generated.`);
    }
    setInvoices(updated);
    saveInvoices(updated);
    setIsCreatingInvoice(false);
    setEditingInvoice(null);
    setActiveTab('invoices');
  };

  const handleMarkPaid = (invoiceId: string, method: string = 'Bank Wire Transfer') => {
    const target = invoices.find((i) => i.id === invoiceId);
    const updated = invoices.map((inv) => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          status: 'paid' as const,
          paidAt: new Date().toISOString().slice(0, 10),
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
        status: 'paid',
        paidAt: new Date().toISOString().slice(0, 10),
        paymentMethod: method,
      });
    }

    addToast('success', 'Payment Recorded', `Payment recorded via ${method} for ${target?.invoiceNumber || 'invoice'}.`);
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
      invoiceNumber: generateNextInvoiceNumber(invoices.length),
      issueDate: today.toISOString().slice(0, 10),
      dueDate: calculatedDueDate,
      paymentTermsDays: invoice.paymentTermsDays,
      status: 'draft',
      paidAt: undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [duplicated, ...invoices];
    setInvoices(updated);
    saveInvoices(updated);
    addToast('info', 'Invoice Duplicated', `Created draft ${duplicated.invoiceNumber} from ${invoice.invoiceNumber}.`);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    const updated = invoices.filter((i) => i.id !== invoiceId);
    setInvoices(updated);
    saveInvoices(updated);
    addToast('info', 'Invoice Deleted', 'Invoice removed from ledger.');
  };

  // Client Handlers
  const handleAddClient = (client: Client) => {
    const updated = [client, ...clients];
    setClients(updated);
    saveClients(updated);
    addToast('success', 'Client Account Created', `${client.company} added to CRM.`);
  };

  const handleUpdateClient = (client: Client) => {
    const updated = clients.map((c) => (c.id === client.id ? client : c));
    setClients(updated);
    saveClients(updated);
    addToast('success', 'Client Profile Updated', `${client.company} details saved.`);
  };

  const handleDeleteClient = (clientId: string) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    const updated = clients.filter((c) => c.id !== clientId);
    setClients(updated);
    saveClients(updated);
    addToast('info', 'Client Deleted', 'Client removed from CRM.');
  };

  // Quote Handlers
  const handleAddQuote = (quote: Quote) => {
    const updated = [quote, ...quotes];
    setQuotes(updated);
    saveQuotes(updated);
    addToast('success', 'Quote Issued', `Proposal Quote ${quote.quoteNumber} created.`);
  };

  const handleConvertQuoteToInvoice = (quote: Quote) => {
    const payTerms = settings.defaultPaymentTermsDays !== undefined ? settings.defaultPaymentTermsDays : 15;
    const today = new Date();
    const dueObj = new Date(today);
    dueObj.setDate(dueObj.getDate() + payTerms);
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: generateNextInvoiceNumber(invoices.length),
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
    addToast('success', 'Quote Converted', `Quote ${quote.quoteNumber} converted to active invoice.`);
  };

  const handleDeleteQuote = (quoteId: string) => {
    const updated = quotes.filter((q) => q.id !== quoteId);
    setQuotes(updated);
    saveQuotes(updated);
    addToast('info', 'Quote Deleted', 'Quote removed.');
  };

  // Recurring Handlers
  const handleAddRecurring = (tmpl: RecurringTemplate) => {
    const updated = [tmpl, ...recurring];
    setRecurring(updated);
    saveRecurring(updated);
    addToast('success', 'Subscription Created', `Recurring contract "${tmpl.title}" registered.`);
  };

  const handleGenerateRecurringInvoice = (tmpl: RecurringTemplate) => {
    const payTerms = settings.defaultPaymentTermsDays !== undefined ? settings.defaultPaymentTermsDays : 15;
    const today = new Date();
    const dueObj = new Date(today);
    dueObj.setDate(dueObj.getDate() + payTerms);
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: generateNextInvoiceNumber(invoices.length),
      clientId: tmpl.clientId,
      clientName: tmpl.clientName,
      clientCompany: tmpl.clientCompany,
      clientEmail: `${tmpl.clientCompany.toLowerCase().replace(/\s+/g, '')}@client.com`,
      clientAddress: 'Recurring Subscription Contract Billing',
      issueDate: today.toISOString().slice(0, 10),
      dueDate: dueObj.toISOString().slice(0, 10),
      paymentTermsDays: payTerms,
      items: tmpl.items,
      subtotal: tmpl.items.reduce((s, i) => s + i.amount, 0),
      taxTotal: (tmpl.items.reduce((s, i) => s + i.amount, 0) * settings.defaultTaxRate) / 100,
      discountRate: 0,
      discountTotal: 0,
      shippingFee: 0,
      total: tmpl.amount,
      status: 'sent',
      notes: `Recurring contract: ${tmpl.title}`,
      terms: 'Net 30 Subscription Terms.',
      currency: tmpl.currency,
      createdAt: new Date().toISOString(),
    };

    const updated = [newInvoice, ...invoices];
    setInvoices(updated);
    saveInvoices(updated);
    setViewingInvoice(newInvoice);
    addToast('success', 'Recurring Invoice Triggered', `Generated invoice for ${tmpl.title}.`);
  };

  const handleDeleteRecurring = (templateId: string) => {
    const updated = recurring.filter((r) => r.id !== templateId);
    setRecurring(updated);
    saveRecurring(updated);
    addToast('info', 'Subscription Deleted', 'Recurring contract removed.');
  };

  // Settings Handlers
  const handleSaveSettings = (newSettings: BusinessSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    addToast('success', 'Settings Saved', 'Business and tax configurations updated.');
  };

  const handleWipeEntireWebsite = () => {
    const wiped = wipeEntireWebsite();
    setInvoices(wiped.invoices);
    setClients(wiped.clients);
    setQuotes(wiped.quotes);
    setRecurring(wiped.recurring);
    setSettings(wiped.settings);
    setViewingInvoice(null);
    setEditingInvoice(null);
    setIsCreatingInvoice(false);
    addToast('info', 'Website Reset', 'All website data deleted and business profile set to blank.');
  };

  const handleClearInvoicesOnly = () => {
    clearAllInvoices();
    setInvoices([]);
    setViewingInvoice(null);
    setEditingInvoice(null);
    addToast('info', 'Invoices Cleared', 'All invoices have been deleted.');
  };

  const handleClearClientsOnly = () => {
    clearAllClients();
    setClients([]);
    addToast('info', 'Clients Cleared', 'All clients have been removed from CRM.');
  };

  const handleClearQuotesOnly = () => {
    clearAllQuotes();
    setQuotes([]);
    addToast('info', 'Quotes Cleared', 'All quotes have been deleted.');
  };

  const handleClearRecurringOnly = () => {
    clearAllRecurring();
    setRecurring([]);
    addToast('info', 'Retainers Cleared', 'All recurring subscriptions have been deleted.');
  };

  const handleRestoreDemoData = () => {
    const demo = resetToDemoData();
    setInvoices(demo.invoices);
    setClients(demo.clients);
    setQuotes(demo.quotes);
    setRecurring(demo.recurring);
    setSettings(demo.settings);
    addToast('success', 'Demo Data Restored', 'Sample demonstration invoices, clients, quotes, and agency settings loaded.');
  };

  // Render main content area
  const renderMainContent = () => {
    if (isCreatingInvoice || editingInvoice) {
      return (
        <InvoiceEditor
          invoiceToEdit={editingInvoice}
          clients={clients}
          settings={settings}
          onSave={handleSaveInvoice}
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
            clients={clients}
            onNewInvoice={() => setIsCreatingInvoice(true)}
            onNewClient={() => setActiveTab('clients')}
            onNewQuote={() => setActiveTab('quotes')}
            onViewInvoice={(inv) => setViewingInvoice(inv)}
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
            onMarkPaid={(id) => handleMarkPaid(id)}
            onDuplicateInvoice={(inv) => handleDuplicateInvoice(inv)}
            onDeleteInvoice={(id) => handleDeleteInvoice(id)}
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
      case 'clients':
        return (
          <ClientList
            clients={clients}
            invoices={invoices}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
          />
        );
      case 'recurring':
        return (
          <RecurringList
            recurring={recurring}
            clients={clients}
            settings={settings}
            onGenerateInvoice={handleGenerateRecurringInvoice}
            onAddRecurring={handleAddRecurring}
            onDeleteRecurring={handleDeleteRecurring}
          />
        );
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onWipeEntireWebsite={handleWipeEntireWebsite}
            onClearInvoices={handleClearInvoicesOnly}
            onClearClients={handleClearClientsOnly}
            onClearQuotes={handleClearQuotesOnly}
            onClearRecurring={handleClearRecurringOnly}
            onRestoreDemoData={handleRestoreDemoData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Top Navigation Header Bar */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.45rem', background: '#18181b', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }}
            aria-label="Toggle Navigation Menu"
          >
            <Menu size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#ffffff', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/favicon.png" alt="Highphaus Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>HIGHPHAUS</span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.45rem 0.65rem' }}
          title="Switch Theme"
        >
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </header>

      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`mobile-drawer-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setIsCreatingInvoice(false);
          setEditingInvoice(null);
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        onNewInvoice={() => {
          setEditingInvoice(null);
          setIsCreatingInvoice(true);
          setIsMobileMenuOpen(false);
        }}
        theme={theme}
        toggleTheme={toggleTheme}
        companyName={settings.companyName}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="main-content">{renderMainContent()}</main>

      {/* Printable Invoice Modal */}
      {viewingInvoice && (
        <InvoiceViewModal
          invoice={viewingInvoice}
          settings={settings}
          onClose={() => setViewingInvoice(null)}
          onMarkPaid={(id, method) => handleMarkPaid(id, method)}
        />
      )}

      {/* Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
