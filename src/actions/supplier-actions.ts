"use server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { supplierSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function createSupplierAction(formData: unknown) {
  const auth = await requireAuth("canManageSuppliers");
  const businessId = auth.business.id;

  const result = supplierSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const { name, contactPerson, phone, email, address, notes } = result.data;

  const supplier = await prisma.supplier.create({
    data: {
      businessId,
      name,
      contactPerson: contactPerson || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath("/purchases");
  return { success: true, supplier };
}

export async function updateSupplierAction(id: string, formData: unknown) {
  const auth = await requireAuth("canManageSuppliers");
  const businessId = auth.business.id;

  const result = supplierSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing || existing.businessId !== businessId) {
    return { success: false, error: "Supplier not found" };
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name: result.data.name,
      contactPerson: result.data.contactPerson || null,
      phone: result.data.phone || null,
      email: result.data.email || null,
      address: result.data.address || null,
      notes: result.data.notes || null,
    },
  });

  revalidatePath("/suppliers");
  return { success: true, supplier };
}
