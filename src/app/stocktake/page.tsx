import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listStocktakes } from "@/lib/services/stocktake";
import { prisma } from "@/lib/db";
import { StocktakeView } from "@/components/stocktake/StocktakeView";
import { redirect } from "next/navigation";

export default async function StocktakePage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) redirect("/login");

  if (!hasPermission(auth.role, "canManageInventory")) {
    redirect("/dashboard");
  }

  const stocktakes = await listStocktakes(auth.business.id, auth.defaultLocation.id);
  const categories = await prisma.category.findMany({
    where: { businessId: auth.business.id },
    select: { id: true, name: true },
  });

  return (
    <AppLayout>
      <StocktakeView
        initialStocktakes={stocktakes as any}
        categories={categories}
        locationId={auth.defaultLocation.id}
        locationName={auth.defaultLocation.name}
        currencySymbol={auth.business.currencySymbol}
      />
    </AppLayout>
  );
}
