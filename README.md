# StockFlow - Inventory, POS & Business Management SaaS

StockFlow is a production-ready, multi-tenant inventory, point-of-sale (POS), and business operations SaaS designed for small retailers and wholesalers (clothing stores, phone shops, electronics, beauty/cosmetics, grocery marts, wholesale distributors, and online sellers).

---

## Key Features

- **Multi-Tenancy & Tenant Isolation**: Every product, inventory transaction, sale, customer, and setting is strictly scoped by server-side business resolution (`businessId`).
- **Multi-Location & Stock Transfers**: Manage multiple store branches / warehouses and execute atomic inter-store inventory transfers with ledger records.
- **Barcode & Price Tag Print Studio**: Generate Avery 30-up label sheets, shelf edge tags, and compact product barcode stickers.
- **Live Camera Barcode Scanner**: Built-in webcam / mobile camera barcode scanning directly inside the POS terminal.
- **Wholesale Quotations & Commercial Invoices**: Create pro-forma quotations and convert them to completed sales with 1 click, plus printable A4 commercial tax invoices.
- **Inventory Runout & Velocity Forecasting**: Daily sales velocity and stock runout risk predictor (`CRITICAL`, `LOW`, `OPTIMAL`, `OVERSTOCKED`) with 30-day replenishment recommendations.
- **Customer Store Credit & Account Balances**: Adjust and track customer credit balances.
- **Real-Time Point of Sale (POS)**:
  - Instant live product search by Name, SKU, and Barcode (UPC/EAN).
  - Barcode scanner keyboard-wedge support with rapid buffer parsing.
  - Line-item discounts, taxes, and cart-level order discounts.
  - Cash calculator with quick currency preset chips (`Exact`, `+$10`, `+$20`, `+$50`, `+$100`) and live change display.
  - Printable thermal 80mm/58mm format receipts and full invoice rendering.
- **Inventory Ledger & Safety Constraints**:
  - **Zero Silent Changes**: Every single stock increment or decrement writes an immutable entry into `InventoryMovement`.
  - Configurable **Negative Stock Restriction**: Enforces atomic transaction rollback if a sale exceeds available on-hand stock.
  - Low-stock and out-of-stock notification badges across top navbar and dashboard.
- **Product Management & CSV Import/Export**:
  - Full CRUD with SKUs, barcodes, categories, suppliers, cost price, selling price, min/max alert thresholds, and units.
  - Safe deletion protection: Automatically archives products with transaction history to preserve financial ledgers.
  - CSV Import wizard with column auto-mapping and row-by-row live validation error highlighter.
  - One-click CSV catalog export.
- **Purchase Orders (PO) & Receiving**:
  - Supplier order management with line items and expected delivery dates.
  - Receive Stock workflow: Receiving items atomically increments inventory and logs `PURCHASE` movements.
- **Itemized Sales Refunds**:
  - Partial or full line item returns, restocking switch, reason tracking, and automated inventory return movements.
- **Customer CRM & Supplier Directory**:
  - Lifetime spend, order counts, and transaction history drawers.
- **Operating Expenses**:
  - Categorized expense tracking (Rent, Salaries, Utilities, Marketing, Packaging, Transport, Maintenance) for real-time net operating income calculations.
- **Executive Dashboard & Financial Reports**:
  - Real-time KPI cards: Today's Revenue, Today's Estimated Gross Profit, Month-to-Date Revenue, MTD Profit, Total Inventory Valuation, Low-Stock alerts.
  - Interactive Recharts: 7-day Sales & Gross Profit trend area chart, Sales by Category donut chart.
  - Detailed reports: Income Statement (P&L Breakdown), Product Performance Leaderboard, Inventory Valuation, Velocity Forecasts, and CSV exports.
- **Role-Based Access Control (RBAC)**:
  - Roles: `OWNER`, `ADMIN`, `MANAGER`, `CASHIER`, `INVENTORY_STAFF`.
  - Server-side permission guards on every action and route.
- **Audit Logs**:
  - Immutable chronicle of logins, product edits, stock adjustments, sales, refunds, transfers, and settings updates.
- **SaaS Subscription Billing & Usage Limits**:
  - `FREE`, `PRO`, `BUSINESS` tiers with live usage meters (Product count, Monthly sales, Employee seats).
- **8-Step Business Onboarding Wizard**:
  - Business details -> Store category -> Country -> Currency -> Location -> First Product -> Initial Stock -> Team -> "Your inventory is ready" celebration.

---

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions, TypeScript)
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) (SQLite out-of-the-box for instant local setup, 100% PostgreSQL schema compatible)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/), Lucide Icons, Glassmorphic B2B SaaS Design System
- **Validation**: [Zod](https://zod.dev/) & [React Hook Form](https://react-hook-form.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **CSV Engine**: [Papa Parse](https://www.papaparse.com/)
- **Authentication**: Custom secure session cookies with JWT encryption (`jose`) and `bcryptjs` password hashing.

---

## Getting Started

### 1. Prerequisites
- Node.js >= 18.18 (tested on Node v20/v24)
- npm >= 9

### 2. Installation
```bash
# Clone or navigate to the repository
cd StockFlow

# Install dependencies
npm install
```

### 3. Environment Variables
Create a `.env` file (copied from `.env.example`):
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="stockflow-super-secure-production-jwt-secret-key-2026-xyz"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Using PostgreSQL in Production**:
> Simply update `DATABASE_URL` to your PostgreSQL connection string:
> ```env
> DATABASE_URL="postgresql://postgres:password@localhost:5432/stockflow?schema=public"
> ```
> And change the `provider` in `prisma/schema.prisma` from `sqlite` to `postgresql`.

### 4. Database Setup & Realistic Seed Data
```bash
# Push database schema
npm run prisma:push

# Seed realistic demo data (25+ products, categories, suppliers, customers, historical sales, POs, expenses, audit logs)
npm run prisma:seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Accounts & Credentials

The seed script initializes a complete business (**Apex Retail & Wholesale**) with sample accounts across all roles (password for all: `password123`):

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **👑 Owner** | `owner@stockflow.dev` | `password123` | Full Workspace, Settings & SaaS Billing |
| **🛡️ Admin** | `admin@stockflow.dev` | `password123` | All Operations, Employees, Products, Settings |
| **📊 Manager** | `manager@stockflow.dev` | `password123` | Sales, Inventory, POs, Customers, Reports |
| **💳 Cashier** | `cashier@stockflow.dev` | `password123` | POS Terminal, Sales, Customers |
| **📦 Inventory Staff** | `inventory@stockflow.dev` | `password123` | Products, Stock Adjustments, PO Receiving |

*Tip: The login page includes 1-click demo login buttons for immediate testing.*

---

## Automated Business Logic Tests

Run the automated test suite to verify atomic stock deductions, refund restocking, negative inventory prevention, purchase order receiving, and multi-tenant isolation:

```bash
npm test
```

Test coverage includes:
1. Initial opening stock setup
2. Sale creation & atomic inventory deduction (Stock 10 -> Buy 3 -> Stock 7)
3. Inventory movement record verification (`previousQuantity`, `quantityChange`, `newQuantity`)
4. Itemized refund with restock flag (Stock 7 -> Refund 1 -> Stock 8)
5. Negative inventory rejection when stock is insufficient
6. Purchase Order stock receiving increments
7. Strict Tenant Isolation (Tenant A queries never leak Tenant B data)
8. Role-Based Access Control matrix enforcement across all roles

---

## Production Build

```bash
# Generate Prisma Client & Build Next.js
npm run build

# Start Production Server
npm run start
```
