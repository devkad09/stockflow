import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LocationsView, LocationItem, ProductOption } from "@/components/locations/LocationsView";
import { redirect } from "next/navigation";

export default async function LocationsPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  const dbLocations = await prisma.location.findMany({
    where: { businessId, isActive: true },
    include: {
      inventories: true,
    },
    orderBy: { isDefault: "desc" },
  });

  const locations: LocationItem[] = dbLocations.map((l) => {
    const totalUnits = l.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
    return {
      id: l.id,
      name: l.name,
      code: l.code,
      address: l.address,
      isDefault: l.isDefault,
      itemCount: l.inventories.length,
      totalUnits,
    };
  });

  const dbProducts: ProductOption[] = await prisma.product.findMany({
    where: { businessId, isArchived: false, isActive: true },
    select: { id: true, name: true, sku: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppLayout>
      <LocationsView initialLocations={locations} products={dbProducts} />
    </AppLayout>
  );
}
