import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BarcodeGeneratorView, BarcodeProduct } from "@/components/barcodes/BarcodeGeneratorView";
import { redirect } from "next/navigation";

export default async function BarcodesPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  const dbProducts = await prisma.product.findMany({
    where: { businessId, isArchived: false, isActive: true },
    include: {
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const products: BarcodeProduct[] = dbProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode || "890123450000",
    sellingPrice: p.sellingPrice,
    categoryName: p.category?.name || "General",
  }));

  return (
    <AppLayout>
      <BarcodeGeneratorView
        products={products}
        businessName={auth.business.name}
        currencySymbol={auth.business.currencySymbol}
      />
    </AppLayout>
  );
}
