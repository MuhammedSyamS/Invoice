import React, { useState } from 'react';
import type { Product, BusinessSettings } from '../types/invoice';
import { getCurrencySymbol } from '../services/storageService';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import { CI, CT } from './ClearableInput';

interface ProductListProps {
  products: Product[];
  settings: BusinessSettings;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  settings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(settings.defaultTaxRate || 18);
  const [hsnSac, setHsnSac] = useState('');
  const [unit, setUnit] = useState('unit');
  const [status, setStatus] = useState<'active' | 'archived'>('active');

  const currencySymbol = getCurrencySymbol(settings.currency);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setDescription('');
    setPrice(0);
    setTaxRate(settings.defaultTaxRate || 18);
    setHsnSac('');
    setUnit('unit');
    setStatus('active');
    setShowModal(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setSku(prod.sku);
    setDescription(prod.description);
    setPrice(prod.price);
    setTaxRate(prod.taxRate);
    setHsnSac(prod.hsnSac);
    setUnit(prod.unit);
    setStatus(prod.status);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalized: Product = {
      id: editingProduct?.id || `prod-${Date.now()}`,
      name: name.trim(),
      sku: sku.trim(),
      description: description.trim(),
      price: Math.max(0, Number(price) || 0),
      taxRate: Math.min(100, Math.max(0, Number(taxRate) || 0)),
      hsnSac: hsnSac.trim(),
      unit: unit.trim() || 'unit',
      status,
      createdAt: editingProduct?.createdAt || new Date().toISOString().slice(0, 10),
    };

    if (editingProduct) {
      onUpdateProduct(finalized);
    } else {
      onAddProduct(finalized);
    }
    setShowModal(false);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.hsnSac.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Products & Services Catalog</h1>
          <p className="page-subtitle">
            Manage your service offerings, default pricing, HSN/SAC codes, and GST rates for instant auto-fill on invoices & bills.
          </p>
        </div>

        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={16} />
          <span>Add Product / Service</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="filter-tabs-scroll">
            {(['all', 'active', 'archived'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`filter-tab-btn ${statusFilter === st ? 'active' : ''}`}
                style={{ textTransform: 'capitalize' }}
              >
                {st} ({st === 'all' ? products.length : products.filter((p) => p.status === st).length})
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search
              size={15}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by name, SKU, or HSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.2rem' }}
            />
          </div>
        </div>
      </div>

      {/* Catalog Table */}
      {/* Desktop Table View */}
      <div className="table-container responsive-desktop-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name & Description</th>
              <th>HSN/SAC</th>
              <th>Unit</th>
              <th>Rate / Price</th>
              <th>GST Rate</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Package size={24} />
                    </div>
                    <div className="empty-state-title">No products or services found</div>
                    <div className="empty-state-desc">
                      Add services or inventory items to speed up line item entry when drafting invoices and bills.
                    </div>
                    <button onClick={openAddModal} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
                      <Plus size={14} />
                      <span>Add Product / Service</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((prod) => (
                <tr key={prod.id}>
                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {prod.sku}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prod.name}</div>
                    {prod.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prod.description}
                      </div>
                    )}
                  </td>
                  <td className="font-mono">{prod.hsnSac || '-'}</td>
                  <td>{prod.unit}</td>
                  <td style={{ fontWeight: 700 }}>
                    {currencySymbol}{prod.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td>{prod.taxRate}%</td>
                  <td>
                    <span className={`badge badge-${prod.status}`}>
                      {prod.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => openEditModal(prod)}
                        className="btn btn-secondary btn-sm"
                        title="Edit Item"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(prod.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete Item"
                      >
                        <Trash2 size={13} />
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
        {filteredProducts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No products or services found. Tap 'Add Product / Service' to start.
          </div>
        ) : (
          filteredProducts.map((prod) => (
            <div key={`m-prod-${prod.id}`} className="mobile-data-card">
              <div className="mobile-data-card-header">
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {prod.name}
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    SKU: {prod.sku} {prod.hsnSac ? `• HSN/SAC: ${prod.hsnSac}` : ''}
                  </div>
                </div>
                <span className={`badge badge-${prod.status}`}>
                  {prod.status}
                </span>
              </div>

              {prod.description && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                  {prod.description}
                </div>
              )}

              <div className="mobile-data-card-meta">
                <div className="mobile-data-card-meta-row">
                  <span className="mobile-data-card-meta-label">Default Price</span>
                  <span className="mobile-data-card-meta-value" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {currencySymbol}{prod.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}> / {prod.unit}</span>
                  </span>
                </div>
                <div className="mobile-data-card-meta-row">
                  <span className="mobile-data-card-meta-label">GST Tax Rate</span>
                  <span className="mobile-data-card-meta-value font-mono">
                    {prod.taxRate}%
                  </span>
                </div>
              </div>

              <div className="mobile-data-card-actions">
                <button
                  onClick={() => openEditModal(prod)}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, minHeight: '36px' }}
                >
                  <Edit size={14} />
                  <span>Edit Item</span>
                </button>
                <button
                  onClick={() => onDeleteProduct(prod.id)}
                  className="btn btn-danger btn-sm"
                  style={{ minHeight: '36px', padding: '0 0.85rem' }}
                  title="Delete Item"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>


      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {editingProduct ? 'Edit Catalog Item' : 'New Product / Service'}
              </h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Item / Service Name</label>
                <CI type="text" value={name} onChange={(e) => setName(e.target.value)} onClear={() => setName('')} className="form-input" placeholder="e.g. SEO Retainer or Brand Identity Design" required />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">SKU / Item Code</label>
                  <CI type="text" value={sku} onChange={(e) => setSku(e.target.value)} onClear={() => setSku('')} className="form-input font-mono" placeholder="e.g. SRV-001" required />
                </div>
                <div className="form-group">
                  <label className="form-label">HSN / SAC Code</label>
                  <CI type="text" value={hsnSac} onChange={(e) => setHsnSac(e.target.value)} onClear={() => setHsnSac('')} className="form-input font-mono" placeholder="e.g. 998311" />
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Unit Price ({currencySymbol})</label>
                  <CI type="number" min="0" step="any" value={price} onChange={(e) => setPrice(Number(e.target.value))} onClear={() => setPrice(0)} className="form-input font-mono" required />
                </div>
                <div className="form-group">
                  <label className="form-label">GST Tax Rate (%)</label>
                  <CI type="number" min="0" max="100" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} onClear={() => setTaxRate(0)} className="form-input font-mono" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit of Measure</label>
                  <CI type="text" value={unit} onChange={(e) => setUnit(e.target.value)} onClear={() => setUnit('')} className="form-input" placeholder="e.g. mo, hrs, unit" required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Scope of Work</label>
                <CT value={description} onChange={(e) => setDescription(e.target.value)} onClear={() => setDescription('')} className="form-textarea" rows={2} placeholder="Detailed description that will appear on line items." />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'archived')}
                  className="form-select"
                >
                  <option value="active">Active (Available on Invoices & Bills)</option>
                  <option value="archived">Archived (Hidden from new entries)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={15} />
                  <span>{editingProduct ? 'Save Changes' : 'Create Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
