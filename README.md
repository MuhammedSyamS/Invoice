# Highphaus Invoicing & Billing SaaS — Production Handover Guide

An enterprise-grade B2B Invoicing, POS/Retail Billing, and Payment Settlement SaaS engineered for creative agencies and service businesses. Built with React 19, TypeScript, Vite, Recharts, and jsPDF.

---

## 🚀 Key Modules & Architecture

1. **Dashboard & Command Center**: Real-time cash flow overview, realized collections vs outstanding receivables, overdue invoice alerts, interactive 6-month financial area chart, portfolio status breakdown, and recent billing activity.
2. **Invoices Directory & Ledger**: Multi-state invoicing (Draft, Sent, Paid, Partially Paid, Overdue, Cancelled), full A4-spec PDF generation, GST tax breakdown (CGST/SGST/IGST), line-item math, duplicate invoice, and CSV ledger export.
3. **Quick Bills & POS Counter**: Fast sales receipt creation, instant payment logging, HSN/SAC Indian tax compliance, balance tracking, and customer history.
4. **Customer & Client CRM**: Client profiles, legal billing address, GSTIN registration, PAN number, and real-time lifetime billed vs outstanding due analytics.
5. **Product & Service Catalog**: Inventory catalog with pre-configured unit pricing, GST tax tiers, and quick-add during invoice/bill authoring.
6. **Payments Ledger & Settlements**: Multi-channel payment recording (UPI, Bank Wire/NEFT, Credit/Debit Cards, Cash, Cheque), reference/UTR tracking, and automatic invoice balance settlement.
7. **Proposals & Quotes**: Client estimates, automated conversion into live active invoices with 1 click.
8. **Expense Tracker & Financial Reports**: Operational expense tracking, category breakdown, net profit & loss, GST tax summary, and annual performance.
9. **SaaS Billing & Team Management**: Multi-tier subscription model (Starter, Growth Agency, Enterprise Scale), role-based permissions (Owner, Admin, Accountant, Member), and immutable audit logs.
10. **Company Settings & Branding**: Custom business name, tagline, address, GSTIN, PAN, bank account details, UPI ID, logo upload (max 2MB), and demo data reset/wipe tools.

---

## 📱 Responsive & Cross-Device Engineering

The application has been audited and verified across all target viewports:
- **Mobile Viewports**: 320px, 360px, 375px, 390px, 393px, 412px, 414px, 430px, 480px
- **Mobile Landscape**: 844x390px, 800x360px (zero horizontal overflow verified)
- **Tablet Viewports**: 600px, 768px, 820px, 834px, 912px, 1024px
- **Desktop & Laptop**: 1280px, 1366px, 1440px, 1536px, 1920px

### Responsive UX Enhancements:
- **Intelligent Table-to-Card Switching**: Complex multi-column data tables (Invoices, Bills, Payments) automatically transform into structured, touch-friendly mobile cards on screens $\le 768\text{px}$.
- **Line Item Authoring on Mobile**: Bill and invoice line-item inputs transform into stacked card forms with full-width inputs, 2x2 numeric grids, and dedicated action rows on mobile screens.
- **Touch-First Controls**: All interactive buttons, tabs, dropdowns, and form inputs meet mobile accessibility touch target requirements ($\ge 36\text{px} - 44\text{px}$).
- **Accidental Tap Safety**: Destructive operations (deleting an invoice, bill, customer, product, quote, or team member) require explicit confirmation dialogs with clear explanations.

---

## 🛠️ Tech Stack & Scripts

- **UI Framework**: React 19 (`react`, `react-dom`)
- **Language**: TypeScript (`tsc -b`)
- **Bundler & Tooling**: Vite 8, oxlint
- **Icons & Visuals**: `lucide-react`
- **Charts & Visualizations**: `recharts`
- **PDF Generation**: `jspdf` + `html2canvas`

### Available NPM Scripts:

```bash
# Run local development server
npm run dev

# Run TypeScript compilation and production bundle build
npm run build

# Run linting verification (0 errors, 0 warnings)
npm run lint

# Preview the production build locally
npm run preview
```

---

## 🔒 Security & Data Integrity

- **Strict Financial Engine**: Calculations in `src/services/calculationEngine.ts` prevent negative quantities, calculate pro-rata discounts across line items, validate CGST/SGST/IGST tax distribution, and handle round-offs without floating-point inaccuracies.
- **Tenant Isolation & Local Storage Schema**: Versioned storage keys (`highphaus_*_v11`) isolate invoice records, settings, audit logs, and payments.
- **No Hardcoded Secrets**: Zero API keys or private credentials are embedded in client source code.

---

## 🌐 Deployment to Production

The application is pre-configured for instant zero-config deployment on **Vercel**, **Netlify**, or standard static hosting:

1. **Vercel**: Configuration is provided in [vercel.json](file:///c:/Users/Admin/Desktop/invoice%20saas/vercel.json):
   - Build Command: `npm --prefix frontend install --include=dev && npm --prefix frontend run build`
   - Output Directory: `frontend/dist`
2. **Standard Static Server / Nginx**:
   - Serve the output folder `frontend/dist`.
   - Ensure Single Page Application (SPA) fallback routing to `/index.html`.
