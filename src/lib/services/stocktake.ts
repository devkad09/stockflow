import { prisma } from "../db";
import { adjustInventoryTx } from "./inventory";

export interface CreateStocktakeInput {
  businessId: string;
  locationId: string;
  title: string;
  categoryId?: string;
  userId?: string;
  notes?: string;
}

export interface UpdateStocktakeCountInput {
  businessId: string;
  stocktakeId: string;
  productId: string;
  countedStock: number;
}

export interface CompleteStocktakeInput {
  businessId: string;
  stocktakeId: string;
  userId?: string;
  notes?: string;
}

export async function createStocktakeSession(input: CreateStocktakeInput) {
  // Fetch active products with current stock at this location
  const productWhere: any = {
    businessId: input.businessId,
    isActive: true,
    isArchived: false,
  };
  if (input.categoryId && input.categoryId !== "ALL") {
    productWhere.categoryId = input.categoryId;
  }

  const products = await prisma.product.findMany({
    where: productWhere,
    include: {
      inventories: {
        where: { locationId: input.locationId },
      },
    },
  });

  return prisma.$transaction(async (tx) => {
    const stocktake = await tx.stocktake.create({
      data: {
        businessId: input.businessId,
        locationId: input.locationId,
        title: input.title,
        status: "DRAFT",
        totalItemsCount: products.length,
        notes: input.notes || null,
        createdBy: input.userId || null,
      },
    });

    for (const p of products) {
      const currentStock = p.inventories[0]?.quantity || 0;
      await tx.stocktakeItem.create({
        data: {
          stocktakeId: stocktake.id,
          productId: p.id,
          expectedStock: currentStock,
          countedStock: currentStock, // Default to expected, cashier modifies as they scan
          variance: 0,
          unitCost: p.costPrice,
          varianceCost: 0,
        },
      });
    }

    return tx.stocktake.findUnique({
      where: { id: stocktake.id },
      include: {
        items: {
          include: { product: true },
        },
        location: true,
      },
    });
  });
}

export async function updateStocktakeItemCount(input: UpdateStocktakeCountInput) {
  const item = await prisma.stocktakeItem.findFirst({
    where: {
      stocktakeId: input.stocktakeId,
      productId: input.productId,
    },
    include: {
      stocktake: true,
    },
  });

  if (!item) throw new Error("Stocktake item not found");
  if (item.stocktake.businessId !== input.businessId) throw new Error("Unauthorized");
  if (item.stocktake.status !== "DRAFT") throw new Error("Cannot edit a completed or cancelled stocktake");

  const variance = input.countedStock - item.expectedStock;
  const varianceCost = variance * item.unitCost;

  return prisma.stocktakeItem.update({
    where: { id: item.id },
    data: {
      countedStock: input.countedStock,
      variance,
      varianceCost,
    },
    include: {
      product: true,
    },
  });
}

export async function completeStocktakeReconciliation(input: CompleteStocktakeInput) {
  return prisma.$transaction(async (tx) => {
    const stocktake = await tx.stocktake.findFirst({
      where: { id: input.stocktakeId, businessId: input.businessId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!stocktake) throw new Error("Stocktake session not found");
    if (stocktake.status !== "DRAFT") throw new Error("Stocktake is already completed or cancelled");

    let totalVarianceCost = 0;

    for (const item of stocktake.items) {
      const variance = item.countedStock - item.expectedStock;
      const varianceCost = variance * item.unitCost;
      totalVarianceCost += varianceCost;

      // If variance is non-zero, apply atomic inventory adjustment
      if (variance !== 0) {
        await adjustInventoryTx(tx, {
          businessId: input.businessId,
          productId: item.productId,
          locationId: stocktake.locationId,
          quantityChange: variance,
          type: "ADJUSTMENT",
          referenceType: "STOCKTAKE",
          referenceId: stocktake.id,
          notes: `Stocktake audit #${stocktake.title} adjustment: ${variance > 0 ? "+" : ""}${variance} ${item.product.unit}`,
          userId: input.userId,
          allowNegativeStock: false,
        });
      }
    }

    // Complete stocktake
    const completed = await tx.stocktake.update({
      where: { id: stocktake.id },
      data: {
        status: "COMPLETED",
        totalVarianceCost,
        completedAt: new Date(),
        notes: input.notes ? `${stocktake.notes ? stocktake.notes + " | " : ""}${input.notes}` : stocktake.notes,
      },
      include: {
        items: {
          include: { product: true },
        },
        location: true,
        creator: true,
      },
    });

    // Audit Log
    await tx.auditLog.create({
      data: {
        businessId: input.businessId,
        userId: input.userId || null,
        action: "STOCK_ADJUST",
        entityType: "Stocktake",
        entityId: stocktake.id,
        details: JSON.stringify({
          title: stocktake.title,
          totalItems: stocktake.items.length,
          totalVarianceCost,
        }),
      },
    });

    return completed;
  });
}

export async function listStocktakes(businessId: string, locationId?: string) {
  const where: any = { businessId };
  if (locationId) where.locationId = locationId;

  return prisma.stocktake.findMany({
    where,
    include: {
      location: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
