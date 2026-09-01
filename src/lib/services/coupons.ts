import { prisma } from "../db";

export interface CreateCouponInput {
  businessId: string;
  code: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  expiresAt?: Date | string | null;
}

export async function createCoupon(input: CreateCouponInput) {
  const code = input.code.trim().toUpperCase();
  const existing = await prisma.discountCoupon.findUnique({
    where: {
      businessId_code: {
        businessId: input.businessId,
        code,
      },
    },
  });

  if (existing) {
    throw new Error(`Coupon code '${code}' already exists`);
  }

  return prisma.discountCoupon.create({
    data: {
      businessId: input.businessId,
      code,
      description: input.description || null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderAmount: input.minOrderAmount || 0,
      maxDiscountAmount: input.maxDiscountAmount || null,
      usageLimit: input.usageLimit || null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: true,
    },
  });
}

export async function listCoupons(businessId: string) {
  return prisma.discountCoupon.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });
}

export async function toggleCouponStatus(businessId: string, couponId: string) {
  const coupon = await prisma.discountCoupon.findFirst({
    where: { id: couponId, businessId },
  });

  if (!coupon) throw new Error("Coupon not found");

  return prisma.discountCoupon.update({
    where: { id: couponId },
    data: { isActive: !coupon.isActive },
  });
}

export async function deleteCoupon(businessId: string, couponId: string) {
  const coupon = await prisma.discountCoupon.findFirst({
    where: { id: couponId, businessId },
  });

  if (!coupon) throw new Error("Coupon not found");

  return prisma.discountCoupon.delete({
    where: { id: couponId },
  });
}

export async function validateAndCalculateCouponDiscount(
  businessId: string,
  code: string,
  subtotal: number
) {
  const cleanCode = code.trim().toUpperCase();
  const coupon = await prisma.discountCoupon.findUnique({
    where: {
      businessId_code: {
        businessId,
        code: cleanCode,
      },
    },
  });

  if (!coupon) {
    return { valid: false, error: `Invalid coupon code "${cleanCode}"`, discountAmount: 0 };
  }

  if (!coupon.isActive) {
    return { valid: false, error: `Coupon "${cleanCode}" is deactivated`, discountAmount: 0 };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, error: `Coupon "${cleanCode}" has expired`, discountAmount: 0 };
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, error: `Coupon "${cleanCode}" has reached its maximum usage limit`, discountAmount: 0 };
  }

  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      error: `Minimum order subtotal of $${coupon.minOrderAmount.toFixed(2)} required for coupon "${cleanCode}"`,
      discountAmount: 0,
    };
  }

  let calculatedDiscount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    calculatedDiscount = (subtotal * coupon.discountValue) / 100;
  } else {
    calculatedDiscount = coupon.discountValue;
  }

  if (coupon.maxDiscountAmount && calculatedDiscount > coupon.maxDiscountAmount) {
    calculatedDiscount = coupon.maxDiscountAmount;
  }

  calculatedDiscount = Math.min(calculatedDiscount, subtotal);

  return {
    valid: true,
    coupon,
    discountAmount: Math.round(calculatedDiscount * 100) / 100,
  };
}
