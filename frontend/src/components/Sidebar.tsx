import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Package,
  CreditCard,
  PieChart,
  BarChart3,
  Sparkles,
  Settings,
  ShieldCheck,
  HelpCircle,
  Plus,
  Sun,
  Moon,
  X,
  FileCheck,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'analytics'
  | 'invoices'
  | 'bills'
  | 'customers'
  | 'products'
  | 'payments'
  | 'expenses'
  | 'reports'
  | 'quotes'
  | 'billing'
  | 'settings'
  | 'team'
  | 'help';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onNewInvoice: () => void;
  onNewBill: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  companyName: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onNewInvoice,
  onNewBill,
  theme,
  toggleTheme,
  companyName,
  isOpen = false,
  onClose,
}) => {
  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'analytics' as NavTab, label: 'Enterprise Analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'SALES & BILLING',
      items: [
        { id: 'invoices' as NavTab, label: 'Invoices', icon: FileText },
        { id: 'bills' as NavTab, label: 'Quick Bills & POS', icon: Receipt },
        { id: 'quotes' as NavTab, label: 'Proposals & Quotes', icon: FileCheck },
        { id: 'customers' as NavTab, label: 'Customers', icon: Users },
        { id: 'products' as NavTab, label: 'Products & Services', icon: Package },
        { id: 'payments' as NavTab, label: 'Payments Ledger', icon: CreditCard },
      ],
    },
    {
      title: 'FINANCE & REPORTS',
      items: [
        { id: 'expenses' as NavTab, label: 'Expenses', icon: PieChart },
        { id: 'reports' as NavTab, label: 'Financial Reports', icon: BarChart3 },
      ],
    },
    {
      title: 'PLATFORM',
      items: [
        { id: 'billing' as NavTab, label: 'SaaS Subscription', icon: Sparkles },
        { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
        { id: 'team' as NavTab, label: 'Team & Roles', icon: ShieldCheck },
        { id: 'help' as NavTab, label: 'Help & Support', icon: HelpCircle },
      ],
    },
  ];

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    if (onClose) onClose();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: '#ffffff',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              <img
                src="/favicon.png"
                alt="Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {companyName || 'HIGHPHAUS'}
              </div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
                INVOICE & BILLING SAAS
              </div>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm sidebar-mobile-close"
              style={{ padding: '0.35rem 0.5rem' }}
              aria-label="Close Sidebar"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Quick Document Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
          <button
            onClick={() => {
              onNewInvoice();
              if (onClose) onClose();
            }}
            className="btn btn-primary btn-sm"
            style={{ width: '100%', gap: '0.3rem', fontSize: '0.75rem' }}
          >
            <Plus size={14} />
            <span>Invoice</span>
          </button>
          <button
            onClick={() => {
              onNewBill();
              if (onClose) onClose();
            }}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', gap: '0.3rem', fontSize: '0.75rem' }}
          >
            <Plus size={14} />
            <span>Bill</span>
          </button>
        </div>

        {/* Navigation Sections */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {navSections.map((sec) => (
            <div key={sec.title}>
              <div
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  padding: '0 0.5rem 0.35rem',
                }}
              >
                {sec.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.5rem 0.75rem',
                        minHeight: '38px',
                        touchAction: 'manipulation',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8125rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--primary-text)' : 'var(--text-secondary)',
                        background: isActive ? 'var(--primary)' : 'transparent',
                        cursor: 'pointer',
                        border: 'none',
                        textAlign: 'left',
                        transition: 'background 0.12s ease, color 0.12s ease',
                      }}
                    >
                      <Icon size={17} color={isActive ? 'var(--primary-text)' : 'currentColor'} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    </button>

                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer User Info & Theme Switcher */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'space-between', padding: '0.4rem 0.65rem' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            <span>{theme === 'dark' ? 'Dark Theme' : 'Light Theme'}</span>
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>TOGGLE</span>
        </button>
      </div>
    </aside>
  );
};
