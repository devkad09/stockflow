"use server";

import { prisma } from "@/lib/db";
import { requireAuth, logAudit } from "@/lib/auth";
import { processSaleCheckout } from "@/lib/services/sales";
import { generateOrderNumber } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export interface CreateQuotePayload {
  customerId: string;
  locationId: string;
  notes?: string;
  paymentTerms?: string;
  validUntil?: string;
  discountPercent?: number;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export async function createQuoteAction(payload: CreateQuotePayload) {
  const auth = await requireAuth("canViewSales");
  const businessId = auth.business.id;

  const { customerId, locationId, notes, paymentTerms, validUntil, discountPercent = 0, items } = payload;

  if (items.length === 0) {
    return { success: false, error: "Quote must contain at least one item line" };
  }

  const quoteNumber = generateOrderNumber("QT");

  // Fetch product costs
  const pIds = items.map((i) => i.productId);
  const dbProds = await prisma.product.findMany({
    where: { id: { in: pIds } },
  });

  const subtotal = items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = Math.round(taxable * (auth.business.taxRate / 100) * 100) / 100;
  const totalAmount = taxable + taxAmount;

  // We can store quotations as a special Sale with status "QUOTE" or structured audit record
  const quote = await prisma.sale.create({
    data: {
      businessId,
      locationId: locationId || auth.defaultLocation.id,
      customerId,
      receiptNumber: quoteNumber,
      cashierId: auth.user.id,
      subtotal,
      discountAmount,
      discountPercent,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      changeAmount: 0,
      balanceAmount: totalAmount,
      paymentMethod: "OTHER",
      status: "QUOTE",
      notes: notes || `Payment Terms: ${paymentTerms || "Net 30"}`,
      items: {
        create: items.map((item) => {
          const p = dbProds.find((dbP) => dbP.id === item.productId);
          const lineSub = item.quantity * item.unitPrice;
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitCost: p?.costPrice || 0,
            unitPrice: item.unitPrice,
            discountAmount: 0,
            taxAmount: 0,
            subtotal: lineSub,
            total: lineSub,
          };
        }),
      },
    },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "QUOTE_CREATE",
    entityType: "Sale",
    entityId: quote.id,
    details: { quoteNumber, totalAmount, customerId },
  });

  revalidatePath("/invoices");
  return { success: true, quote };
}

export async function convertQuoteToSaleAction(quoteId: string, paymentMethod: string = "BANK_TRANSFER") {
  const auth = await requireAuth("canAccessPOS");
  const businessId = auth.business.id;

  const quote = await prisma.sale.findUnique({
    where: { id: quoteId },
    include: { items: true },
  });

  if (!quote || quote.businessId !== businessId || quote.status !== "QUOTE") {
    return { success: false, error: "Quote not found or already converted" };
  }

  try {
    const sale = await processSaleCheckout({
      businessId,
      locationId: quote.locationId,
      cashierId: auth.user.id,
      customerId: quote.customerId,
      items: quote.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        discountAmount: item.discountAmount,
        taxAmount: item.taxAmount,
      })),
      subtotal: quote.subtotal,
      discountAmount: quote.discountAmount,
      discountPercent: quote.discountPercent,
      taxAmount: quote.taxAmount,
      totalAmount: quote.totalAmount,
      paidAmount: quote.totalAmount,
      changeAmount: 0,
      paymentMethod: paymentMethod as any,
      notes: `Converted from Quotation #${quote.receiptNumber}`,
      allowNegativeStock: auth.business.allowNegativeStock,
    });

    // Mark original quote as converted / completed
    await prisma.sale.update({
      where: { id: quoteId },
      data: { status: "CONVERTED" },
    });

    revalidatePath("/invoices");
    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");

    return { success: true, sale };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to convert quote to sale" };
  }
}
