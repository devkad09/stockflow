"use server";

import { getCurrentUserAndBusiness } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  openShift,
  recordCashMovement,
  closeShift,
  getActiveShift,
  listShifts,
} from "@/lib/services/shifts";
import { revalidatePath } from "next/cache";

export async function openShiftAction(locationId: string, openingFloat: number, notes?: string) {
  try {
    const auth = await getCurrentUserAndBusiness();
    if (!auth) return { success: false, error: "Unauthorized" };
    if (!hasPermission(auth.role, "canAccessPOS")) {
      return { success: false, error: "Insufficient permissions" };
    }

    const shift = await openShift({
      businessId: auth.business.id,
      locationId,
      cashierId: auth.user.id,
      openingFloat,
      notes,
    });

    revalidatePath("/pos");
    revalidatePath("/shifts");
    return { success: true, shift };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to open register shift" };
  }
}

export async function recordCashMovementAction(
  shiftId: string,
  type: "CASH_IN" | "CASH_OUT",
  amount: number,
  reason: string
) {
  try {
    const auth = await getCurrentUserAndBusiness();
    if (!auth) return { success: false, error: "Unauthorized" };
    if (!hasPermission(auth.role, "canAccessPOS")) {
      return { success: false, error: "Insufficient permissions" };
    }

    const movement = await recordCashMovement({
      businessId: auth.business.id,
      shiftId,
      type,
      amount,
      reason,
    });

    revalidatePath("/pos");
    revalidatePath("/shifts");
    return { success: true, movement };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record cash movement" };
  }
}

export async function closeShiftAction(shiftId: string, actualCash: number, notes?: string) {
  try {
    const auth = await getCurrentUserAndBusiness();
    if (!auth) return { success: false, error: "Unauthorized" };
    if (!hasPermission(auth.role, "canAccessPOS")) {
      return { success: false, error: "Insufficient permissions" };
    }

    const shift = await closeShift({
      businessId: auth.business.id,
      shiftId,
      actualCash,
      notes,
    });

    revalidatePath("/pos");
    revalidatePath("/shifts");
    return { success: true, shift };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to close register shift" };
  }
}

export async function getActiveShiftAction(locationId?: string) {
  try {
    const auth = await getCurrentUserAndBusiness();
    if (!auth) return { success: false, error: "Unauthorized" };

    const shift = await getActiveShift(auth.business.id, auth.user.id, locationId);
    return { success: true, shift };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
