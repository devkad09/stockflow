import * as React from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/reports";
import { getLowStockAlerts } from "@/lib/services/inventory";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  Boxes,
  AlertTriangle,
  ShoppingCart,
  Plus,
  Layers,
  Truck,
  Receipt,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  // If role is Cashier, redirect directly to POS
  if (auth.role === "CASHIER") {
    redirect("/pos");
  }

  const businessId = auth.business.id;
  const stats = await getDashboardStats(businessId);
  const lowStockProducts = await getLowStockAlerts(businessId);
  const sym = auth.business.currencySymbol;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Business Overview
              </h1>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time inventory levels, sales velocity, and gross profit analytics for {auth.business.name}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/pos">
              <Button variant="success" size="md" className="gap-2 font-black shadow-lg shadow-emerald-500/20 rounded-2xl">
                <ShoppingCart className="w-4 h-4" />
                Launch POS (F4)
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="primary" size="md" className="gap-1.5 rounded-2xl">
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </Link>
            <Link href="/inventory">
              <Button variant="secondary" size="md" className="gap-1.5 rounded-2xl">
                <Layers className="w-4 h-4" />
                Stock Adjust
              </Button>
            </Link>
          </div>
        </div>

        {/* Top KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Sales"
            value={formatCurrency(stats.todayRevenue, "USD", sym)}
            subtitle={`${stats.todayOrdersCount} completed orders today`}
            icon={DollarSign}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/15 border-blue-500/25 shadow-lg shadow-blue-500/10"
          />

          <StatCard
            title="Today's Est. Profit"
            value={formatCurrency(stats.todayGrossProfit, "USD", sym)}
            subtitle="Estimated Gross Margin"
            trend="up"
            change="Gross"
            icon={TrendingUp}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/15 border-emerald-500/25 shadow-lg shadow-emerald-500/10"
          />

          <StatCard
            title="Month Sales (MTD)"
            value={formatCurrency(stats.monthRevenue, "USD", sym)}
            subtitle={`Est. Profit: ${formatCurrency(stats.monthGrossProfit, "USD", sym)}`}
            icon={Receipt}
            iconColor="text-purple-400"
            iconBg="bg-purple-500/15 border-purple-500/25 shadow-lg shadow-purple-500/10"
          />

          <StatCard
            title="Inventory Valuation"
            value={formatCurrency(stats.totalInventoryValue, "USD", sym)}
            subtitle={`${stats.totalProductsCount} active items in stock`}
            icon={Boxes}
            iconColor="text-amber-400"
            iconBg="bg-amber-500/15 border-amber-500/25 shadow-lg shadow-amber-500/10"
          />
        </div>

        {/* Interactive Charts */}
        <DashboardCharts
          salesProfitData={stats.chartData}
          categoryData={stats.categoryDistribution}
          currencySymbol={sym}
        />

        {/* Two-Column Detail Grids: Low Stock Alerts & Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock Alerts */}
          <Card className="rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Low Stock & Out of Stock Alerts
                </CardTitle>
                <CardDescription>Items needing replenishment</CardDescription>
              </div>
              <Badge variant={lowStockProducts.length > 0 ? "destructive" : "success"}>
                {lowStockProducts.length} items
              </Badge>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  🎉 All product inventory levels are currently sufficient.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {lowStockProducts.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl glass-card text-xs transition-colors hover:border-slate-600"
                    >
                      <div className="space-y-0.5 max-w-[65%]">
                        <p className="font-bold text-white truncate">{p.name}</p>
                        <p className="text-slate-400 text-[11px]">
                          SKU: {p.sku} • Min Level: {p.minStockLevel} {p.unit}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant={p.isOutOfStock ? "destructive" : "warning"} size="sm">
                          {p.isOutOfStock ? "Out of Stock (0)" : `Low (${p.currentStock} left)`}
                        </Badge>
                        <div>
                          <Link
                            href="/inventory"
                            className="text-[11px] font-bold text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            Restock &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                  {lowStockProducts.length > 5 && (
                    <div className="text-center pt-2">
                      <Link href="/inventory" className="text-xs text-blue-400 hover:underline font-bold">
                        View all {lowStockProducts.length} low stock alerts &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Sales Activity */}
          <Card className="rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Recent Sales Transactions</CardTitle>
                <CardDescription>Latest POS checkouts and payments</CardDescription>
              </div>
              <Link href="/sales" className="text-xs text-blue-400 hover:underline font-bold">
                View All &rarr;
              </Link>
            </CardHeader>
            <CardContent>
              {stats.recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No sales recorded yet. Use the POS terminal to start selling.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats.recentTransactions.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl glass-card text-xs transition-colors hover:border-slate-600"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono">{sale.receiptNumber}</span>
                          <Badge variant="outline" size="sm">
                            {sale.paymentMethod}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          {formatDateTime(sale.createdAt)} • {sale.customer?.name || "Walk-in Customer"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                          {formatCurrency(sale.totalAmount, "USD", sym)}
                        </span>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {sale.items.length} {sale.items.length === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
