import React, { useState, useRef } from 'react';
import type { Quote, Client, BusinessSettings, LineItem } from '../types/invoice';
import { DEFAULT_CURRENCIES, getCurrencySymbol } from '../services/storageService';
import {
  Plus,
  ArrowRightLeft,
  Search,
  Trash2,
  X,
  Eye,
  Printer,
  Download,
  Globe,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface QuotesListProps {
  quotes: Quote[];
  clients: Client[];
  settings: BusinessSettings;
  onConvertQuoteToInvoice: (quote: Quote) => void;
  onAddQuote: (quote: Quote) => void;
  onDeleteQuote: (quoteId: string) => void;
}

export const QuotesList: React.FC<QuotesListProps> = ({
  quotes,
  clients,
  settings,
  onConvertQuoteToInvoice,
  onAddQuote,
  onDeleteQuote,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);

  // Form State for Multi-Item Quotes
  const [selectedClientId, setSelectedClientId] = useState<string>(() => clients[0]?.id || '');
  const [quoteNumber, setQuoteNumber] = useState<string>(
    () => `HP-QUO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [currency, setCurrency] = useState<string>(() => settings.currency || 'INR');
  const [items, setItems] = useState<LineItem[]>([
    {
      id: 'qitem-1',
      description: 'Comprehensive Creative Marketing Campaign Strategy & Motion Graphics Package',
      quantity: 1,
      unitPrice: 150000,
      taxRate: settings.defaultTaxRate || 18,
      amount: 150000,
    },
  ]);
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Highphaus Agency proposal valid for 30 days.');
  const [terms, setTerms] = useState<string>('Standard Highphaus Creative Marketing Agency Terms Apply.');

  const quoteRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const currencySymbol = getCurrencySymbol(currency);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `qitem-${Date.now()}`,
        description: 'UGC Video Shoot & Creative Motion Graphics Package',
        quantity: 1,
        unitPrice: 35000,
        taxRate: settings.defaultTaxRate || 18,
        amount: 35000,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
    setItems(
      items.map((i) => {
        if (i.id === id) {
          const updated = { ...i, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updated.amount = Number(updated.quantity) * Number(updated.unitPrice);
          }
          return updated;
        }
        return i;
      })
    );
  };

  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const discountTotal = (subtotal * discountRate) / 100;
    const taxable = Math.max(0, subtotal - discountTotal);
    const taxTotal = (taxable * (settings.defaultTaxRate || 18)) / 100;
    const total = taxable + taxTotal;

    const newQuote: Quote = {
      id: `quo-${Date.now()}`,
      quoteNumber,
      clientId: selectedClientId,
      clientName: selectedClient?.name || 'Client',
      clientCompany: selectedClient?.company || 'Organization',
      clientEmail: selectedClient?.email || 'email@client.com',
      issueDate: new Date().toISOString().slice(0, 10),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      items,
      subtotal,
      taxTotal,
      discountRate,
      discountTotal,
      total,
      status: 'sent',
      notes,
      terms,
      currency,
      createdAt: new Date().toISOString(),
    };

    onAddQuote(newQuote);
    setShowModal(false);
  };

  const handleDownloadPDF = async () => {
    if (!quoteRef.current || !viewingQuote) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(quoteRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${viewingQuote.quoteNumber}.pdf`);
    } catch (err) {
      console.error('Error printing quote:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const filteredQuotes = quotes.filter(
    (q) =>
      q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.clientCompany.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatAmount = (num: number, code?: string) => {
    const symbol = code ? getCurrencySymbol(code) : currencySymbol;
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Commercial Proposals & Quotes
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Draft proposals for Highphaus Creative Marketing Agency (www.highphaus.com) and convert into invoices.
          </p>
        </div>

        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} />
          <span>New Proposal Quote</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search proposals by quote # or client company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.3rem' }}
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="table-container responsive-desktop-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quote #</th>
              <th>Client Company</th>
              <th>Issue Date</th>
              <th>Valid Until</th>
              <th>Estimate Total</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No campaign quotes found.
                </td>
              </tr>
            ) : (
              filteredQuotes.map((quote) => (
                <tr key={quote.id}>
                  <td className="font-mono" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                    {quote.quoteNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{quote.clientCompany}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{quote.clientName}</div>
                  </td>
                  <td>{quote.issueDate}</td>
                  <td>{quote.validUntil}</td>
                  <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatAmount(quote.total, quote.currency)}
                  </td>
                  <td>
                    <span className={`badge badge-${quote.status === 'converted' ? 'paid' : quote.status === 'accepted' ? 'sent' : 'draft'}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => setViewingQuote(quote)}
                        className="btn btn-secondary btn-sm"
                        title="View / Print Proposal PDF"
                      >
                        <Eye size={14} />
                      </button>
                      {quote.status !== 'converted' ? (
                        <button
                          onClick={() => onConvertQuoteToInvoice(quote)}
                          className="btn btn-primary btn-sm"
                          title="Convert into Active Invoice"
                        >
                          <ArrowRightLeft size={14} />
                          <span>Convert to Invoice</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                          Converted
                        </span>
                      )}
                      <button
                        onClick={() => onDeleteQuote(quote.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete Quote"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Touch Cards View */}
      <div className="responsive-mobile-cards">
        {filteredQuotes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No campaign quotes found.
          </div>
        ) : (
          filteredQuotes.map((quote) => (
            <div key={`m-quote-${quote.id}`} className="mobile-data-card">
              <div className="mobile-data-card-header">
                <div>
                  <div className="font-mono" style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {quote.quoteNumber}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {quote.clientCompany}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {quote.clientName}
                  </div>
                </div>
                <span className={`badge badge-${quote.status === 'converted' ? 'paid' : quote.status === 'accepted' ? 'sent' : 'draft'}`}>
                  {quote.status}
                </span>
              </div>

              <div className="mobile-data-card-meta">
                <div className="mobile-data-card-meta-row">
                  <span className="mobile-data-card-meta-label">Valid Period</span>
                  <span className="mobile-data-card-meta-value">{quote.issueDate} &rarr; {quote.validUntil}</span>
                </div>
                <div className="mobile-data-card-meta-row">
                  <span className="mobile-data-card-meta-label">Quote Estimate</span>
                  <span className="mobile-data-card-meta-value" style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                    {formatAmount(quote.total, quote.currency)}
                  </span>
                </div>
              </div>

              <div className="mobile-data-card-actions" style={{ flexWrap: 'wrap' }}>
                <button
                  onClick={() => setViewingQuote(quote)}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, minHeight: '36px' }}
                >
                  <Eye size={14} />
                  <span>View PDF</span>
                </button>

                {quote.status !== 'converted' ? (
                  <button
                    onClick={() => onConvertQuoteToInvoice(quote)}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1.4, minHeight: '36px' }}
                  >
                    <ArrowRightLeft size={14} />
                    <span>Convert</span>
                  </button>
                ) : (
                  <span className="badge badge-paid" style={{ padding: '0.4rem 0.6rem' }}>
                    Converted
                  </span>
                )}

                <button
                  onClick={() => onDeleteQuote(quote.id)}
                  className="btn btn-danger btn-sm"
                  style={{ minHeight: '36px', padding: '0 0.65rem' }}
                  title="Delete Quote"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>


      {/* Create Quote Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Create Campaign Proposal Quote
              </h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateQuote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Client Organization</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="form-select"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quote #</label>
                  <input
                    type="text"
                    value={quoteNumber}
                    onChange={(e) => setQuoteNumber(e.target.value)}
                    className="form-input font-mono"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="form-select"
                >
                  {DEFAULT_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Campaign Scope Items</label>
                  <button type="button" onClick={handleAddItem} className="btn btn-outline btn-sm">
                    <Plus size={14} /> Add Item
                  </button>
                </div>

                {items.map((item) => (
                  <div key={item.id} className="quote-item-grid" style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <input
                      type="text"
                      placeholder="Campaign scope..."
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="form-input"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                      className="form-input font-mono"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                      className="form-input font-mono"
                    />
                    <button type="button" onClick={() => handleRemoveItem(item.id)} className="btn btn-danger btn-sm" disabled={items.length <= 1}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Discount Rate (%)</label>
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
                  <label className="form-label">Proposal Terms</label>
                  <input
                    type="text"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Proposal Validity Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <span>Issue Campaign Proposal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quote Preview Modal */}
      {viewingQuote && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="no-print" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-sidebar)' }}>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                Campaign Proposal ({viewingQuote.quoteNumber})
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="btn btn-secondary btn-sm">
                  <Download size={14} /> {isGeneratingPdf ? 'Generating...' : 'PDF'}
                </button>
                <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => setViewingQuote(null)} className="btn btn-secondary btn-sm">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ padding: '0.5rem', background: '#ffffff', color: '#09090b', overflowX: 'auto' }}>
              <div ref={quoteRef} className="printable-invoice" style={{ padding: '1.5rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #09090b', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {settings.showLogo !== false && (settings.logoUrl || settings.companyName) && (
                        <img src={settings.logoUrl || "/favicon.png"} alt={settings.companyName || "Logo"} style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
                      )}
                      {settings.companyName && <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#09090b' }}>{settings.companyName}</h2>}
                    </div>
                    {settings.website && (
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Globe size={12} /> {settings.website}
                      </div>
                    )}
                    {settings.address && <div style={{ fontSize: '0.8rem', color: '#52525b', marginTop: '0.2rem' }}>{settings.address}</div>}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#09090b', textTransform: 'uppercase' }}>CAMPAIGN PROPOSAL</h2>
                    <div className="font-mono" style={{ fontWeight: 800 }}>{viewingQuote.quoteNumber}</div>
                    <div style={{ fontSize: '0.8rem', color: '#52525b' }}>Valid Until: <strong>{viewingQuote.validUntil}</strong></div>
                  </div>
                </div>

                <div style={{ background: '#f4f4f5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e4e4e7' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#71717a', textTransform: 'uppercase' }}>PREPARED FOR</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#09090b' }}>{viewingQuote.clientCompany}</div>
                  <div style={{ fontSize: '0.85rem', color: '#3f3f46' }}>{viewingQuote.clientName} ({viewingQuote.clientEmail})</div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                  <thead>
                    <tr style={{ background: '#09090b', color: '#ffffff', textAlign: 'left' }}>
                      <th style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>Services & Deliverables</th>
                      <th style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Rate</th>
                      <th style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingQuote.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e4e4e7' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{item.description}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{formatAmount(item.unitPrice, viewingQuote.currency)}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800 }}>{formatAmount(item.quantity * item.unitPrice, viewingQuote.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                  <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                      <span>Subtotal:</span>
                      <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(viewingQuote.subtotal, viewingQuote.currency)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                      <span>GST / Tax Total:</span>
                      <span style={{ fontWeight: 700, color: '#09090b' }}>{formatAmount(viewingQuote.taxTotal, viewingQuote.currency)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #09090b', paddingTop: '0.4rem', fontSize: '1.1rem', fontWeight: 900, color: '#09090b' }}>
                      <span>Estimated Total:</span>
                      <span>{formatAmount(viewingQuote.total, viewingQuote.currency)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '1rem', fontSize: '0.75rem', color: '#52525b', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#09090b' }}>{viewingQuote.terms}</div>
                  <div style={{ marginTop: '0.2rem' }}>{viewingQuote.notes}</div>
                  {settings.companyName && (
                    <div style={{ marginTop: '0.5rem', color: '#71717a' }}>
                      {settings.companyName} {settings.website ? `(${settings.website})` : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
