import React, { useState } from 'react';
import type { SaaSSubscriptionState, SaaSSubscriptionPlan, BusinessSettings } from '../types/invoice';
import { getCurrencySymbol } from '../services/storageService';
import {
  Check,
  Shield,
  CreditCard,
  Zap,
  ArrowRight,
  Download,
  X,
} from 'lucide-react';

interface SaaSBillingViewProps {
  subscription: SaaSSubscriptionState;
  settings?: BusinessSettings;
  invoicesCount: number;
  billsCount: number;
  teamCount: number;
  onUpdateSubscription: (updated: SaaSSubscriptionState) => void;
}

export const SAAS_PLANS: SaaSSubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free Starter',
    priceMonthlyINR: 0,
    priceAnnualINR: 0,
    features: [
      'Up to 5 Invoices & Bills / month',
      '1 Team Member (Admin)',
      'Basic PDF Downloads',
      'Standard Currency Support',
    ],
    maxInvoicesPerMonth: 5,
    maxTeamMembers: 1,
    hasCustomBranding: false,
    hasPrioritySupport: false,
    hasGstReports: false,
  },
  {
    id: 'starter',
    name: 'Growth Agency',
    priceMonthlyINR: 1499,
    priceAnnualINR: 14990,
    features: [
      'Up to 100 Invoices & Bills / month',
      'Up to 3 Team Members',
      'Custom Brand Logo & Signature on PDFs',
      'Full GST HSN/SAC Indian Compliance',
      'Partial Payment Tracking & Receipts',
    ],
    maxInvoicesPerMonth: 100,
    maxTeamMembers: 3,
    hasCustomBranding: true,
    hasPrioritySupport: false,
    hasGstReports: true,
  },
  {
    id: 'pro',
    name: 'Professional B2B',
    priceMonthlyINR: 3499,
    priceAnnualINR: 34990,
    features: [
      'Unlimited Invoices, Bills & Quotes',
      'Up to 10 Team Members & Roles',
      'Automated Recurring Retainer Billing',
      'Comprehensive P&L & GST Audit Reports',
      'Razorpay / Stripe Payment Gateway Links',
      'Priority 24/7 Phone & WhatsApp Support',
    ],
    maxInvoicesPerMonth: 9999,
    maxTeamMembers: 10,
    hasCustomBranding: true,
    hasPrioritySupport: true,
    hasGstReports: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Custom',
    priceMonthlyINR: 7999,
    priceAnnualINR: 79990,
    features: [
      'Unlimited Everything & Multi-Entity',
      'Unlimited Team Members & Audit Trail',
      'Dedicated Account Manager',
      'Custom ERP & Tally Integration API',
      '99.9% SLA & Custom Domain SSL',
    ],
    maxInvoicesPerMonth: 99999,
    maxTeamMembers: 999,
    hasCustomBranding: true,
    hasPrioritySupport: true,
    hasGstReports: true,
  },
];

