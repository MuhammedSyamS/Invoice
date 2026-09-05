import React, { useState } from 'react';
import type { RecurringTemplate, Client, BusinessSettings } from '../types/invoice';
import { DEFAULT_CURRENCIES, getCurrencySymbol } from '../services/storageService';
import {
  Repeat,
  Plus,
  Zap,
  Trash2,
  X,
} from 'lucide-react';

interface RecurringListProps {
  recurring: RecurringTemplate[];
  clients: Client[];
  settings: BusinessSettings;
  onGenerateInvoice: (template: RecurringTemplate) => void;
  onAddRecurring: (template: RecurringTemplate) => void;
  onDeleteRecurring: (templateId: string) => void;
}

export const RecurringList: React.FC<RecurringListProps> = ({
  recurring,
  clients,
  settings,
  onGenerateInvoice,
  onAddRecurring,
  onDeleteRecurring,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('Monthly Performance Marketing Retainer');
  const [selectedClientId, setSelectedClientId] = useState<string>(() => clients[0]?.id || '');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');
  const [amount, setAmount] = useState(125000);
  const [currency, setCurrency] = useState<string>(() => settings.currency || 'INR');

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleCreateRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    const newTemplate: RecurringTemplate = {
      id: `rec-${Date.now()}`,
      title,
      clientId: selectedClientId,
      clientName: selectedClient?.name || 'Client',
      clientCompany: selectedClient?.company || 'Company',
      frequency,
      items: [
        {
          id: `ritem-${Date.now()}`,
          description: title,
          quantity: 1,
          unitPrice: Number(amount),
          taxRate: settings.defaultTaxRate || 18,
          amount: Number(amount),
        },
      ],
      amount: Number(amount),
      currency,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'active',
    };

    onAddRecurring(newTemplate);
    setShowModal(false);
  };

  const formatAmount = (num: number, code?: string) => {
    const symbol = code ? getCurrencySymbol(code) : getCurrencySymbol(currency);
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Agency Retainers & Recurring Contracts
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Manage ongoing client retainers for Highphaus Creative Digital Marketing Agency (www.highphaus.com).
          </p>
        </div>

        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} />
          <span>New Agency Retainer</span>
        </button>
      </div>

      {/* Grid of Templates */}
      <div className="grid-2">
        {recurring.map((tmpl) => (
          <div key={tmpl.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                    <Repeat size={20} color="var(--text-primary)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {tmpl.title}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {tmpl.clientCompany} ({tmpl.clientName})
                    </div>
                  </div>
                </div>

                <span className={`badge badge-${tmpl.status === 'active' ? 'sent' : 'draft'}`}>
                  {tmpl.frequency} • {tmpl.status}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cycle Amount</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatAmount(tmpl.amount, tmpl.currency)} / {tmpl.frequency.slice(0, -2)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Next Billing Date</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {tmpl.nextDueDate}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
              <button
                onClick={() => onGenerateInvoice(tmpl)}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
              >
                <Zap size={14} />
                <span>Trigger Invoice Now</span>
              </button>

              <button
                onClick={() => onDeleteRecurring(tmpl.id)}
                className="btn btn-danger btn-sm"
                title="Delete Contract"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Create Recurring Agency Retainer
              </h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRecurring}>
              <div className="form-group">
                <label className="form-label">Retainer Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

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

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Billing Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e: any) => setFrequency(e.target.value)}
                    className="form-select"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
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
              </div>

              <div className="form-group">
                <label className="form-label">Amount per Retainer Cycle</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="form-input font-mono"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <span>Save Retainer Contract</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
