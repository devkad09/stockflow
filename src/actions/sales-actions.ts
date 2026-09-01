"use server";

import { requireAuth } from "@/lib/auth";
import { processRefund } from "@/lib/services/refunds";
import { processRefundSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function refundSaleAction(formData: unknown) {
  const auth = await requireAuth("canProcessRefunds");
  const businessId = auth.business.id;

  const result = processRefundSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const { saleId, reason, items } = result.data;

  try {
    const refund = await processRefund({
      businessId,
      saleId,
      reason,
      items,
      processedBy: auth.user.id,
    });

    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");

    return { success: true, refund };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to process refund" };
  }
}
