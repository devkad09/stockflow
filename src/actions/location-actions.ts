"use server";

import { prisma } from "@/lib/db";
import { requireAuth, logAudit } from "@/lib/auth";
import { adjustInventoryTx } from "@/lib/services/inventory";
import { revalidatePath } from "next/cache";

export async function createLocationAction(formData: {
  name: string;
  code?: string;
  address?: string;
  isDefault?: boolean;
}) {
  const auth = await requireAuth("canManageSettings");
  const businessId = auth.business.id;

  const { name, code, address, isDefault = false } = formData;
  if (!name.trim()) {
    return { success: false, error: "Location name is required" };
  }

  // If marked default, unset previous default
  if (isDefault) {
    await prisma.location.updateMany({
      where: { businessId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const location = await prisma.location.create({
    data: {
      businessId,
      name,
      code: code || `LOC-${Math.floor(100 + Math.random() * 900)}`,
      address: address || null,
      isDefault,
    },
  });

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "LOCATION_CREATE",
    entityType: "Location",
    entityId: location.id,
    details: { name: location.name, code: location.code },
  });

  revalidatePath("/locations");
  revalidatePath("/inventory");
  return { success: true, location };
}

export async function transferStockAction(payload: {
  fromLocationId: string;
  toLocationId: string;
  productId: string;
  quantity: number;
  notes?: string;
}) {
  const auth = await requireAuth("canManageInventory");
  const businessId = auth.business.id;

  const { fromLocationId, toLocationId, productId, quantity, notes } = payload;

  if (fromLocationId === toLocationId) {
    return { success: false, error: "Source and destination locations cannot be the same" };
  }
  if (quantity <= 0) {
    return { success: false, error: "Transfer quantity must be at least 1" };
  }

  try {
    const res = await prisma.$transaction(async (tx) => {
      // 1. Deduct from origin
      const outRes = await adjustInventoryTx(tx, {
        businessId,
        productId,
        locationId: fromLocationId,
        quantityChange: -quantity,
        type: "TRANSFER",
        referenceType: "STOCK_TRANSFER_OUT",
        notes: `Transfer out: ${notes || "Inter-branch transfer"}`,
        userId: auth.user.id,
        allowNegativeStock: auth.business.allowNegativeStock,
      });

      // 2. Add to destination
      const inRes = await adjustInventoryTx(tx, {
        businessId,
        productId,
        locationId: toLocationId,
        quantityChange: quantity,
        type: "TRANSFER",
        referenceType: "STOCK_TRANSFER_IN",
        notes: `Transfer in: ${notes || "Inter-branch transfer"}`,
        userId: auth.user.id,
        allowNegativeStock: true,
      });

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          businessId,
          userId: auth.user.id,
          action: "STOCK_TRANSFER",
          entityType: "Inventory",
          entityId: productId,
          details: JSON.stringify({
            productId,
            quantity,
            fromLocationId,
            toLocationId,
            notes,
          }),
        },
      });

      return { outRes, inRes };
    });

    revalidatePath("/locations");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Stock transfer failed" };
  }
}
