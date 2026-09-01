import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveShift } from "@/lib/services/shifts";
import { PosTerminal, PosProduct, PosCustomer } from "@/components/pos/PosTerminal";
import { redirect } from "next/navigation";

export default async function PosPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  // Fetch active products with current stock
  const dbProducts = await prisma.product.findMany({
    where: {
      businessId,
      isActive: true,
      isArchived: false,
    },
    include: {
      category: true,
      inventories: {
        where: { locationId: auth.defaultLocation.id },
      },
    },
    orderBy: { name: "asc" },
  });

  const products: PosProduct[] = dbProducts.map((p) => {
    const currentStock = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      categoryName: p.category?.name || "General",
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      unit: p.unit,
      currentStock,
      taxRate: p.taxRate,
    };
  });

  // Fetch customers with loyalty
  const dbCustomers = await prisma.customer.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      loyaltyPoints: true,
      loyaltyTier: true,
    },
    orderBy: { name: "asc" },
  });

  const activeShift = await getActiveShift(businessId, auth.user.id, auth.defaultLocation.id);

  return (
    <AppLayout>
      <PosTerminal
        initialProducts={products}
        customers={dbCustomers as any}
        activeShift={activeShift as any}
        business={{
          name: auth.business.name,
          currencySymbol: auth.business.currencySymbol,
          receiptHeader: auth.business.receiptHeader,
          receiptFooter: auth.business.receiptFooter,
          taxRate: auth.business.taxRate,
          phone: auth.business.phone,
          address: auth.business.address,
          allowNegativeStock: auth.business.allowNegativeStock,
        }}
        location={auth.defaultLocation}
        cashierName={auth.user.name}
      />
    </AppLayout>
  );
}

