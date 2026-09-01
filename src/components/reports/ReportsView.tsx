"use client";

import * as React from "react";
import Papa from "papaparse";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  Package,
  Layers,
  ShoppingBag,
  Boxes,
  PieChart,
  Percent,
  Clock,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";

export interface ProductPerformanceItem {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  unitsSold: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  profitMargin: string;
  transactionsCount: number;
}

export interface InventoryValuationItem {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  assetValue: number;
  retailValue: number;
  minStockLevel: number;
  status: string;
}

export interface InventoryForecastItem {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  currentStock: number;
  minStockLevel: number;
  unitsSold30d: number;
  dailyVelocity: number;
  daysOfStockLeft: string;
  runoutRisk: "CRITICAL" | "LOW" | "OPTIMAL" | "OVERSTOCKED" | "DEAD_STOCK";
  recommendedReorder: number;
}

interface ReportsViewProps {
  performance: ProductPerformanceItem[];
  inventory: InventoryValuationItem[];
  forecasting: InventoryForecastItem[];
  financialSummary: {
    totalRevenue: number;
    totalCost: number;
    totalDiscounts: number;
    totalRefunds: number;
    grossProfit: number;
    totalExpenses: number;
    estimatedNetProfit: number;
    ordersCount: number;
  };
  expensesByCategory: Array<{ category: string; amount: number; count: number }>;
  currencySymbol: string;
}

