import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { getBusinessUsage } from "@/lib/services/subscriptions";
import { BillingView, PlanUsageData } from "@/components/billing/BillingView";
import { redirect } from "next/navigation";

export default async function BillingPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const usage = await getBusinessUsage(auth.business.id);

  const usageData: PlanUsageData = {
    plan: usage.plan,
    usage: usage.usage,
  };

  return (
    <AppLayout>
      <BillingView usageData={usageData} />
    </AppLayout>
  );
}
