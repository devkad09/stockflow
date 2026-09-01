"use server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createPurchaseOrder, receivePurchaseOrderStock } from "@/lib/services/purchases";
import { purchaseOrderSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function createPurchaseOrderAction(formData: unknown) {
  const auth = await requireAuth("canManagePurchases");
  const businessId = auth.business.id;

  const result = purchaseOrderSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const data = result.data;

  try {
    const po = await createPurchaseOrder({
      businessId,
      locationId: data.locationId || auth.defaultLocation.id,
      supplierId: data.supplierId,
      expectedDeliveryDate: data.expectedDeliveryDate,
      notes: data.notes,
      items: data.items,
      createdBy: auth.user.id,
    });

    revalidatePath("/purchases");
    return { success: true, purchaseOrder: po };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create purchase order" };
  }
}

export async function receivePurchaseStockAction(payload: {
  purchaseOrderId: string;
  receivedItems: { poItemId: string; quantityToReceive: number }[];
}) {
  const auth = await requireAuth("canManagePurchases");
  const businessId = auth.business.id;

  try {
    const res = await receivePurchaseOrderStock({
      businessId,
      purchaseOrderId: payload.purchaseOrderId,
      receivedItems: payload.receivedItems,
      userId: auth.user.id,
    });

    revalidatePath("/purchases");
    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/dashboard");

    return { success: true, status: res.status };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to receive purchase order stock" };
  }
}

export async function updatePOStatusAction(id: string, status: string) {
  const auth = await requireAuth("canManagePurchases");
  const businessId = auth.business.id;

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po || po.businessId !== businessId) {
    return { success: false, error: "Purchase order not found" };
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/purchases");
  return { success: true };
}

export async function getLowStockReorderSuggestionsAction(locationId?: string) {
  const auth = await requireAuth("canManagePurchases");
  const businessId = auth.business.id;
  const locId = locationId || auth.defaultLocation.id;

  try {
    const { getLowStockReorderSuggestions } = await import("@/lib/services/purchases");
    const suggestions = await getLowStockReorderSuggestions(businessId, locId);
    return { success: true, ...suggestions };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch reorder suggestions" };
  }
}

export async function autoGeneratePOsAction(payload: {
  locationId: string;
  orders: Array<{
    supplierId: string;
    items: Array<{ productId: string; quantityOrdered: number; unitCost: number }>;
  }>;
}) {
  const auth = await requireAuth("canManagePurchases");
  const businessId = auth.business.id;

  try {
    const createdPOs = [];
    for (const order of payload.orders) {
      if (!order.items.length) continue;
      // Skip placeholder UNASSIGNED if no valid supplier
      if (order.supplierId === "UNASSIGNED") continue;

      const po = await createPurchaseOrder({
        businessId,
        locationId: payload.locationId || auth.defaultLocation.id,
        supplierId: order.supplierId,
        items: order.items,
        notes: "Auto-generated from Low Stock Smart Reorder",
        createdBy: auth.user.id,
      });
      createdPOs.push(po);
    }

    revalidatePath("/purchases");
    revalidatePath("/dashboard");
    return { success: true, count: createdPOs.length, purchaseOrders: createdPOs };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to auto-generate purchase orders" };
  }
}

