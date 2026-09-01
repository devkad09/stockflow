import { prisma } from "../db";
import { startOfMonth, endOfMonth } from "date-fns";

export interface PlanLimits {
  name: "FREE" | "PRO" | "BUSINESS";
  maxProducts: number; // Infinity for unlimited
  maxSalesPerMonth: number;
  maxEmployees: number;
  hasMultiLocation: boolean;
  hasPurchaseOrders: boolean;
  hasCsvImportExport: boolean;
  hasAdvancedReports: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    name: "FREE",
    maxProducts: 100,
    maxSalesPerMonth: 100,
    maxEmployees: 1,
    hasMultiLocation: false,
    hasPurchaseOrders: false,
    hasCsvImportExport: false,
    hasAdvancedReports: false,
  },
  PRO: {
    name: "PRO",
    maxProducts: Infinity,
    maxSalesPerMonth: Infinity,
    maxEmployees: 5,
    hasMultiLocation: false,
    hasPurchaseOrders: true,
    hasCsvImportExport: true,
    hasAdvancedReports: true,
  },
  BUSINESS: {
    name: "BUSINESS",
    maxProducts: Infinity,
    maxSalesPerMonth: Infinity,
    maxEmployees: Infinity,
    hasMultiLocation: true,
    hasPurchaseOrders: true,
    hasCsvImportExport: true,
    hasAdvancedReports: true,
  },
};

export async function getBusinessUsage(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { plan: true },
  });

  const planName = (business?.plan || "FREE").toUpperCase();
  const limits = PLAN_LIMITS[planName] || PLAN_LIMITS.FREE;

  // 1. Current active products
  const productCount = await prisma.product.count({
    where: { businessId, isArchived: false },
  });

  // 2. Sales this month
  const now = new Date();
  const salesThisMonth = await prisma.sale.count({
    where: {
      businessId,
      createdAt: {
        gte: startOfMonth(now),
        lte: endOfMonth(now),
      },
    },
  });

  // 3. Employee count
  const employeeCount = await prisma.businessMember.count({
    where: { businessId, status: "ACTIVE" },
  });

  return {
    plan: planName,
    limits,
    usage: {
      products: {
        current: productCount,
        max: limits.maxProducts,
        isExceeded: productCount >= limits.maxProducts,
        percent: limits.maxProducts === Infinity ? 0 : Math.min(100, Math.round((productCount / limits.maxProducts) * 100)),
      },
      salesThisMonth: {
        current: salesThisMonth,
        max: limits.maxSalesPerMonth,
        isExceeded: salesThisMonth >= limits.maxSalesPerMonth,
        percent: limits.maxSalesPerMonth === Infinity ? 0 : Math.min(100, Math.round((salesThisMonth / limits.maxSalesPerMonth) * 100)),
      },
      employees: {
        current: employeeCount,
        max: limits.maxEmployees,
        isExceeded: employeeCount >= limits.maxEmployees,
        percent: limits.maxEmployees === Infinity ? 0 : Math.min(100, Math.round((employeeCount / limits.maxEmployees) * 100)),
      },
    },
  };
}

export async function checkCanAddProduct(businessId: string): Promise<boolean> {
  const usage = await getBusinessUsage(businessId);
  return !usage.usage.products.isExceeded;
}

export async function checkCanAddEmployee(businessId: string): Promise<boolean> {
  const usage = await getBusinessUsage(businessId);
  return !usage.usage.employees.isExceeded;
}
