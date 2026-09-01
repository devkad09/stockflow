import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SalesView, SaleRecord } from "@/components/sales/SalesView";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function SalesPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  const dbSales = await prisma.sale.findMany({
    where: { businessId },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      cashier: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
      },
      refunds: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const sales: SaleRecord[] = dbSales.map((s) => ({
    id: s.id,
    receiptNumber: s.receiptNumber,
    subtotal: s.subtotal,
    discountAmount: s.discountAmount,
    taxAmount: s.taxAmount,
    totalAmount: s.totalAmount,
    paidAmount: s.paidAmount,
    changeAmount: s.changeAmount,
    paymentMethod: s.paymentMethod,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    notes: s.notes,
    customer: s.customer,
    cashier: s.cashier,
    items: s.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      unitCost: i.unitCost,
      subtotal: i.subtotal,
      total: i.total,
      product: i.product,
    })),
    refunds: s.refunds.map((r) => ({
      id: r.id,
      refundNumber: r.refundNumber,
      totalRefundAmount: r.totalRefundAmount,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
      items: r.items.map((ri) => ({
        id: ri.id,
        saleItemId: ri.saleItemId,
        quantity: ri.quantity,
        refundAmount: ri.refundAmount,
        restocked: ri.restocked,
      })),
    })),
  }));

  const canProcessRefunds = hasPermission(auth.role, "canProcessRefunds");

  return (
    <AppLayout>
      <SalesView
        initialSales={sales}
        currencySymbol={auth.business.currencySymbol}
        businessName={auth.business.name}
        canProcessRefunds={canProcessRefunds}
      />
    </AppLayout>
  );
}
