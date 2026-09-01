"use server";

import { getCurrentUserAndBusiness } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  createStocktakeSession,
  updateStocktakeItemCount,
  completeStocktakeReconciliation,
} from "@/lib/services/stocktake";
import { revalidatePath } from "next/cache";

export async function createStocktakeAction(
  locationId: string,
  title: string,
  categoryId?: string,
  notes?: string
) {
  try {
    const auth = await getCurrentUserAndBusiness();
    if (!auth) return { success: false, error: "Unauthorized" };
    if (!hasPermission(auth.role, "canManageInventory")) {
      return { success: false, error: "Insufficient permissions" };
    }

    const stocktake = await createStocktakeSession({
      businessId: auth.business.id,
      locationId,
      title,
      categoryId,
      userId: auth.user.id,
      notes,
    });

    revalidatePath("/stocktake");
    revalidatePath("/inventory");
    return { success: true, stocktake };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create stocktake session" };
  }
}

export async function updateStocktakeCountAction(
  stocktakeId: string,
  productId: string,
  countedStock: number
) {
  try {
    const auth = await getCurrentUserAndBusiness();
    if (!auth) return { success: false, error: "Unauthorized" };
    if (!hasPermission(auth.role, "canManageInventory")) {
      return { success: false, error: "Insufficient permissions" };
    }

    const item = await updateStocktakeItemCount({
      businessId: auth.business.id,
      stocktakeId,
      productId,
      countedStock,
    });

    return { success: true, item };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update item count" };
  }
}

export async function completeStocktakeAction(stocktakeId: string, notes?: string) {
  try {
    const auth = await getCurrentUserAndBusiness();
    if (!auth) return { success: false, error: "Unauthorized" };
    if (!hasPermission(auth.role, "canManageInventory")) {
      return { success: false, error: "Insufficient permissions" };
    }

    const completed = await completeStocktakeReconciliation({
      businessId: auth.business.id,
      stocktakeId,
      userId: auth.user.id,
      notes,
    });

    revalidatePath("/stocktake");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { success: true, stocktake: completed };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reconcile stocktake" };
  }
}
