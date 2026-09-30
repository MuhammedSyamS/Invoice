import React, { useState } from 'react';
import type { Client, Invoice, Bill, Payment } from '../types/invoice';
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
import { CI } from './ClearableInput';

interface ClientListProps {
  clients: Client[];
  invoices: Invoice[];
  bills?: Bill[];
  payments?: Payment[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
}

export const ClientList: React.FC<ClientListProps> = ({
  clients,
  invoices,
  bills = [],
  payments = [],
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
  const [pincode, setPincode] = useState('');
  const [taxId, setTaxId] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setCountry('India');
    setPincode('');
    setTaxId('');
    setPanNumber('');
    setNotes('');
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
    setPincode(client.pincode || '');
    setTaxId(client.taxId);
    setPanNumber(client.panNumber || '');
    setNotes(client.notes || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() && !name.trim()) return;

    const newClient: Client = {
      id: editingClient?.id || `cli-${Date.now()}`,
      name: name.trim() || company.trim(),
      company: company.trim() || name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      country: country.trim() || 'India',
      pincode: pincode.trim(),
      taxId: taxId.trim(),
      panNumber: panNumber.trim(),
      notes: notes.trim(),
      createdAt: editingClient?.createdAt || new Date().toISOString().slice(0, 10),
    };

    if (editingClient) {
      onUpdateClient(newClient);
    } else {
      onAddClient(newClient);
    }
    setShowModal(false);
  };

  const filteredClients = clients.filter(
    (c) =>
      c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.taxId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClientMetrics = (clientId: string) => {
    const clientInvoices = invoices.filter((i) => i.clientId === clientId && i.status !== 'cancelled');
    const clientBills = bills.filter((b) => b.customerId === clientId && b.paymentStatus !== 'cancelled');
    const clientPayments = payments.filter((p) => p.customerId === clientId);

    const totalBilled =
      clientInvoices.reduce((sum, i) => sum + i.total, 0) +
      clientBills.reduce((sum, b) => sum + b.total, 0);

    const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = Math.max(0, totalBilled - totalPaid);

    return {
      totalBilled,
      totalPaid,
      totalPending,
      invoiceCount: clientInvoices.length,
      billCount: clientBills.length,
      clientInvoices,
      clientBills,
      clientPayments,
    };
  };

  const formatAmount = (num: number, currencyCode: string = 'INR') => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Customer & Client CRM</h1>
          <p className="page-subtitle">
            Manage corporate client accounts, billing addresses, GSTIN registrations, and payment balances.
          </p>
        </div>

        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={16} />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '0.85rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search customers by company, contact, or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.2rem' }}
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid-3">
        {filteredClients.map((client) => {
          const { totalBilled, totalPending } = getClientMetrics(client.id);

          return (
            <div key={client.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                      <Building size={18} color="var(--text-primary)" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {client.company}
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {client.name}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => setViewingClientDetails(client)} className="btn btn-secondary btn-sm" title="View Account History">
                      <Eye size={13} />
                    </button>
                    <button onClick={() => openEditModal(client)} className="btn btn-secondary btn-sm" title="Edit Profile">
                      <Edit size={13} />
                    </button>
                    <button onClick={() => onDeleteClient(client.id)} className="btn btn-danger btn-sm" title="Delete Profile">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.785rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {client.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Mail size={13} />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Phone size={13} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                      <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{client.address}{client.city ? `, ${client.city}` : ''}</span>
                    </div>
                  )}
                  {client.taxId && (
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      GSTIN: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{client.taxId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Balance Summary Footer */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <div>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>LIFETIME BILLED</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{formatAmount(totalBilled)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>OUTSTANDING DUE</div>
                  <div style={{ fontWeight: 800, color: totalPending > 0 ? 'var(--warning)' : 'var(--success)' }}>
                    {formatAmount(totalPending)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {editingClient ? 'Edit Customer Profile' : 'Add New Customer Profile'}
              </h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Company / Legal Business Name</label>
                  <CI type="text" value={company} onChange={(e) => setCompany(e.target.value)} onClear={() => setCompany('')} className="form-input" placeholder="e.g. Apex Apparel & Lifestyle" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Primary Contact Person</label>
                  <CI type="text" value={name} onChange={(e) => setName(e.target.value)} onClear={() => setName('')} className="form-input" placeholder="e.g. Robert Sterling" />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <CI type="email" value={email} onChange={(e) => setEmail(e.target.value)} onClear={() => setEmail('')} className="form-input" placeholder="billing@client.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <CI type="text" value={phone} onChange={(e) => setPhone(e.target.value)} onClear={() => setPhone('')} className="form-input" placeholder="+91..." />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Registered Office Address</label>
                <CI type="text" value={address} onChange={(e) => setAddress(e.target.value)} onClear={() => setAddress('')} className="form-input" placeholder="Street, Building, Area" />
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <CI type="text" value={city} onChange={(e) => setCity(e.target.value)} onClear={() => setCity('')} className="form-input" placeholder="Mumbai" />
                </div>
                <div className="form-group">
                  <label className="form-label">PIN Code</label>
                  <CI type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} onClear={() => setPincode('')} className="form-input font-mono" placeholder="400013" />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <CI type="text" value={country} onChange={(e) => setCountry(e.target.value)} onClear={() => setCountry('')} className="form-input" placeholder="India" />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">GSTIN (Optional)</label>
                  <CI type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} onClear={() => setTaxId('')} className="form-input font-mono" placeholder="27AAACH..." />
                </div>
                <div className="form-group">
                  <label className="form-label">PAN Number (Optional)</label>
                  <CI type="text" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} onClear={() => setPanNumber('')} className="form-input font-mono" placeholder="AAACH9042K" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Account Notes</label>
                <CI type="text" value={notes} onChange={(e) => setNotes(e.target.value)} onClear={() => setNotes('')} className="form-input" placeholder="Payment preferences or contract terms." />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>{editingClient ? 'Save Changes' : 'Save Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail History Modal */}
      {viewingClientDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {viewingClientDetails.company}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {viewingClientDetails.name} • {viewingClientDetails.email || 'No email'} • {viewingClientDetails.phone || 'No phone'}
                </div>
              </div>
              <button onClick={() => setViewingClientDetails(null)} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            {(() => {
              const metrics = getClientMetrics(viewingClientDetails.id);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="grid-3" style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LIFETIME BILLED</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatAmount(metrics.totalBilled)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL SETTLED</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>{formatAmount(metrics.totalPaid)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>BALANCE OUTSTANDING</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: metrics.totalPending > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                        {formatAmount(metrics.totalPending)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      Invoices & Bills Ledger ({metrics.clientInvoices.length + metrics.clientBills.length})
                    </h4>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Doc Type</th>
                            <th>Number</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.clientInvoices.length === 0 && metrics.clientBills.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                                No documents issued yet for this customer.
                              </td>
                            </tr>
                          ) : (
                            [
                              ...metrics.clientInvoices.map((i) => ({ type: 'Invoice', num: i.invoiceNumber, date: i.issueDate, total: i.total, status: i.status })),
                              ...metrics.clientBills.map((b) => ({ type: 'Bill', num: b.billNumber, date: b.billDate, total: b.total, status: b.paymentStatus })),
                            ].map((doc, idx) => (
                              <tr key={idx}>
                                <td><span className="badge badge-draft">{doc.type}</span></td>
                                <td className="font-mono" style={{ fontWeight: 700 }}>{doc.num}</td>
                                <td>{doc.date}</td>
                                <td style={{ fontWeight: 700 }}>{formatAmount(doc.total)}</td>
                                <td><span className={`badge badge-${doc.status}`}>{doc.status.replace('_', ' ')}</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {metrics.clientPayments.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Payment Receipts History ({metrics.clientPayments.length})
                      </h4>
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Receipt ID</th>
                              <th>Date</th>
                              <th>Method</th>
                              <th>Amount Paid</th>
                              <th>Reference #</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.clientPayments.map((p) => (
                              <tr key={p.id}>
                                <td className="font-mono" style={{ fontWeight: 700 }}>{p.id}</td>
                                <td>{p.paymentDate}</td>
                                <td>{p.paymentMethod}</td>
                                <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatAmount(p.amount)}</td>
                                <td className="font-mono" style={{ fontSize: '0.75rem' }}>{p.referenceNumber}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
