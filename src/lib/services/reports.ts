import { prisma } from "../db";
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
  range?: "today" | "yesterday" | "week" | "month" | "30days" | "90days" | "custom";
}

export function resolveDateRange(filter?: DateRangeFilter): { start: Date; end: Date } {
  const now = new Date();
  if (!filter || !filter.range) {
    return {
      start: subDays(now, 30),
      end: endOfDay(now),
    };
  }

  switch (filter.range) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday":
      const yest = subDays(now, 1);
      return { start: startOfDay(yest), end: endOfDay(yest) };
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case "month":
      return { start: startOfMonth(now), end: endOfDay(now) };
    case "30days":
      return { start: subDays(now, 30), end: endOfDay(now) };
    case "90days":
      return { start: subDays(now, 90), end: endOfDay(now) };
    case "custom":
      return {
        start: filter.startDate ? startOfDay(new Date(filter.startDate)) : subDays(now, 30),
        end: filter.endDate ? endOfDay(new Date(filter.endDate)) : endOfDay(now),
      };
    default:
      return { start: subDays(now, 30), end: endOfDay(now) };
  }
}

export async function getDashboardStats(businessId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);

  // 1. Today's sales & gross profit
  const todaySales = await prisma.sale.findMany({
    where: {
      businessId,
      createdAt: { gte: todayStart, lte: todayEnd },
      status: { not: "CANCELLED" },
    },
    include: {
      items: true,
      refunds: true,
    },
  });

  const todayRevenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const todayCost = todaySales.reduce((acc, s) => {
    return acc + s.items.reduce((iAcc, item) => iAcc + item.unitCost * item.quantity, 0);
  }, 0);
  const todayRefunds = todaySales.reduce((acc, s) => {
    return acc + s.refunds.reduce((rAcc, r) => rAcc + r.totalRefundAmount, 0);
  }, 0);
  const todayGrossProfit = Math.max(0, todayRevenue - todayCost - todayRefunds);

  // 2. Month-to-date sales & gross profit
  const monthSales = await prisma.sale.findMany({
    where: {
      businessId,
      createdAt: { gte: monthStart, lte: todayEnd },
      status: { not: "CANCELLED" },
    },
    include: {
      items: true,
      refunds: true,
    },
  });

  const monthRevenue = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const monthCost = monthSales.reduce((acc, s) => {
    return acc + s.items.reduce((iAcc, item) => iAcc + item.unitCost * item.quantity, 0);
  }, 0);
  const monthRefunds = monthSales.reduce((acc, s) => {
    return acc + s.refunds.reduce((rAcc, r) => rAcc + r.totalRefundAmount, 0);
  }, 0);
  const monthGrossProfit = Math.max(0, monthRevenue - monthCost - monthRefunds);

  // 3. Total inventory value and low/out-of-stock counts
  const products = await prisma.product.findMany({
    where: { businessId, isArchived: false, isActive: true },
    include: { inventories: true },
  });

  let totalInventoryValue = 0;
  let totalPotentialSalesValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    const totalQty = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
    totalInventoryValue += totalQty * p.costPrice;
    totalPotentialSalesValue += totalQty * p.sellingPrice;

    if (totalQty <= 0) {
      outOfStockCount++;
    } else if (totalQty <= p.minStockLevel) {
      lowStockCount++;
    }
  }

  // 4. Sales over time (last 7 days for charts)
  const last7DaysStart = subDays(now, 6);
  const recentSales = await prisma.sale.findMany({
    where: {
      businessId,
      createdAt: { gte: startOfDay(last7DaysStart) },
      status: { not: "CANCELLED" },
    },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  const dailyChartMap: Record<string, { date: string; sales: number; profit: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dailyChartMap[key] = { date: key, sales: 0, profit: 0 };
  }

  for (const sale of recentSales) {
    const key = sale.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (dailyChartMap[key]) {
      dailyChartMap[key].sales += sale.totalAmount;
      const cost = sale.items.reduce((acc, item) => acc + item.unitCost * item.quantity, 0);
      dailyChartMap[key].profit += Math.max(0, sale.totalAmount - cost);
    }
  }

  const chartData = Object.values(dailyChartMap);

  // 5. Sales by category
  const categories = await prisma.category.findMany({
    where: { businessId },
    include: {
      products: {
        include: {
          saleItems: {
            where: {
              sale: {
                createdAt: { gte: monthStart },
                status: { not: "CANCELLED" },
              },
            },
          },
        },
      },
    },
  });

  const categoryDistribution = categories
    .map((cat) => {
      const value = cat.products.reduce((acc, p) => {
        return acc + p.saleItems.reduce((sAcc, si) => sAcc + si.total, 0);
      }, 0);
      return {
        name: cat.name,
        color: cat.color || "#3b82f6",
        value: Math.round(value * 100) / 100,
      };
    })
    .filter((c) => c.value > 0);

  // 6. Recent transactions
  const recentTransactions = await prisma.sale.findMany({
    where: { businessId },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      cashier: { select: { name: true } },
      items: true,
    },
  });

  return {
    todayRevenue,
    todayGrossProfit,
    todayOrdersCount: todaySales.length,
    monthRevenue,
    monthGrossProfit,
    monthOrdersCount: monthSales.length,
    totalInventoryValue,
    totalPotentialSalesValue,
    lowStockCount,
    outOfStockCount,
    totalProductsCount: products.length,
    chartData,
    categoryDistribution,
    recentTransactions,
  };
}

