"use server";

import { prisma } from "@/lib/db";
import { requireAuth, logAudit } from "@/lib/auth";
import { businessSettingsSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function updateSettingsAction(formData: unknown) {
  const auth = await requireAuth("canManageSettings");
  const businessId = auth.business.id;

  const result = businessSettingsSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const data = result.data;

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: {
      name: data.name,
      type: data.type,
      country: data.country,
      currency: data.currency,
      currencySymbol: data.currencySymbol,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      taxRate: data.taxRate,
      taxNumber: data.taxNumber || null,
      receiptHeader: data.receiptHeader || null,
      receiptFooter: data.receiptFooter || null,
      allowNegativeStock: data.allowNegativeStock,
    },
  });

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "SETTINGS_UPDATE",
    entityType: "Business",
    entityId: businessId,
    details: { name: updated.name, currency: updated.currency, taxRate: updated.taxRate },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/pos");

  return { success: true, business: updated };
}

export async function changePlanAction(newPlan: string) {
  const auth = await requireAuth("canManageBilling");
  const businessId = auth.business.id;

  const validPlans = ["FREE", "PRO", "BUSINESS"];
  if (!validPlans.includes(newPlan.toUpperCase())) {
    return { success: false, error: "Invalid plan" };
  }

  await prisma.business.update({
    where: { id: businessId },
    data: { plan: newPlan.toUpperCase() },
  });

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "PLAN_CHANGE",
    entityType: "Business",
    entityId: businessId,
    details: { newPlan },
  });

  revalidatePath("/billing");
  revalidatePath("/dashboard");

  return { success: true };
}
