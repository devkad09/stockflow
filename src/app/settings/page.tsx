import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettingsView, BusinessSettingsData } from "@/components/settings/SettingsView";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: { id: auth.business.id },
  });

  if (!business) {
    redirect("/login");
  }

  const settingsData: BusinessSettingsData = {
    name: business.name,
    type: business.type,
    country: business.country,
    currency: business.currency,
    currencySymbol: business.currencySymbol,
    phone: business.phone,
    email: business.email,
    address: business.address,
    taxRate: business.taxRate,
    taxNumber: business.taxNumber,
    receiptHeader: business.receiptHeader,
    receiptFooter: business.receiptFooter,
    allowNegativeStock: business.allowNegativeStock,
  };

  return (
    <AppLayout>
      <SettingsView initialSettings={settingsData} />
    </AppLayout>
  );
}
