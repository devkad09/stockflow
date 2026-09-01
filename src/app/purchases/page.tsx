import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PurchasesView, POItem, SupplierOption, ProductOption } from "@/components/purchases/PurchasesView";
import { redirect } from "next/navigation";

export default async function PurchasesPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  const dbPOs = await prisma.purchaseOrder.findMany({
    where: { businessId },
    include: {
      supplier: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pos: POItem[] = dbPOs.map((p) => ({
    id: p.id,
    orderNumber: p.orderNumber,
    supplierId: p.supplierId,
    supplierName: p.supplier.name,
    status: p.status,
    subtotal: p.subtotal,
    totalAmount: p.totalAmount,
    expectedDeliveryDate: p.expectedDeliveryDate ? p.expectedDeliveryDate.toISOString() : null,
    notes: p.notes,
    creatorName: p.creator?.name || "Staff",
    createdAt: p.createdAt.toISOString(),
    items: p.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      productSku: i.product.sku,
      quantityOrdered: i.quantityOrdered,
      quantityReceived: i.quantityReceived,
      unitCost: i.unitCost,
      subtotal: i.subtotal,
    })),
  }));

  const dbSuppliers: SupplierOption[] = await prisma.supplier.findMany({
    where: { businessId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const dbProducts: ProductOption[] = await prisma.product.findMany({
    where: { businessId, isArchived: false },
    select: { id: true, name: true, sku: true, costPrice: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppLayout>
      <PurchasesView
        initialPOs={pos}
        suppliers={dbSuppliers}
        products={dbProducts}
        currencySymbol={auth.business.currencySymbol}
        locationId={auth.defaultLocation.id}
      />
    </AppLayout>
  );
}
