import { prisma } from "../db";
import { adjustInventoryTx } from "./inventory";
import { generateOrderNumber } from "../utils";

export interface CreatePOItemInput {
  productId: string;
  quantityOrdered: number;
  unitCost: number;
}

export interface CreatePOPayload {
  businessId: string;
  locationId: string;
  supplierId: string;
  expectedDeliveryDate?: Date | string | null;
  notes?: string | null;
  items: CreatePOItemInput[];
  createdBy?: string;
}

export async function createPurchaseOrder(payload: CreatePOPayload) {
  const { businessId, locationId, supplierId, expectedDeliveryDate, notes, items, createdBy } = payload;

  const orderNumber = generateOrderNumber("PO");
  let subtotal = 0;
  items.forEach((item) => {
    subtotal += item.quantityOrdered * item.unitCost;
  });

  return prisma.purchaseOrder.create({
    data: {
      businessId,
      locationId,
      supplierId,
      orderNumber,
      status: "ORDERED",
      subtotal,
      totalAmount: subtotal,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      notes: notes || null,
      createdBy: createdBy || null,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: 0,
          unitCost: item.unitCost,
          subtotal: item.quantityOrdered * item.unitCost,
        })),
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      supplier: true,
    },
  });
}

export async function receivePurchaseOrderStock({
  businessId,
  purchaseOrderId,
  receivedItems,
  userId,
}: {
  businessId: string;
  purchaseOrderId: string;
  receivedItems: { poItemId: string; quantityToReceive: number }[];
  userId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        items: true,
      },
    });

    if (!po || po.businessId !== businessId) {
      throw new Error("Purchase order not found or unauthorized");
    }

    let allReceived = true;

    for (const rec of receivedItems) {
      if (rec.quantityToReceive <= 0) continue;

      const item = po.items.find((i) => i.id === rec.poItemId);
      if (!item) continue;

      const newQtyReceived = item.quantityReceived + rec.quantityToReceive;

      // Update PO item
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: {
          quantityReceived: newQtyReceived,
        },
      });

      // Increase stock atomically and record movement
      await adjustInventoryTx(tx, {
        businessId,
        productId: item.productId,
        locationId: po.locationId,
        quantityChange: rec.quantityToReceive,
        type: "PURCHASE",
        referenceType: "PURCHASE_ORDER",
        referenceId: po.id,
        notes: `Received for PO #${po.orderNumber}`,
        userId,
      });

      if (newQtyReceived < item.quantityOrdered) {
        allReceived = false;
      }
    }

    // Check if other items in PO are still pending
    for (const item of po.items) {
      const rec = receivedItems.find((r) => r.poItemId === item.id);
      const currentReceived = rec ? item.quantityReceived + rec.quantityToReceive : item.quantityReceived;
      if (currentReceived < item.quantityOrdered) {
        allReceived = false;
      }
    }

    const updatedStatus = allReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";

    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: updatedStatus },
    });

    await tx.auditLog.create({
      data: {
        businessId,
        userId: userId || null,
        action: "PO_RECEIVE",
        entityType: "PurchaseOrder",
        entityId: po.id,
        details: JSON.stringify({
          orderNumber: po.orderNumber,
          itemsReceived: receivedItems,
          status: updatedStatus,
        }),
      },
    });

    return { success: true, status: updatedStatus };
  });
}

export async function getLowStockReorderSuggestions(businessId: string, locationId: string) {
  const products = await prisma.product.findMany({
    where: {
      businessId,
      isActive: true,
      isArchived: false,
    },
    include: {
      supplier: true,
      category: true,
      inventories: {
        where: { locationId },
      },
    },
  });

  const lowStockItems = [];

  for (const p of products) {
    const currentStock = p.inventories[0]?.quantity || 0;
    if (currentStock <= p.minStockLevel) {
      const targetStock = p.maxStockLevel && p.maxStockLevel > p.minStockLevel
        ? p.maxStockLevel
        : Math.max(p.minStockLevel * 3, 20);
      const suggestedQty = Math.max(targetStock - currentStock, 5);

      lowStockItems.push({
        product: p,
        currentStock,
        minStockLevel: p.minStockLevel,
        maxStockLevel: p.maxStockLevel,
        suggestedQty,
        estimatedCost: suggestedQty * p.costPrice,
        supplier: p.supplier || { id: "UNASSIGNED", name: "General / Unassigned Supplier" },
      });
    }
  }

  // Group by supplier
  const groupedBySupplier: Record<string, { supplier: any; items: typeof lowStockItems; totalCost: number }> = {};
  for (const item of lowStockItems) {
    const sId = item.supplier.id;
    if (!groupedBySupplier[sId]) {
      groupedBySupplier[sId] = {
        supplier: item.supplier,
        items: [],
        totalCost: 0,
      };
    }
    groupedBySupplier[sId].items.push(item);
    groupedBySupplier[sId].totalCost += item.estimatedCost;
  }

  return {
    totalLowStockCount: lowStockItems.length,
    lowStockItems,
    groupedSuppliers: Object.values(groupedBySupplier),
  };
}
