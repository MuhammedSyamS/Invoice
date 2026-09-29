import React, { useState } from 'react';
import type { BusinessSettings } from '../types/invoice';
import {
  FileText,
  Receipt,
  CreditCard,
  Search,
  MessageSquare,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

interface HelpSupportViewProps {
  settings: BusinessSettings;
}

export const HelpSupportView: React.FC<HelpSupportViewProps> = ({ settings }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const guides = [
    {
      title: 'Differences Between Invoices and Bills',
      category: 'Billing Architecture',
      description:
        'Invoices are formal billing contracts sent to enterprise clients with due dates and credit terms (e.g. Net 15/30). Bills are instantaneous sales documents or POS counter receipts settled immediately via UPI, Cash, or Card.',
      icon: FileText,
    },
    {
      title: 'Configuring Indian GST (CGST, SGST & IGST)',
      category: 'Tax & Compliance',
      description:
        'For intra-state transactions within your registered state, the system splits taxes equally into CGST and SGST. For inter-state transactions, toggle the Inter-State (IGST) switch to apply full integrated tax.',
      icon: Receipt,
    },
    {
      title: 'Recording Partial Payments & Overpayment Protection',
      category: 'Payments',
      description:
        'Track multiple installment payments against a single invoice or bill. The system automatically recalculates outstanding balance and transitions status from Unpaid -> Partially Paid -> Fully Paid.',
      icon: CreditCard,
    },
    {
      title: 'High-Fidelity PDF Generation & Printing',
      category: 'Document Export',
      description:
        'Export crisp A4 PDF documents with customized company logo, authorized signature lines, bank wire directions, and amount in words formatted according to the Indian numbering system (Lakhs & Crores).',
      icon: BookOpen,
    },
  ];

  const filteredGuides = guides.filter(
    (g) =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px' }}>
      <div>
        <h1 className="page-title">Help & Documentation Center</h1>
        <p className="page-subtitle">
          Comprehensive operational guides, Indian tax compliance rules, and direct assistance for {settings.companyName || 'Highphaus SaaS'}.
        </p>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={18}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search guides, GST questions, payment help, or export tips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem', height: '42px', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {/* Guides Grid */}
      <div className="grid-2">
        {filteredGuides.map((guide, idx) => {
          const Icon = guide.icon;
          return (
            <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {guide.category}
                  </div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {guide.title}
                  </h3>
                </div>
              </div>

              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {guide.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Direct Support Card */}
      <div className="card" style={{ background: 'var(--bg-card-light)', borderColor: 'var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Need Technical Assistance or Custom Integrations?
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Contact your designated enterprise account team or submit support tickets directly.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <a
              href={`mailto:${settings.email || 'billing@highphaus.com'}`}
              className="btn btn-secondary"
            >
              <MessageSquare size={14} />
              <span>Email Support</span>
            </a>
            <a
              href="https://www.highphaus.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <span>Visit Agency Portal</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
