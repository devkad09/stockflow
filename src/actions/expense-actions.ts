"use server";

import { prisma } from "@/lib/db";
import { requireAuth, logAudit } from "@/lib/auth";
import { expenseSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function createExpenseAction(formData: unknown) {
  const auth = await requireAuth("canManageExpenses");
  const businessId = auth.business.id;

  const result = expenseSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const { category, amount, date, description, paymentMethod, reference } = result.data;

  const expense = await prisma.expense.create({
    data: {
      businessId,
      category,
      amount,
      date: new Date(date),
      description,
      paymentMethod,
      reference: reference || null,
      createdBy: auth.user.id,
    },
  });

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "EXPENSE_CREATE",
    entityType: "Expense",
    entityId: expense.id,
    details: { category, amount, description },
  });

  revalidatePath("/expenses");
  revalidatePath("/reports");
  revalidatePath("/dashboard");

  return { success: true, expense };
}

export async function deleteExpenseAction(id: string) {
  const auth = await requireAuth("canManageExpenses");
  const businessId = auth.business.id;

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing || existing.businessId !== businessId) {
    return { success: false, error: "Expense not found" };
  }

  await prisma.expense.delete({ where: { id } });

  revalidatePath("/expenses");
  revalidatePath("/reports");
  return { success: true };
}
