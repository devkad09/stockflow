import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProductsView, ProductItem, CategoryItem, SupplierOption } from "@/components/products/ProductsView";
import { redirect } from "next/navigation";

export default async function ProductsPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  const dbProducts = await prisma.product.findMany({
    where: { businessId },
    include: {
      category: { select: { id: true, name: true, color: true } },
      supplier: { select: { id: true, name: true } },
      inventories: {
        where: { locationId: auth.defaultLocation.id },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const products: ProductItem[] = dbProducts.map((p) => {
    const currentStock = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      description: p.description,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      minStockLevel: p.minStockLevel,
      unit: p.unit,
      taxRate: p.taxRate,
      isArchived: p.isArchived,
      isActive: p.isActive,
      categoryId: p.categoryId,
      supplierId: p.supplierId,
      category: p.category,
      supplier: p.supplier,
      currentStock,
    };
  });

  const dbCategories = await prisma.category.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });

  const categories: CategoryItem[] = dbCategories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));

  const dbSuppliers = await prisma.supplier.findMany({
    where: { businessId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppLayout>
      <ProductsView
        initialProducts={products}
        categories={categories}
        suppliers={dbSuppliers}
        currencySymbol={auth.business.currencySymbol}
      />
    </AppLayout>
  );
}
