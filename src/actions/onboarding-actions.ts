"use server";

import { prisma } from "@/lib/db";
import { getSession, setSessionCookie } from "@/lib/session";
import { onboardingSchema } from "@/lib/validators";
import { generateSKU, generateBarcode } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function completeOnboardingAction(formData: unknown) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Not authenticated" };
  }

  const result = onboardingSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const {
    businessName,
    businessType,
    country,
    currency,
    currencySymbol,
    locationName,
    locationAddress,
    productName,
    productCategory,
    costPrice = 0,
    sellingPrice = 0,
    initialQuantity = 0,
    minStockLevel = 5,
  } = result.data;

  try {
    const slug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);

    const business = await prisma.business.create({
      data: {
        name: businessName,
        slug,
        type: businessType,
        country,
        currency,
        currencySymbol,
        plan: "FREE",
      },
    });

    // Create BusinessMember (Owner)
    await prisma.businessMember.create({
      data: {
        userId: session.userId,
        businessId: business.id,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    // Create Default Location
    const location = await prisma.location.create({
      data: {
        businessId: business.id,
        name: locationName,
        address: locationAddress || null,
        isDefault: true,
      },
    });

    // Create Category & First Product if supplied
    if (productName && productName.trim().length > 0) {
      let categoryId: string | undefined;

      if (productCategory && productCategory.trim().length > 0) {
        const catSlug = productCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const category = await prisma.category.create({
          data: {
            businessId: business.id,
            name: productCategory,
            slug: `${catSlug}-${Math.floor(100 + Math.random() * 900)}`,
            color: "#3b82f6",
          },
        });
        categoryId = category.id;
      }

      const sku = generateSKU(productCategory, productName);
      const barcode = generateBarcode();

      const product = await prisma.product.create({
        data: {
          businessId: business.id,
          name: productName,
          sku,
          barcode,
          categoryId,
          costPrice,
          sellingPrice,
          minStockLevel,
          unit: "pcs",
        },
      });

      if (initialQuantity > 0) {
        await prisma.inventory.create({
          data: {
            businessId: business.id,
            productId: product.id,
            locationId: location.id,
            quantity: initialQuantity,
          },
        });

        await prisma.inventoryMovement.create({
          data: {
            businessId: business.id,
            productId: product.id,
            locationId: location.id,
            quantityChange: initialQuantity,
            previousQuantity: 0,
            newQuantity: initialQuantity,
            type: "OPENING_STOCK",
            referenceType: "ONBOARDING",
            notes: "Initial inventory setup on onboarding",
            userId: session.userId,
          },
        });
      }
    }

    // Update active business in session
    await setSessionCookie({
      ...session,
      activeBusinessId: business.id,
      role: "OWNER",
    });

    revalidatePath("/");
    return { success: true, businessId: business.id };
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return { success: false, error: error.message || "Failed to complete onboarding" };
  }
}
