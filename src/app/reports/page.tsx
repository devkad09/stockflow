import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getProductPerformanceReport,
  getInventoryForecastingReport,
} from "@/lib/services/reports";
import {
  ReportsView,
  ProductPerformanceItem,
  InventoryValuationItem,
  InventoryForecastItem,
} from "@/components/reports/ReportsView";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  // 1. Performance data
  const performance: ProductPerformanceItem[] = await getProductPerformanceReport(businessId);

  // 2. Inventory valuation
  const dbProducts = await prisma.product.findMany({
    where: { businessId, isArchived: false },
    include: {
      category: { select: { name: true } },
      inventories: { where: { locationId: auth.defaultLocation.id } },
    },
    orderBy: { name: "asc" },
  });

  const inventory: InventoryValuationItem[] = dbProducts.map((p) => {
    const currentStock = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
    const assetValue = currentStock * p.costPrice;
    const retailValue = currentStock * p.sellingPrice;
    const status = currentStock <= 0 ? "OUT" : currentStock <= p.minStockLevel ? "LOW" : "HEALTHY";

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      categoryName: p.category?.name || "General",
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      currentStock,
      assetValue,
      retailValue,
      minStockLevel: p.minStockLevel,
      status,
    };
  });

  // 3. Inventory Forecasting
  const forecasting: InventoryForecastItem[] = await getInventoryForecastingReport(businessId);

  // 4. Financial Summary
  const sales = await prisma.sale.findMany({
    where: { businessId, status: { not: "CANCELLED" } },
    include: { items: true, refunds: true },
  });

  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCost = sales.reduce((acc, s) => {
    return acc + s.items.reduce((iAcc, item) => iAcc + item.unitCost * item.quantity, 0);
  }, 0);
  const totalRefunds = sales.reduce((acc, s) => {
    return acc + s.refunds.reduce((rAcc, r) => rAcc + r.totalRefundAmount, 0);
  }, 0);
  const grossProfit = Math.max(0, totalRevenue - totalCost - totalRefunds);

  const expenses = await prisma.expense.findMany({
    where: { businessId },
  });
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const estimatedNetProfit = grossProfit - totalExpenses;

  // Expenses by Category
  const expenseCatMap: Record<string, { category: string; amount: number; count: number }> = {};
  expenses.forEach((e) => {
    if (!expenseCatMap[e.category]) {
      expenseCatMap[e.category] = { category: e.category, amount: 0, count: 0 };
    }
    expenseCatMap[e.category].amount += e.amount;
    expenseCatMap[e.category].count += 1;
  });

  return (
    <AppLayout>
      <ReportsView
        performance={performance}
        inventory={inventory}
        forecasting={forecasting}
        financialSummary={{
          totalRevenue,
          totalCost,
          totalDiscounts: 0,
          totalRefunds,
          grossProfit,
          totalExpenses,
          estimatedNetProfit,
          ordersCount: sales.length,
        }}
        expensesByCategory={Object.values(expenseCatMap)}
        currencySymbol={auth.business.currencySymbol}
      />
    </AppLayout>
  );
}
