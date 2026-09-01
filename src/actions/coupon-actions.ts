"use server";

import { getCurrentUserAndBusiness } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  createCoupon,
  listCoupons,
  toggleCouponStatus,
  deleteCoupon,
  validateAndCalculateCouponDiscount,
  CreateCouponInput,
} from "@/lib/services/coupons";
import { revalidatePath } from "next/cache";

export async function createCouponAction(data: {
  code: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  expiresAt?: string | null;
}) {
  try {
    const auth = await getCurrentUserAndBusiness();
    if (!auth) return { success: false, error: "Unauthorized" };
    if (!hasPermission(auth.role, "canManageSettings")) {
      return { success: false, error: "Insufficient permissions to manage promotional coupons" };
    }

    const coupon = await createCoupon({
      businessId: auth.business.id,
      ...data,
    });

    revalidatePath("/coupons");
    return { success: true, coupon };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create coupon" };
  }
}

export async function toggleCouponAction(couponId: string) {
  try {
    const auth = await getCurrentUserAndBusiness();
    if (!auth) return { success: false, error: "Unauthorized" };
    if (!hasPermission(auth.role, "canManageSettings")) {
      return { success: false, error: "Insufficient permissions" };
    }

    const coupon = await toggleCouponStatus(auth.business.id, couponId);
    revalidatePath("/coupons");
    return { success: true, coupon };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to toggle coupon" };
  }
}

export async function deleteCouponAction(couponId: string) {
  try {
    const auth = await getCurrentUserAndBusiness();
    if (!auth) return { success: false, error: "Unauthorized" };
    if (!hasPermission(auth.role, "canManageSettings")) {
      return { success: false, error: "Insufficient permissions" };
    }

    await deleteCoupon(auth.business.id, couponId);
    revalidatePath("/coupons");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete coupon" };
  }
}

export async function validateCouponAction(code: string, subtotal: number) {
  try {
    const auth = await getCurrentUserAndBusiness();
    if (!auth) return { success: false, error: "Unauthorized" };

    const res = await validateAndCalculateCouponDiscount(auth.business.id, code, subtotal);
    if (!res.valid) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      coupon: {
        id: res.coupon?.id,
        code: res.coupon?.code,
        discountType: res.coupon?.discountType,
        discountValue: res.coupon?.discountValue,
      },
      discountAmount: res.discountAmount,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to validate coupon" };
  }
}
