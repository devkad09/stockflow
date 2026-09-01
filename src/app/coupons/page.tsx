import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listCoupons } from "@/lib/services/coupons";
import { CouponsView } from "@/components/coupons/CouponsView";
import { redirect } from "next/navigation";

export default async function CouponsPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) redirect("/login");

  if (!hasPermission(auth.role, "canManageSettings")) {
    redirect("/dashboard");
  }

  const coupons = await listCoupons(auth.business.id);

  return (
    <AppLayout>
      <CouponsView
        initialCoupons={coupons as any}
        currencySymbol={auth.business.currencySymbol}
      />
    </AppLayout>
  );
}