export async function getProductPerformanceReport(businessId: string, filter?: DateRangeFilter) {
  const { start, end } = resolveDateRange(filter);

  const products = await prisma.product.findMany({
    where: { businessId },
    include: {
      category: true,
      inventories: true,
      saleItems: {
        where: {
          sale: {
            createdAt: { gte: start, lte: end },
            status: { not: "CANCELLED" },
          },
        },
        include: {
          sale: true,
        },
      },
    },
  });

  return products.map((p) => {
    const currentStock = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
    const unitsSold = p.saleItems.reduce((acc, si) => acc + si.quantity, 0);
    const revenue = p.saleItems.reduce((acc, si) => acc + si.total, 0);
    const cost = unitsSold * p.costPrice;
    const grossProfit = Math.max(0, revenue - cost);
    const transactionsCount = new Set(p.saleItems.map((si) => si.saleId)).size;
    const profitMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : "0.0";

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      categoryName: p.category?.name || "Uncategorized",
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      currentStock,
      unitsSold,
      revenue,
      cost,
      grossProfit,
      profitMargin: `${profitMargin}%`,
      transactionsCount,
    };
  });
}

export async function getInventoryForecastingReport(businessId: string) {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  const products = await prisma.product.findMany({
    where: { businessId, isArchived: false, isActive: true },
    include: {
      category: true,
      inventories: true,
      saleItems: {
        where: {
          sale: {
            createdAt: { gte: thirtyDaysAgo },
            status: { not: "CANCELLED" },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => {
    const currentStock = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
    const unitsSold30d = p.saleItems.reduce((acc, si) => acc + si.quantity, 0);
    const dailyVelocity = unitsSold30d / 30;

    let daysOfStockLeft = 999;
    let runoutRisk: "CRITICAL" | "LOW" | "OPTIMAL" | "OVERSTOCKED" | "DEAD_STOCK" = "OPTIMAL";

    if (currentStock <= 0) {
      daysOfStockLeft = 0;
      runoutRisk = "CRITICAL";
    } else if (dailyVelocity === 0) {
      daysOfStockLeft = 999;
      runoutRisk = "DEAD_STOCK";
    } else {
      daysOfStockLeft = Math.round(currentStock / dailyVelocity);
      if (daysOfStockLeft <= 7) runoutRisk = "CRITICAL";
      else if (daysOfStockLeft <= 14) runoutRisk = "LOW";
      else if (daysOfStockLeft > 60) runoutRisk = "OVERSTOCKED";
      else runoutRisk = "OPTIMAL";
    }

    // Recommended reorder for 30-day buffer
    const target30dStock = Math.ceil(dailyVelocity * 30);
    const recommendedReorder = Math.max(0, target30dStock - currentStock);

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      categoryName: p.category?.name || "General",
      currentStock,
      minStockLevel: p.minStockLevel,
      unitsSold30d,
      dailyVelocity: Number(dailyVelocity.toFixed(2)),
      daysOfStockLeft: daysOfStockLeft === 999 ? ">90" : daysOfStockLeft.toString(),
      runoutRisk,
      recommendedReorder,
    };
  });
}
