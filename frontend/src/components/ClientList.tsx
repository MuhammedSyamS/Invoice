import React, { useState } from 'react';
import type { Client, Invoice } from '../types/invoice';
import { getCurrencySymbol } from '../services/storageService';
import {
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  MapPin,
  X,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';

interface ClientListProps {
  clients: Client[];
  invoices: Invoice[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
}

export const ClientList: React.FC<ClientListProps> = ({
  clients,
  invoices,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClientDetails, setViewingClientDetails] = useState<Client | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [taxId, setTaxId] = useState('');

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setCountry('');
    setTaxId('');
    setShowModal(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setCompany(client.company);
    setEmail(client.email);
    setPhone(client.phone);
    setAddress(client.address);
    setCity(client.city);
    setCountry(client.country);
    setTaxId(client.taxId);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !email) return;

    const newClient: Client = {
      id: editingClient?.id || `cli-${Date.now()}`,
      name,
      company,
      email,
      phone,
      address,
      city,
      country,
      taxId,
      createdAt: editingClient?.createdAt || new Date().toISOString().slice(0, 10),
    };

    if (editingClient) {
      onUpdateClient(newClient);
    } else {
      onAddClient(newClient);
    }
    setShowModal(false);
  };

  const filteredClients = clients.filter((c) =>
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClientMetrics = (clientId: string) => {
    const clientInvoices = invoices.filter((i) => i.clientId === clientId);
    const totalBilled = clientInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalPaid = clientInvoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + i.total, 0);
    const totalPending = totalBilled - totalPaid;

    return { totalBilled, totalPaid, totalPending, invoiceCount: clientInvoices.length, clientInvoices };
  };

  const formatAmount = (num: number, currencyCode: string = 'INR') => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Client Accounts CRM
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Highphaus Creative Agency client accounts, billing addresses, GSTIN registrations, and balance metrics.
          </p>
        </div>

        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={18} />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search clients by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.3rem' }}
          />
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid-3">
        {filteredClients.map((client) => {
          const { totalBilled, invoiceCount } = getClientMetrics(client.id);

          return (
            <div key={client.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                      <Building size={20} color="var(--text-primary)" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {client.company}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {client.name}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => setViewingClientDetails(client)} className="btn btn-secondary btn-sm" title="View Account History">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => openEditModal(client)} className="btn btn-secondary btn-sm" title="Edit Client">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => onDeleteClient(client.id)} className="btn btn-danger btn-sm" title="Delete Client">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Mail size={14} color="var(--text-muted)" />
                    <span>{client.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={14} color="var(--text-muted)" />
                    <span>{client.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={14} color="var(--text-muted)" />
                    <span>{client.city}, {client.country}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Invoices</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{invoiceCount} Issued</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Lifetime Billed</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{formatAmount(totalBilled)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Client Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {editingClient ? 'Edit Client Account' : 'Add New Client Account'}
              </h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Apex Apparel & Lifestyle Brands"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Person Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Robert Sterling"
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="billing@company.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                    placeholder="+91 98000 00000"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Billing Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="form-input"
                  placeholder="Street Address, Corporate Hub/Tower"
                />
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="form-input font-mono"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <span>{editingClient ? 'Update Client' : 'Save Client'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Detail History Modal */}
      {viewingClientDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {viewingClientDetails.company}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {viewingClientDetails.name} • {viewingClientDetails.email}
                </div>
              </div>
              <button onClick={() => setViewingClientDetails(null)} className="btn btn-secondary btn-sm">
                <X size={16} />
              </button>
            </div>

            {(() => {
              const metrics = getClientMetrics(viewingClientDetails.id);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="grid-3" style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lifetime Billed</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatAmount(metrics.totalBilled)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Paid</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatAmount(metrics.totalPaid)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Outstanding Balance</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{formatAmount(metrics.totalPending)}</div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                      Invoice History ({metrics.invoiceCount})
                    </h4>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.clientInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                                No invoices issued yet for this client.
                              </td>
                            </tr>
                          ) : (
                            metrics.clientInvoices.map((inv) => (
                              <tr key={inv.id}>
                                <td className="font-mono" style={{ fontWeight: 800 }}>{inv.invoiceNumber}</td>
                                <td>{inv.issueDate}</td>
                                <td style={{ fontWeight: 800 }}>{formatAmount(inv.total, inv.currency)}</td>
                                <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
