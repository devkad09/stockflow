"use server";

import { requireAuth, logAudit } from "@/lib/auth";
import { adjustStock } from "@/lib/services/inventory";
import { stockAdjustmentSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function adjustStockAction(formData: unknown) {
  const auth = await requireAuth("canManageInventory");
  const businessId = auth.business.id;

  const result = stockAdjustmentSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const { productId, locationId, quantityChange, type, notes } = result.data;

  try {
    const res = await adjustStock({
      businessId,
      productId,
      locationId,
      quantityChange,
      type,
      referenceType: "MANUAL_ADJUSTMENT",
      notes,
      userId: auth.user.id,
      allowNegativeStock: auth.business.allowNegativeStock,
    });

    await logAudit({
      businessId,
      userId: auth.user.id,
      action: "STOCK_ADJUST",
      entityType: "Inventory",
      entityId: productId,
      details: {
        productId,
        quantityChange,
        type,
        newQuantity: res.movement.newQuantity,
        notes,
      },
    });

    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true, movement: res.movement };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to adjust stock" };
  }
}
