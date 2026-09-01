"use client";

import * as React from "react";
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Zap,
  Shield,
  Layers,
  ShoppingBag,
  Users,
  Clock,
  ArrowRight,
  Download,
  Receipt,
  Building,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Lock,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { changePlanAction } from "@/actions/settings-actions";

export interface PlanUsageData {
  plan: string;
  usage: {
    products: { current: number; max: number; isExceeded: boolean; percent: number };
    salesThisMonth: { current: number; max: number; isExceeded: boolean; percent: number };
    employees: { current: number; max: number; isExceeded: boolean; percent: number };
  };
}

interface BillingViewProps {
  usageData: PlanUsageData;
}

export function BillingView({ usageData }: BillingViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [currentPlan, setCurrentPlan] = React.useState(usageData.plan);
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "annual">("annual");
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  const handleSelectPlan = async (plan: string) => {
    if (plan === currentPlan) return;
    setIsUpdating(true);

    try {
      const res = await changePlanAction(plan);
      if (!res.success) {
        toastError(res.error || "Failed to switch plan");
        setIsUpdating(false);
        return;
      }

      setCurrentPlan(plan);
      toastSuccess(`Workspace plan successfully switched to ${plan}!`, "Subscription Updated");
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || "Error switching plan");
    } finally {
      setIsUpdating(false);
    }
  };

  const isAnnual = billingCycle === "annual";

  const plans = [
    {
      id: "FREE",
      name: "Starter Community",
      tagline: "Essential POS & inventory for single-store boutiques and sole traders.",
      monthlyPrice: 0,
      annualPrice: 0,
      badge: "Free Starter",
      highlight: false,
      color: "from-slate-700 to-slate-800",
      accent: "border-slate-800",
      features: [
        "Up to 100 Products & SKUs",
        "Up to 100 Sales Transactions / mo",
        "1 Staff Seat (Store Owner)",
        "Thermal 80mm & 58mm POS Receipts",
        "Standard Barcode Generator",
        "Basic Income Reports",
        "Community Support",
      ],
      missing: [
        "Multi-Location & Transfers",
        "Customer Loyalty & VIP Points",
        "Automated Smart PO Reordering",
        "Register Shift & Z-Report Ledger",
        "Unlimited Staff Logins",
      ],
    },
    {
      id: "PRO",
      name: "Pro Retailer",
      tagline: "For high-growth shops seeking speed, customer loyalty & unlimited catalog.",
      monthlyPrice: 29,
      annualPrice: 23,
      badge: "Most Popular",
      popular: true,
      highlight: true,
      color: "from-blue-600 via-indigo-600 to-purple-600",
      accent: "border-indigo-500 shadow-indigo-500/20",
      features: [
        "Unlimited Products & SKUs",
        "Unlimited Sales Transactions",
        "Up to 5 Employee Accounts (RBAC)",
        "Customer Loyalty Points & VIP Tiers",
        "Promotional Coupons & Discount Rules",
        "Register Shifts & Cash Drawer Z-Reports",
        "CSV Product & Catalog Import / Export",
        "Automated Low-Stock Replenishment POs",
        "Avery & Shelf-Edge Price Tag Studio",
        "Live Camera Barcode Scanner",
      ],
      missing: [
        "Multi-Warehouse Network",
        "Unlimited Employee Accounts",
      ],
    },
    {
      id: "BUSINESS",
      name: "Enterprise Scale",
      tagline: "For high-volume retail chains, wholesalers & multi-warehouse enterprises.",
      monthlyPrice: 79,
      annualPrice: 63,
      badge: "Enterprise",
      highlight: false,
      color: "from-purple-600 to-pink-600",
      accent: "border-purple-500/80 shadow-purple-500/20",
      features: [
        "Everything in Pro Retailer",
        "Unlimited Staff Accounts & Logins",
        "Multi-Store Branches & Warehouses",
        "Inter-Store Inventory Transfers",
        "Wholesale Quotations & Commercial Tax Invoices",
        "Stocktake / Cycle Count Audit Studio",
        "Complete Immutable Audit Trail",
        "Custom Thermal Receipt Headers & Footers",
        "Dedicated VIP Account Manager",
        "99.99% Guaranteed SLA Uptime",
      ],
      missing: [],
    },
  ];

  const comparisonFeatures = [
    { name: "Product Catalog Limit", free: "100 Items", pro: "Unlimited", business: "Unlimited" },
    { name: "Monthly Sales Checkouts", free: "100 Sales", pro: "Unlimited", business: "Unlimited" },
    { name: "Employee Seats (RBAC)", free: "1 Seat", pro: "5 Seats", business: "Unlimited" },
    { name: "Point of Sale (POS) & Scanner", free: true, pro: true, business: true },
    { name: "Parked Carts & Multi-Tab Registers", free: false, pro: true, business: true },
    { name: "Customer Loyalty Rewards & VIP Tiers", free: false, pro: true, business: true },
    { name: "Promotions & Coupon Codes", free: false, pro: true, business: true },
    { name: "Cash Register Shifts & Z-Reports", free: false, pro: true, business: true },
    { name: "Smart Low-Stock PO Reorder", free: false, pro: true, business: true },
    { name: "Stocktake & Cycle Count Studio", free: false, pro: false, business: true },
    { name: "Multi-Store Branches & Transfers", free: false, pro: false, business: true },
    { name: "Wholesale Tax Invoices & Quotations", free: false, pro: true, business: true },
    { name: "Full Immutable Audit Logs", free: false, pro: true, business: true },
    { name: "Priority Support SLA", free: "Standard", pro: "Priority (24h)", business: "Dedicated VIP (1h)" },
  ];

  const invoiceHistory = [
    { id: "INV-2026-008", date: "Aug 01, 2026", amount: "$23.00", plan: "Pro Retailer (Annual)", status: "PAID" },
    { id: "INV-2026-007", date: "Jul 01, 2026", amount: "$23.00", plan: "Pro Retailer (Annual)", status: "PAID" },
    { id: "INV-2026-006", date: "Jun 01, 2026", amount: "$23.00", plan: "Pro Retailer (Annual)", status: "PAID" },
    { id: "INV-2026-005", date: "May 01, 2026", amount: "$0.00", plan: "Free Starter", status: "PAID" },
  ];

  const faqs = [
    {
      q: "Can I upgrade or downgrade my workspace plan at any time?",
      a: "Yes! When upgrading, your new feature limits (such as unlimited products and employee accounts) activate instantly. If switching between monthly and annual plans, any unused balance is automatically prorated.",
    },
    {
      q: "What happens if I reach the product or sales transaction limit on Free Starter?",
      a: "You will receive an in-app notice reminding you of the limit. Existing data and sales history remain 100% accessible, and upgrading to Pro unlocks unlimited capacity immediately without downtime.",
    },
    {
      q: "Are software updates and new features included in my subscription?",
      a: "Absolutely. All platform updates, security patches, scanner firmware updates, and newly released features are deployed automatically to your cloud workspace.",
    },
    {
      q: "What payment methods are supported?",
      a: "We support all major credit/debit cards (Visa, Mastercard, American Express), bank transfers for annual enterprise plans, and mobile payment gateways.",
    },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Plans & SaaS Subscription
            </h1>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Active Tier: {currentPlan}
            </span>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            Scale your retail and wholesale operations with flexible subscription tiers, dedicated staff seats, and advanced multi-store capabilities.
          </p>
        </div>

        {/* Billing Interval Switcher */}
        <div className="flex items-center p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner self-start md:self-auto">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              !isAnnual
                ? "bg-slate-800 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annual")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              isAnnual
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Annual Billing</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black tracking-wider border border-emerald-500/30">
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* Live Workspace Resource Telemetry Meters */}
      <Card className="border-indigo-500/30 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                Live Workspace Resource Telemetry
              </CardTitle>
              <CardDescription>
                Real-time consumption tracking against your active subscription allowances
              </CardDescription>
            </div>
            <Badge variant="outline" size="sm" className="font-mono text-slate-300">
              Workspace ID: ws_{usageData.plan.toLowerCase()}_active
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Products Meter */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                  <Layers className="w-4 h-4" />
                </div>
                Active Products & SKUs
              </span>
              <span className="text-xs font-black text-white">
                {usageData.usage.products.current} /{" "}
                {usageData.usage.products.max === Infinity ? "∞ Unlimited" : usageData.usage.products.max}
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, usageData.usage.products.percent)}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400">
              {usageData.usage.products.max === Infinity
                ? "Unlimited capacity available"
                : `${usageData.usage.products.percent}% of starter allowance used`}
            </p>
          </div>

          {/* Sales Transactions Meter */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                Sales This Month
              </span>
              <span className="text-xs font-black text-emerald-400">
                {usageData.usage.salesThisMonth.current} /{" "}
                {usageData.usage.salesThisMonth.max === Infinity
                  ? "∞ Unlimited"
                  : usageData.usage.salesThisMonth.max}
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, usageData.usage.salesThisMonth.percent)}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400">
              {usageData.usage.salesThisMonth.max === Infinity
                ? "Unlimited POS checkouts available"
                : `${usageData.usage.salesThisMonth.percent}% of monthly checkout volume`}
            </p>
          </div>

          {/* Employee Seats Meter */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
                  <Users className="w-4 h-4" />
                </div>
                Staff Logins & Seats
              </span>
              <span className="text-xs font-black text-purple-300">
                {usageData.usage.employees.current} /{" "}
                {usageData.usage.employees.max === Infinity
                  ? "∞ Unlimited"
                  : usageData.usage.employees.max}
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, usageData.usage.employees.percent)}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400">
              {usageData.usage.employees.max === Infinity
                ? "Unlimited cashier & manager seats"
                : `${usageData.usage.employees.current} active staff seat in use`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plan Tier Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {plans.map((p) => {
          const isCurrent = currentPlan === p.id;
          const displayPrice = isAnnual ? p.annualPrice : p.monthlyPrice;

          return (
            <div
              key={p.id}
              className={`rounded-3xl border p-7 flex flex-col justify-between transition-all duration-300 relative group overflow-hidden ${
                p.popular
                  ? "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-indigo-500/80 shadow-2xl shadow-indigo-500/15 scale-[1.02]"
                  : "bg-slate-900/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/90"
              }`}
            >
              {/* Highlight Badge */}
              {p.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-4 rounded-bl-2xl shadow-md flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{p.name}</h3>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 min-h-[32px]">{p.tagline}</p>
                </div>

                {/* Price Display */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-white tracking-tight">
                      ${displayPrice}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      {displayPrice === 0 ? "forever" : isAnnual ? "/ mo (billed annually)" : "/ month"}
                    </span>
                  </div>
                  {isAnnual && displayPrice > 0 && (
                    <p className="text-[11px] text-emerald-400 font-bold mt-1">
                      Save ${(p.monthlyPrice - p.annualPrice) * 12}/year with annual billing
                    </p>
                  )}
                </div>

                {/* Feature Checklist */}
                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 block">
                    What's Included:
                  </span>
                  <div className="space-y-2.5">
                    {p.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                        <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="leading-tight font-medium">{feat}</span>
                      </div>
                    ))}

                    {p.missing.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-500 opacity-60">
                        <div className="p-0.5 rounded-full bg-slate-800 text-slate-500 shrink-0 mt-0.5">
                          <X className="w-3.5 h-3.5" />
                        </div>
                        <span className="leading-tight line-through">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Switch Button */}
              <div className="pt-8 mt-6 border-t border-slate-800/80">
                <Button
                  variant={isCurrent ? "outline" : p.popular ? "primary" : "secondary"}
                  size="lg"
                  className={`w-full font-black text-xs gap-2 rounded-2xl shadow-md ${
                    p.popular && !isCurrent
                      ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-indigo-500/20"
                      : ""
                  }`}
                  disabled={isCurrent || isUpdating}
                  onClick={() => handleSelectPlan(p.id)}
                  isLoading={isUpdating && currentPlan !== p.id}
                >
                  {isCurrent ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Active Current Plan
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Switch to {p.name}
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      <Card className="rounded-3xl">
        <CardHeader className="pb-4">
          <CardTitle>Detailed Plan Feature Comparison Matrix</CardTitle>
          <CardDescription>Compare capabilities and enterprise limits across all subscription tiers</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-y border-slate-800 bg-slate-950/60 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-5">Capability / Tool</th>
                  <th className="py-3.5 px-4 text-center">Starter ($0)</th>
                  <th className="py-3.5 px-4 text-center text-indigo-400">Pro ($23/mo)</th>
                  <th className="py-3.5 px-4 text-center text-purple-400">Enterprise ($63/mo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {comparisonFeatures.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-5 font-semibold text-slate-200">{row.name}</td>

                    {/* Free */}
                    <td className="py-3 px-4 text-center">
                      {typeof row.free === "boolean" ? (
                        row.free ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )
                      ) : (
                        <span className="font-bold text-slate-400">{row.free}</span>
                      )}
                    </td>

                    {/* Pro */}
                    <td className="py-3 px-4 text-center bg-indigo-950/10">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )
                      ) : (
                        <span className="font-black text-indigo-300">{row.pro}</span>
                      )}
                    </td>

                    {/* Business */}
                    <td className="py-3 px-4 text-center bg-purple-950/10">
                      {typeof row.business === "boolean" ? (
                        row.business ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )
                      ) : (
                        <span className="font-black text-purple-300">{row.business}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Section: Payment Method Card & Invoice History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Card Simulation */}
        <Card className="rounded-3xl flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                Active Payment Method
              </CardTitle>
              <Badge variant="success" size="sm">Auto-Renewal Active</Badge>
            </div>
            <CardDescription>Primary billing credit card attached to this workspace</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Metallic Virtual Card Mockup */}
            <div className="rounded-2xl p-6 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 border border-indigo-500/30 text-white shadow-2xl space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm tracking-wider font-bold">STOCKFLOW ENTERPRISE</span>
                <span className="font-black italic text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                  VISA
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Card Number</span>
                <div className="font-mono font-black text-lg tracking-widest text-slate-100">
                  •••• •••• •••• 4242
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <div>
                  <span className="text-[9px] uppercase tracking-widest block text-slate-400">Cardholder</span>
                  <span className="text-slate-200 font-bold uppercase">Store Owner</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-widest block text-slate-400">Expires</span>
                  <span className="text-slate-200 font-bold">12/28</span>
                </div>
              </div>
            </div>
          </CardContent>

          <div className="p-5 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Next billing date: Sept 01, 2026</span>
            <Button
              variant="secondary"
              size="sm"
              className="font-bold rounded-xl"
              onClick={() => toastSuccess("Payment details are currently verified and active.")}
            >
              Update Payment Method
            </Button>
          </div>
        </Card>

        {/* Invoices & Receipt History */}
        <Card className="rounded-3xl flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              Billing Receipts & Tax Invoices
            </CardTitle>
            <CardDescription>Download past SaaS subscription tax invoices and VAT receipts</CardDescription>
          </CardHeader>

          <CardContent className="space-y-2.5">
            {invoiceHistory.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{inv.id}</span>
                    <Badge variant="success" size="sm">{inv.status}</Badge>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    {inv.date} • {inv.plan}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-black text-sm text-white">{inv.amount}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-slate-400 hover:text-white"
                    title="Download Tax Receipt"
                    onClick={() => toastSuccess(`Tax receipt ${inv.id} downloaded.`)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>

          <div className="p-5 border-t border-slate-800/80 text-center">
            <span className="text-xs text-slate-400">
              Need custom enterprise invoicing or W-9 forms? Contact billing@stockflow.dev
            </span>
          </div>
        </Card>
      </div>

      {/* FAQ Accordion Section */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>Common questions about subscriptions, billing cycles, and feature limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = expandedFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-slate-950/60 border border-slate-800/80 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-white hover:bg-slate-900/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-indigo-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-400 border-t border-slate-800/60 pt-3 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
