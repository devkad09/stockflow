import { prisma } from "../db";
import { Prisma } from "@prisma/client";

export interface StockAdjustmentInput {
  businessId: string;
  productId: string;
  locationId: string;
  quantityChange: number; // positive or negative
  type: "PURCHASE" | "SALE" | "RETURN" | "ADJUSTMENT" | "TRANSFER" | "DAMAGED" | "OPENING_STOCK";
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  userId?: string;
  allowNegativeStock?: boolean;
}

export async function adjustInventoryTx(
  tx: Prisma.TransactionClient,
  input: StockAdjustmentInput
) {
  const {
    businessId,
    productId,
    locationId,
    quantityChange,
    type,
    referenceType,
    referenceId,
    notes,
    userId,
    allowNegativeStock = false,
  } = input;

  // 1. Fetch current inventory or default to 0
  const currentInv = await tx.inventory.findUnique({
    where: {
      productId_locationId: {
        productId,
        locationId,
      },
    },
  });

  const previousQuantity = currentInv ? currentInv.quantity : 0;
  const newQuantity = previousQuantity + quantityChange;

  // 2. Check negative stock constraint
  if (newQuantity < 0 && !allowNegativeStock) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    throw new Error(
      `Insufficient stock for "${product?.name || productId}". Available: ${previousQuantity}, Requested reduction: ${Math.abs(
        quantityChange
      )}`
    );
  }

  // 3. Upsert inventory record
  const updatedInv = await tx.inventory.upsert({
    where: {
      productId_locationId: {
        productId,
        locationId,
      },
    },
    update: {
      quantity: newQuantity,
    },
    create: {
      businessId,
      productId,
      locationId,
      quantity: newQuantity,
    },
  });

  // 4. Create immutable inventory movement record
  const movement = await tx.inventoryMovement.create({
    data: {
      businessId,
      productId,
      locationId,
      quantityChange,
      previousQuantity,
      newQuantity,
      type,
      referenceType,
      referenceId,
      notes,
      userId,
    },
  });

  return { inventory: updatedInv, movement };
}

export async function adjustStock(input: StockAdjustmentInput) {
  return prisma.$transaction(async (tx) => {
    return adjustInventoryTx(tx, input);
  });
}

export async function getLowStockAlerts(businessId: string) {
  const products = await prisma.product.findMany({
    where: {
      businessId,
      isArchived: false,
      isActive: true,
    },
    include: {
      category: true,
      inventories: true,
    },
  });

  return products
    .map((p) => {
      const currentStock = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
      const isOutOfStock = currentStock <= 0;
      const isLowStock = currentStock <= p.minStockLevel && !isOutOfStock;
      return {
        ...p,
        currentStock,
        isOutOfStock,
        isLowStock,
      };
    })
    .filter((p) => p.isLowStock || p.isOutOfStock);
}
