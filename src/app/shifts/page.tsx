import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listShifts, getActiveShift } from "@/lib/services/shifts";
import { ShiftsView } from "@/components/shifts/ShiftsView";
import { redirect } from "next/navigation";

export default async function ShiftsPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) redirect("/login");

  if (!hasPermission(auth.role, "canAccessPOS")) {
    redirect("/dashboard");
  }

  const shifts = await listShifts(auth.business.id, auth.defaultLocation.id);
  const activeShift = await getActiveShift(auth.business.id, auth.user.id, auth.defaultLocation.id);

  return (
    <AppLayout>
      <ShiftsView
        initialShifts={shifts as any}
        activeShift={activeShift as any}
        locationId={auth.defaultLocation.id}
        locationName={auth.defaultLocation.name}
        currencySymbol={auth.business.currencySymbol}
      />
    </AppLayout>
  );
}
