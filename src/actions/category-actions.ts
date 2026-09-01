"use server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { categorySchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function createCategoryAction(formData: unknown) {
  const auth = await requireAuth("canManageProducts");
  const businessId = auth.business.id;

  const result = categorySchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const { name, description, color } = result.data;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.floor(100 + Math.random() * 900);

  const category = await prisma.category.create({
    data: {
      businessId,
      name,
      slug,
      description: description || null,
      color: color || "#3b82f6",
    },
  });

  revalidatePath("/products");
  return { success: true, category };
}

export async function updateCategoryAction(id: string, formData: unknown) {
  const auth = await requireAuth("canManageProducts");
  const businessId = auth.business.id;

  const result = categorySchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: result.data.name,
      description: result.data.description || null,
      color: result.data.color,
    },
  });

  revalidatePath("/products");
  return { success: true, category };
}

export async function deleteCategoryAction(id: string) {
  const auth = await requireAuth("canManageProducts");
  const businessId = auth.business.id;

  const existing = await prisma.category.findUnique({
    where: { id },
  });

  if (!existing || existing.businessId !== businessId) {
    return { success: false, error: "Category not found" };
  }

  await prisma.category.delete({
    where: { id },
  });

  revalidatePath("/products");
  return { success: true };
}
