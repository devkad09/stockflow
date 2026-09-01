import { prisma } from "../db";
import { adjustInventoryTx } from "./inventory";
import { generateReceiptNumber } from "../utils";

export interface RefundItemInput {
  saleItemId: string;
  productId: string;
  quantity: number;
  refundAmount: number;
  restocked: boolean;
}

export interface ProcessRefundPayload {
  businessId: string;
  saleId: string;
  reason: string;
  items: RefundItemInput[];
  processedBy?: string;
}

export async function processRefund(payload: ProcessRefundPayload) {
  const { businessId, saleId, reason, items, processedBy } = payload;

  return prisma.$transaction(async (tx) => {
    // 1. Fetch sale with existing items
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: {
        items: true,
        refunds: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!sale || sale.businessId !== businessId) {
      throw new Error("Sale not found or unauthorized");
    }

    const refundNumber = generateReceiptNumber("REF");
    const totalRefundAmount = items.reduce((acc, item) => acc + item.refundAmount, 0);

    // 2. Create Refund record
    const refund = await tx.refund.create({
      data: {
        businessId,
        saleId,
        refundNumber,
        totalRefundAmount,
        reason,
        processedBy: processedBy || null,
      },
    });

    // 3. Process each refund item
    for (const item of items) {
      await tx.refundItem.create({
        data: {
          refundId: refund.id,
          saleItemId: item.saleItemId,
          productId: item.productId,
          quantity: item.quantity,
          refundAmount: item.refundAmount,
          restocked: item.restocked,
        },
      });

      // If restocked, increase stock and create inventory movement
      if (item.restocked) {
        await adjustInventoryTx(tx, {
          businessId,
          productId: item.productId,
          locationId: sale.locationId,
          quantityChange: item.quantity,
          type: "RETURN",
          referenceType: "REFUND",
          referenceId: refund.id,
          notes: `Restock from Refund #${refundNumber}: ${reason}`,
          userId: processedBy,
        });
      }
    }

    // 4. Update sale status
    const allSaleItemsCount = sale.items.reduce((acc, i) => acc + i.quantity, 0);
    const totalPreviouslyRefundedCount = sale.refunds.flatMap((r) => r.items).reduce((acc, i) => acc + i.quantity, 0);
    const currentRefundedCount = items.reduce((acc, i) => acc + i.quantity, 0);

    const isFullRefund = totalPreviouslyRefundedCount + currentRefundedCount >= allSaleItemsCount;

    await tx.sale.update({
      where: { id: saleId },
      data: {
        status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });

    // 5. Audit log
    await tx.auditLog.create({
      data: {
        businessId,
        userId: processedBy || null,
        action: "REFUND_PROCESS",
        entityType: "Refund",
        entityId: refund.id,
        details: JSON.stringify({
          refundNumber,
          saleId,
          totalRefundAmount,
          itemsCount: items.length,
          reason,
        }),
      },
    });

    return refund;
  });
}
