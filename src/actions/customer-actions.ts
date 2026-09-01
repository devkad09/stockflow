"use server";

import { prisma } from "@/lib/db";
import { requireAuth, logAudit } from "@/lib/auth";
import { customerSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function createCustomerAction(formData: unknown) {
  const auth = await requireAuth("canManageCustomers");
  const businessId = auth.business.id;

  const result = customerSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const { name, phone, email, address, notes } = result.data;

  const customer = await prisma.customer.create({
    data: {
      businessId,
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
    },
  });

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "CUSTOMER_CREATE",
    entityType: "Customer",
    entityId: customer.id,
    details: { name: customer.name, phone: customer.phone },
  });

  revalidatePath("/customers");
  revalidatePath("/pos");
  return { success: true, customer };
}

export async function updateCustomerAction(id: string, formData: unknown) {
  const auth = await requireAuth("canManageCustomers");
  const businessId = auth.business.id;

  const result = customerSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing || existing.businessId !== businessId) {
    return { success: false, error: "Customer not found" };
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: result.data.name,
      phone: result.data.phone || null,
      email: result.data.email || null,
      address: result.data.address || null,
      notes: result.data.notes || null,
    },
  });

  revalidatePath("/customers");
  return { success: true, customer };
}

export async function adjustCustomerCreditAction(customerId: string, amountChange: number, notes?: string) {
  const auth = await requireAuth("canManageCustomers");
  const businessId = auth.business.id;

  const existing = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existing || existing.businessId !== businessId) {
    return { success: false, error: "Customer not found" };
  }

  // In our schema outstandingBalance represents credit or debt
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      outstandingBalance: existing.outstandingBalance + amountChange,
    },
  });

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "CUSTOMER_CREDIT_ADJUST",
    entityType: "Customer",
    entityId: customerId,
    details: { amountChange, newBalance: updated.outstandingBalance, notes },
  });

  revalidatePath("/customers");
  return { success: true, customer: updated };
}

export async function adjustLoyaltyPointsAction(customerId: string, pointsChange: number, notes?: string) {
  const auth = await requireAuth("canManageCustomers");
  const businessId = auth.business.id;

  const existing = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existing || existing.businessId !== businessId) {
    return { success: false, error: "Customer not found" };
  }

  const newPoints = Math.max(0, existing.loyaltyPoints + pointsChange);
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { loyaltyPoints: newPoints },
  });

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "CUSTOMER_POINTS_ADJUST",
    entityType: "Customer",
    entityId: customerId,
    details: { pointsChange, newPoints, notes },
  });

  revalidatePath("/customers");
  revalidatePath("/pos");
  return { success: true, customer: updated };
}

