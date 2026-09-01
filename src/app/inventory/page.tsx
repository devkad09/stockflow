import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InventoryView, InventoryItem, MovementRecord } from "@/components/inventory/InventoryView";
import { redirect } from "next/navigation";

export default async function InventoryPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;
  const locationId = auth.defaultLocation.id;

  // Fetch products with inventory
  const dbProducts = await prisma.product.findMany({
    where: {
      businessId,
      isArchived: false,
    },
    include: {
      category: { select: { name: true } },
      inventories: {
        where: { locationId },
      },
    },
    orderBy: { name: "asc" },
  });

  const items: InventoryItem[] = dbProducts.map((p) => {
    const currentStock = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      categoryName: p.category?.name || "General",
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      minStockLevel: p.minStockLevel,
      unit: p.unit,
      currentStock,
    };
  });

  // Fetch inventory movements
  const dbMovements = await prisma.inventoryMovement.findMany({
    where: { businessId, locationId },
    include: {
      product: { select: { name: true, sku: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  const movements: MovementRecord[] = dbMovements.map((m) => ({
    id: m.id,
    productName: m.product.name,
    productSku: m.product.sku,
    quantityChange: m.quantityChange,
    previousQuantity: m.previousQuantity,
    newQuantity: m.newQuantity,
    type: m.type,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    notes: m.notes,
    userName: m.user?.name || "System",
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <AppLayout>
      <InventoryView
        initialInventory={items}
        initialMovements={movements}
        currencySymbol={auth.business.currencySymbol}
        locationId={locationId}
        locationName={auth.defaultLocation.name}
      />
    </AppLayout>
  );
}