export function ReportsView({
  performance,
  inventory,
  forecasting,
  financialSummary,
  expensesByCategory,
  currencySymbol,
}: ReportsViewProps) {
  const { success: toastSuccess } = useToast();
  const [activeTab, setActiveTab] = React.useState<"pnl" | "performance" | "inventory" | "forecasting" | "expenses">("pnl");

  // Export handlers
  const exportPerformanceCsv = () => {
    const data = performance.map((p) => ({
      "Product Name": p.name,
      SKU: p.sku,
      Category: p.categoryName,
      "Cost Price": p.costPrice,
      "Selling Price": p.sellingPrice,
      "Current Stock": p.currentStock,
      "Units Sold": p.unitsSold,
      Revenue: p.revenue,
      "Cost of Goods": p.cost,
      "Gross Profit": p.grossProfit,
      "Profit Margin": p.profitMargin,
      Transactions: p.transactionsCount,
    }));

    const csv = Papa.unparse(data);
    downloadFile(csv, `StockFlow_Product_Performance_${Date.now()}.csv`);
    toastSuccess("Product performance report exported to CSV");
  };

  const exportInventoryCsv = () => {
    const data = inventory.map((i) => ({
      "Product Name": i.name,
      SKU: i.sku,
      Category: i.categoryName,
      "Cost Price": i.costPrice,
      "Selling Price": i.sellingPrice,
      "Current Stock": i.currentStock,
      "Inventory Asset Value": i.assetValue,
      "Potential Retail Value": i.retailValue,
      "Min Stock Level": i.minStockLevel,
      Status: i.status,
    }));

    const csv = Papa.unparse(data);
    downloadFile(csv, `StockFlow_Inventory_Valuation_${Date.now()}.csv`);
    toastSuccess("Inventory valuation report exported to CSV");
  };

  const exportForecastCsv = () => {
    const data = forecasting.map((f) => ({
      "Product Name": f.name,
      SKU: f.sku,
      Category: f.categoryName,
      "Current Stock": f.currentStock,
      "Units Sold (Last 30d)": f.unitsSold30d,
      "Daily Sales Velocity": f.dailyVelocity,
      "Days of Stock Remaining": f.daysOfStockLeft,
      "Runout Risk": f.runoutRisk,
      "Recommended 30d Reorder": f.recommendedReorder,
    }));

    const csv = Papa.unparse(data);
    downloadFile(csv, `StockFlow_Inventory_Forecast_${Date.now()}.csv`);
    toastSuccess("Inventory forecasting report exported to CSV");
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Financial Reports & Forecasting
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time Profit & Loss breakdown, product performance leaderboard, inventory valuation, and runout velocity forecasting.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("pnl")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === "pnl"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Profit & Loss Breakdown
        </button>

        <button
          onClick={() => setActiveTab("performance")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === "performance"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Product Performance ({performance.length})
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === "inventory"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Boxes className="w-4 h-4" />
          Inventory Valuation ({inventory.length})
        </button>

        <button
          onClick={() => setActiveTab("forecasting")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === "forecasting"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          Runout & Velocity Forecasting ({forecasting.length})
        </button>

        <button
          onClick={() => setActiveTab("expenses")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === "expenses"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <PieChart className="w-4 h-4" />
          Expenses by Category
        </button>
      </div>

      {/* TAB 1: PROFIT & LOSS BREAKDOWN */}
      {activeTab === "pnl" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase">Total Sales Revenue</span>
              <div className="text-2xl font-bold text-blue-400 mt-1">
                {formatCurrency(financialSummary.totalRevenue, "USD", currencySymbol)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {financialSummary.ordersCount} completed orders
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase">Estimated Gross Profit</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {formatCurrency(financialSummary.grossProfit, "USD", currencySymbol)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Revenue minus cost of goods sold</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase">Estimated Net Operating Income</span>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {formatCurrency(financialSummary.estimatedNetProfit, "USD", currencySymbol)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Gross profit minus operating overhead</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Income Statement Breakdown (Gross / Net Estimates)</CardTitle>
              <CardDescription>
                Live calculation of sales revenue, discounts, returns, product cost, and operational expenses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="font-bold text-white">Gross Sales Revenue (+)</span>
                  <span className="font-bold text-blue-400">
                    {formatCurrency(financialSummary.totalRevenue, "USD", currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Customer Returns / Refunds (-)</span>
                  <span className="text-rose-400">
                    -{formatCurrency(financialSummary.totalRefunds, "USD", currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Cost of Goods Sold (COGS) (-)</span>
                  <span className="text-rose-400">
                    -{formatCurrency(financialSummary.totalCost, "USD", currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800 font-bold text-sm bg-slate-950/60 px-3 rounded">
                  <span className="text-emerald-400">ESTIMATED GROSS PROFIT</span>
                  <span className="text-emerald-400">
                    {formatCurrency(financialSummary.grossProfit, "USD", currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Total Operating Expenses Overhead (-)</span>
                  <span className="text-rose-400">
                    -{formatCurrency(financialSummary.totalExpenses, "USD", currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between py-3 font-bold text-base bg-blue-600/10 border border-blue-500/30 px-3 rounded-lg text-white">
                  <span>ESTIMATED NET OPERATING PROFIT</span>
                  <span className="text-emerald-400">
                    {formatCurrency(financialSummary.estimatedNetProfit, "USD", currencySymbol)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: PRODUCT PERFORMANCE */}
      {activeTab === "performance" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportPerformanceCsv}>
              <Download className="w-4 h-4 mr-1 text-slate-400" />
              Export Performance to CSV
            </Button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Units Sold</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                    <th className="py-3 px-4 text-right">Cost</th>
                    <th className="py-3 px-4 text-right">Gross Profit</th>
                    <th className="py-3 px-4 text-center">Margin %</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {performance.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{p.name}</td>
                      <td className="py-3 px-4 font-mono text-blue-400">{p.sku}</td>
                      <td className="py-3 px-4 text-slate-300">{p.categoryName}</td>
                      <td className="py-3 px-4 text-center font-bold">{p.unitsSold}</td>
                      <td className="py-3 px-4 text-right font-semibold text-white">
                        {formatCurrency(p.revenue, "USD", currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {formatCurrency(p.cost, "USD", currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {formatCurrency(p.grossProfit, "USD", currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-purple-400">
                        {p.profitMargin}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-300">
                        {p.currentStock}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY VALUATION */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportInventoryCsv}>
              <Download className="w-4 h-4 mr-1 text-slate-400" />
              Export Valuation to CSV
            </Button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4 text-right">Cost Price</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-center">Stock</th>
                    <th className="py-3 px-4 text-right">Asset Valuation</th>
                    <th className="py-3 px-4 text-right">Potential Retail Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {inventory.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{inv.name}</td>
                      <td className="py-3 px-4 font-mono text-blue-400">{inv.sku}</td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {formatCurrency(inv.costPrice, "USD", currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {formatCurrency(inv.sellingPrice, "USD", currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{inv.currentStock}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {formatCurrency(inv.assetValue, "USD", currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-purple-400">
                        {formatCurrency(inv.retailValue, "USD", currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            inv.status === "OUT"
                              ? "destructive"
                              : inv.status === "LOW"
                              ? "warning"
                              : "success"
                          }
                          size="sm"
                        >
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RUNOUT & VELOCITY FORECASTING */}
      {activeTab === "forecasting" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportForecastCsv}>
              <Download className="w-4 h-4 mr-1 text-slate-400" />
              Export Forecast to CSV
            </Button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-center">30d Sold</th>
                    <th className="py-3 px-4 text-center">Daily Velocity</th>
                    <th className="py-3 px-4 text-center">Days Remaining</th>
                    <th className="py-3 px-4 text-center">Risk Level</th>
                    <th className="py-3 px-4 text-center">Recommended 30d Reorder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {forecasting.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{f.name}</td>
                      <td className="py-3 px-4 font-mono text-blue-400">{f.sku}</td>
                      <td className="py-3 px-4 text-center font-bold">{f.currentStock}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-300">
                        {f.unitsSold30d}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {f.dailyVelocity} / day
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-sm">
                        <span
                          className={
                            f.daysOfStockLeft === "0" || Number(f.daysOfStockLeft) <= 7
                              ? "text-rose-400"
                              : Number(f.daysOfStockLeft) <= 14
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }
                        >
                          {f.daysOfStockLeft} days
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            f.runoutRisk === "CRITICAL"
                              ? "destructive"
                              : f.runoutRisk === "LOW"
                              ? "warning"
                              : f.runoutRisk === "DEAD_STOCK"
                              ? "secondary"
                              : "success"
                          }
                          size="sm"
                        >
                          {f.runoutRisk}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-400">
                        {f.recommendedReorder > 0 ? `+${f.recommendedReorder} units` : "Sufficient"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXPENSES BY CATEGORY */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {expensesByCategory.map((cat) => (
              <div
                key={cat.category}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <Badge variant="purple" size="sm">
                    {cat.category}
                  </Badge>
                  <div className="text-lg font-bold text-white mt-1">
                    {formatCurrency(cat.amount, "USD", currencySymbol)}
                  </div>
                  <p className="text-[11px] text-slate-500">{cat.count} transactions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
