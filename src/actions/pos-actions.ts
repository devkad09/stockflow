"use server";

import { requireAuth } from "@/lib/auth";
import { processSaleCheckout } from "@/lib/services/sales";
import { saleCheckoutSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function checkoutSaleAction(formData: unknown) {
  const auth = await requireAuth("canAccessPOS");
  const businessId = auth.business.id;

  const result = saleCheckoutSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const data = result.data;

  try {
    const sale = await processSaleCheckout({
      businessId,
      locationId: data.locationId || auth.defaultLocation.id,
      cashierId: auth.user.id,
      customerId: data.customerId || null,
      shiftId: data.shiftId || null,
      couponCode: data.couponCode || null,
      loyaltyPointsRedeemed: data.loyaltyPointsRedeemed || 0,
      loyaltyDiscount: data.loyaltyDiscount || 0,
      items: data.items,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      discountPercent: data.discountPercent,
      taxAmount: data.taxAmount,
      totalAmount: data.totalAmount,
      paidAmount: data.paidAmount,
      changeAmount: data.changeAmount,
      paymentMethod: data.paymentMethod,
      notes: data.notes || null,
      allowNegativeStock: auth.business.allowNegativeStock,
    });

    revalidatePath("/pos");
    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/customers");

    return { success: true, sale };
  } catch (error: any) {
    console.error("POS checkout error:", error);
    return { success: false, error: error.message || "Failed to process sale checkout" };
  }
}
