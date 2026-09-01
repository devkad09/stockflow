import { prisma } from "../db";
import { adjustInventoryTx } from "./inventory";
import { generateReceiptNumber } from "../utils";

export interface SaleCheckoutItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountAmount?: number;
  taxAmount?: number;
}

export interface SaleCheckoutPayload {
  businessId: string;
  locationId: string;
  cashierId?: string;
  customerId?: string | null;
  shiftId?: string | null;
  couponCode?: string | null;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscount?: number;
  items: SaleCheckoutItem[];
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: "CASH" | "CARD" | "BANK_TRANSFER" | "MOBILE_MONEY" | "OTHER";
  notes?: string | null;
  allowNegativeStock?: boolean;
}

export async function processSaleCheckout(payload: SaleCheckoutPayload) {
  const {
    businessId,
    locationId,
    cashierId,
    customerId,
    shiftId,
    couponCode,
    loyaltyPointsRedeemed = 0,
    loyaltyDiscount = 0,
    items,
    subtotal,
    discountAmount,
    discountPercent,
    taxAmount,
    totalAmount,
    paidAmount,
    changeAmount,
    paymentMethod,
    notes,
    allowNegativeStock = false,
  } = payload;

  if (!items || items.length === 0) {
    throw new Error("Cart is empty");
  }

  // Calculate points earned: 1 point for every $1 spent
  const loyaltyPointsEarned = Math.floor(Math.max(0, totalAmount));

  return prisma.$transaction(async (tx) => {
    // 1. Generate unique receipt number
    const receiptNumber = generateReceiptNumber("REC");

    // 2. Create Sale Header
    const sale = await tx.sale.create({
      data: {
        businessId,
        locationId,
        cashierId: cashierId || null,
        customerId: customerId || null,
        shiftId: shiftId || null,
        receiptNumber,
        subtotal,
        discountAmount,
        discountPercent,
        couponCode: couponCode || null,
        loyaltyPointsEarned: customerId ? loyaltyPointsEarned : 0,
        loyaltyPointsRedeemed: customerId ? loyaltyPointsRedeemed : 0,
        loyaltyDiscount: customerId ? loyaltyDiscount : 0,
        taxAmount,
        totalAmount,
        paidAmount,
        changeAmount,
        balanceAmount: Math.max(0, totalAmount - paidAmount),
        paymentMethod,
        status: "COMPLETED",
        notes: notes || null,
      },
    });

    // 3. Process each line item: Create SaleItem and deduct inventory
    for (const item of items) {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemTotal = itemSubtotal - (item.discountAmount || 0) + (item.taxAmount || 0);

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount || 0,
          taxAmount: item.taxAmount || 0,
          subtotal: itemSubtotal,
          total: itemTotal,
        },
      });

      // Deduct stock atomically & record movement
      await adjustInventoryTx(tx, {
        businessId,
        productId: item.productId,
        locationId,
        quantityChange: -item.quantity,
        type: "SALE",
        referenceType: "SALE",
        referenceId: sale.id,
        notes: `Sale #${receiptNumber}`,
        userId: cashierId,
        allowNegativeStock,
      });
    }

    // 4. Create Payment record
    await tx.payment.create({
      data: {
        businessId,
        saleId: sale.id,
        amount: paidAmount,
        method: paymentMethod,
        reference: receiptNumber,
        receivedBy: cashierId || null,
      },
    });

    // 5. Update Coupon usage if coupon was applied
    if (couponCode) {
      const coupon = await tx.discountCoupon.findUnique({
        where: { businessId_code: { businessId, code: couponCode.trim().toUpperCase() } },
      });
      if (coupon) {
        await tx.discountCoupon.update({
          where: { id: coupon.id },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    // 6. Update Customer stats, points & VIP tier
    if (customerId) {
      const currentCustomer = await tx.customer.findUnique({ where: { id: customerId } });
      if (currentCustomer) {
        const newTotalSpent = currentCustomer.totalSpent + totalAmount;
        const newPoints = Math.max(0, currentCustomer.loyaltyPoints - loyaltyPointsRedeemed + loyaltyPointsEarned);

        let newTier = "BRONZE";
        if (newTotalSpent >= 2500) newTier = "PLATINUM";
        else if (newTotalSpent >= 1000) newTier = "GOLD";
        else if (newTotalSpent >= 300) newTier = "SILVER";

        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalSpent: { increment: totalAmount },
            totalPurchases: { increment: 1 },
            loyaltyPoints: newPoints,
            loyaltyTier: newTier,
          },
        });
      }
    }

    // 7. Update Shift totals if shiftId is attached
    if (shiftId) {
      const cashDelta = paymentMethod === "CASH" ? paidAmount : 0;
      const cardDelta = paymentMethod === "CARD" ? paidAmount : 0;
      const otherDelta = (paymentMethod !== "CASH" && paymentMethod !== "CARD") ? paidAmount : 0;

      await tx.registerShift.update({
        where: { id: shiftId },
        data: {
          cashSales: { increment: cashDelta },
          cardSales: { increment: cardDelta },
          otherSales: { increment: otherDelta },
          expectedCash: { increment: cashDelta },
        },
      });
    }

    // 8. Create Audit Log
    await tx.auditLog.create({
      data: {
        businessId,
        userId: cashierId || null,
        action: "SALE_COMPLETE",
        entityType: "Sale",
        entityId: sale.id,
        details: JSON.stringify({
          receiptNumber,
          totalAmount,
          itemCount: items.length,
          paymentMethod,
          couponCode: couponCode || undefined,
          pointsEarned: loyaltyPointsEarned,
          pointsRedeemed: loyaltyPointsRedeemed,
        }),
      },
    });

    // Fetch complete sale record with relations for receipt
    return tx.sale.findUnique({
      where: { id: sale.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        cashier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        location: true,
        business: true,
      },
    });
  });
}