export const SaaSBillingView: React.FC<SaaSBillingViewProps> = ({
  subscription,
  invoicesCount,
  billsCount,
  teamCount,
  onUpdateSubscription,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>(
    subscription.billingCycle
  );
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState<SaaSSubscriptionPlan | null>(null);
  const [upgradeSuccessMessage, setUpgradeSuccessMessage] = useState<string | null>(null);

  const currentPlan =
    SAAS_PLANS.find((p) => p.id === subscription.currentPlanId) || SAAS_PLANS[1];

  const totalDocumentsThisMonth = invoicesCount + billsCount;
  const currencySymbol = getCurrencySymbol('INR');

  const handleUpgradePlan = (plan: SaaSSubscriptionPlan) => {
    setSelectedPlanToUpgrade(plan);
    setShowGatewayModal(true);
  };

  const handleConfirmSubscriptionChange = () => {
    if (!selectedPlanToUpgrade) return;

    const nextDate = new Date();
    if (billingCycle === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    const updated: SaaSSubscriptionState = {
      ...subscription,
      currentPlanId: selectedPlanToUpgrade.id,
      billingCycle,
      subscriptionStatus: 'active',
      nextBillingDate: nextDate.toISOString().slice(0, 10),
      paymentMethodSummary: 'UPI AutoPay (Highphaus Account)',
    };

    onUpdateSubscription(updated);
    setShowGatewayModal(false);
    setUpgradeSuccessMessage(
      `Your subscription has been switched to ${selectedPlanToUpgrade.name} (${billingCycle}).`
    );
    setTimeout(() => setUpgradeSuccessMessage(null), 5000);
  };

  // Mock platform invoices / receipts for this SaaS subscription
  const platformInvoices = [
    {
      id: 'SAAS-INV-2026-09',
      date: '2026-09-01',
      description: `Highphaus Invoice SaaS — ${currentPlan.name} Plan (${subscription.billingCycle})`,
      amount: billingCycle === 'monthly' ? currentPlan.priceMonthlyINR : currentPlan.priceAnnualINR,
      status: 'Paid',
    },
    {
      id: 'SAAS-INV-2026-08',
      date: '2026-08-01',
      description: `Highphaus Invoice SaaS — ${currentPlan.name} Plan (${subscription.billingCycle})`,
      amount: billingCycle === 'monthly' ? currentPlan.priceMonthlyINR : currentPlan.priceAnnualINR,
      status: 'Paid',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">SaaS Platform Billing & Subscription</h1>
          <p className="page-subtitle">
            Manage your Highphaus SaaS software license, billing frequency, quota limits, and payment gateway connections.
          </p>
        </div>

        {/* Billing Cycle Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.25rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`btn btn-sm ${billingCycle === 'monthly' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annually')}
            className={`btn btn-sm ${billingCycle === 'annually' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
          >
            <span>Annual Billing</span>
            <span style={{ fontSize: '0.65rem', background: 'var(--success)', color: '#ffffff', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 800 }}>
              SAVE 17%
            </span>
          </button>
        </div>
      </div>

      {upgradeSuccessMessage && (
        <div style={{ padding: '0.85rem 1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={18} />
          <span>{upgradeSuccessMessage}</span>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="card" style={{ background: 'var(--bg-card-light)', borderColor: 'var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="badge badge-active">{subscription.subscriptionStatus}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Renews on {subscription.nextBillingDate}
              </span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.45rem' }}>
              {currentPlan.name}
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Active license: {currencySymbol}
              {billingCycle === 'monthly'
                ? `${currentPlan.priceMonthlyINR.toLocaleString('en-IN')}/month`
                : `${currentPlan.priceAnnualINR.toLocaleString('en-IN')}/year`}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: '220px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              PAYMENT METHOD
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              <CreditCard size={16} />
              <span>{subscription.paymentMethodSummary}</span>
            </div>
          </div>
        </div>

        {/* Quota Progress Trackers */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Invoices & Bills Issued</span>
              <span style={{ fontWeight: 700 }}>
                {totalDocumentsThisMonth} / {currentPlan.maxInvoicesPerMonth >= 9999 ? 'Unlimited' : currentPlan.maxInvoicesPerMonth}
              </span>
            </div>
            <div style={{ height: '6px', width: '100%', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, (totalDocumentsThisMonth / Math.max(1, currentPlan.maxInvoicesPerMonth)) * 100)}%`,
                  background: 'var(--primary)',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Team Member Seats</span>
              <span style={{ fontWeight: 700 }}>
                {teamCount} / {currentPlan.maxTeamMembers} Seats
              </span>
            </div>
            <div style={{ height: '6px', width: '100%', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, (teamCount / Math.max(1, currentPlan.maxTeamMembers)) * 100)}%`,
                  background: 'var(--success)',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Encrypted Document Storage</span>
              <span style={{ fontWeight: 700 }}>{subscription.storageUsedMB} MB / 5,000 MB</span>
            </div>
            <div style={{ height: '6px', width: '100%', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(subscription.storageUsedMB / 5000) * 100}%`,
                  background: 'var(--info)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans Grid */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
          Available SaaS Plans
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Upgrade or change your plan anytime. Pro-rated billing applied automatically.
        </p>

        <div className="grid-4">
          {SAAS_PLANS.map((plan) => {
            const isCurrent = plan.id === subscription.currentPlanId;
            const price = billingCycle === 'monthly' ? plan.priceMonthlyINR : plan.priceAnnualINR;

            return (
              <div
                key={plan.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderColor: isCurrent ? 'var(--primary)' : undefined,
                  background: isCurrent ? 'var(--bg-card-light)' : undefined,
                  position: 'relative',
                }}
              >
                <div>
                  {isCurrent && (
                    <div style={{ position: 'absolute', top: '-10px', right: '12px' }}>
                      <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>
                        Current Active Plan
                      </span>
                    </div>
                  )}

                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {plan.name}
                  </div>

                  <div style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                      {price === 0 ? 'Free' : `${currencySymbol}${price.toLocaleString('en-IN')}`}
                    </span>
                    {price > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {plan.features.map((f, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                        <Check size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  {isCurrent ? (
                    <button className="btn btn-outline" style={{ width: '100%' }} disabled>
                      Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgradePlan(plan)}
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      <span>Switch to {plan.name}</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SaaS Subscription Invoices History */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
          Platform Subscription Invoices
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Download past tax receipts for your Highphaus SaaS software license subscription.
        </p>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Billing Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {platformInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-mono" style={{ fontWeight: 700 }}>{inv.id}</td>
                  <td>{inv.date}</td>
                  <td>{inv.description}</td>
                  <td style={{ fontWeight: 700 }}>{currencySymbol}{inv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td><span className="badge badge-paid">{inv.status}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => alert(`Downloading official platform GST receipt for ${inv.id}`)}
                      className="btn btn-secondary btn-sm"
                      title="Download SaaS Tax Receipt"
                    >
                      <Download size={13} />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gateway Checkout Modal Architecture */}
      {showGatewayModal && selectedPlanToUpgrade && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content" style={{ maxWidth: '480px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={18} color="var(--success)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Confirm Subscription Upgrade
                </h3>
              </div>
              <button onClick={() => setShowGatewayModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '1rem' }}>
              You are upgrading to <strong>{selectedPlanToUpgrade.name}</strong> on an{' '}
              <strong>{billingCycle}</strong> billing cycle.
            </div>

            <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Amount Due Today:</span>
              <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {currencySymbol}
                {(billingCycle === 'monthly'
                  ? selectedPlanToUpgrade.priceMonthlyINR
                  : selectedPlanToUpgrade.priceAnnualINR
                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.785rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Check size={14} color="var(--success)" />
                <span>Instant activation of all plan features</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Check size={14} color="var(--success)" />
                <span>Supports UPI AutoPay, Credit/Debit Cards & Net Banking</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Check size={14} color="var(--success)" />
                <span>Cancel anytime from settings with zero lock-in</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
              <button onClick={() => setShowGatewayModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleConfirmSubscriptionChange} className="btn btn-primary">
                <Zap size={14} />
                <span>Activate {selectedPlanToUpgrade.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
