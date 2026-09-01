"use server";

import { prisma } from "@/lib/db";
import { requireAuth, logAudit } from "@/lib/auth";
import { productSchema } from "@/lib/validators";
import { checkCanAddProduct } from "@/lib/services/subscriptions";
import { generateSKU, generateBarcode } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function createProductAction(formData: unknown) {
  const auth = await requireAuth("canManageProducts");
  const businessId = auth.business.id;

  // Check subscription product limits
  const canAdd = await checkCanAddProduct(businessId);
  if (!canAdd) {
    return {
      success: false,
      error: `You have reached the product limit for your ${auth.business.plan} plan. Please upgrade to Pro for unlimited products.`,
    };
  }

  const result = productSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const data = result.data;

  // Check SKU uniqueness within business
  const existing = await prisma.product.findUnique({
    where: {
      businessId_sku: {
        businessId,
        sku: data.sku,
      },
    },
  });

  if (existing) {
    return { success: false, error: `SKU "${data.sku}" already exists in your catalog` };
  }

  const product = await prisma.product.create({
    data: {
      businessId,
      name: data.name,
      sku: data.sku,
      barcode: data.barcode || generateBarcode(),
      description: data.description || null,
      categoryId: data.categoryId || null,
      supplierId: data.supplierId || null,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      minStockLevel: data.minStockLevel,
      maxStockLevel: data.maxStockLevel || null,
      unit: data.unit,
      taxRate: data.taxRate,
      imageUrl: data.imageUrl || null,
      isActive: data.isActive,
    },
  });

  // If initialQuantity provided, initialize inventory and movement
  if (data.initialQuantity && data.initialQuantity > 0) {
    await prisma.inventory.create({
      data: {
        businessId,
        productId: product.id,
        locationId: auth.defaultLocation.id,
        quantity: data.initialQuantity,
      },
    });

    await prisma.inventoryMovement.create({
      data: {
        businessId,
        productId: product.id,
        locationId: auth.defaultLocation.id,
        quantityChange: data.initialQuantity,
        previousQuantity: 0,
        newQuantity: data.initialQuantity,
        type: "OPENING_STOCK",
        referenceType: "PRODUCT_CREATION",
        notes: "Initial inventory assigned during product creation",
        userId: auth.user.id,
      },
    });
  }

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "PRODUCT_CREATE",
    entityType: "Product",
    entityId: product.id,
    details: { name: product.name, sku: product.sku },
  });

  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true, product };
}

export async function updateProductAction(id: string, formData: unknown) {
  const auth = await requireAuth("canManageProducts");
  const businessId = auth.business.id;

  const result = productSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const data = result.data;

  // Check product exists and belongs to business
  const existing = await prisma.product.findUnique({
    where: { id },
  });

  if (!existing || existing.businessId !== businessId) {
    return { success: false, error: "Product not found or unauthorized" };
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      sku: data.sku,
      barcode: data.barcode || null,
      description: data.description || null,
      categoryId: data.categoryId || null,
      supplierId: data.supplierId || null,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      minStockLevel: data.minStockLevel,
      maxStockLevel: data.maxStockLevel || null,
      unit: data.unit,
      taxRate: data.taxRate,
      imageUrl: data.imageUrl || null,
      isActive: data.isActive,
    },
  });

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "PRODUCT_UPDATE",
    entityType: "Product",
    entityId: id,
    details: { name: updated.name, sku: updated.sku },
  });

  revalidatePath("/products");
  revalidatePath("/inventory");
  return { success: true, product: updated };
}

export async function archiveProductAction(id: string) {
  const auth = await requireAuth("canManageProducts");
  const businessId = auth.business.id;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.businessId !== businessId) {
    return { success: false, error: "Product not found" };
  }

  await prisma.product.update({
    where: { id },
    data: { isArchived: !existing.isArchived },
  });

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "PRODUCT_ARCHIVE",
    entityType: "Product",
    entityId: id,
    details: { isArchived: !existing.isArchived },
  });

  revalidatePath("/products");
  return { success: true };
}

export async function deleteProductAction(id: string) {
  const auth = await requireAuth("canManageProducts");
  const businessId = auth.business.id;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      saleItems: { take: 1 },
      poItems: { take: 1 },
      refundItems: { take: 1 },
    },
  });

  if (!product || product.businessId !== businessId) {
    return { success: false, error: "Product not found" };
  }

  // Safe deletion rule: if historical transactions exist, product MUST be archived instead of deleted
  const hasHistory = product.saleItems.length > 0 || product.poItems.length > 0 || product.refundItems.length > 0;
  if (hasHistory) {
    await prisma.product.update({
      where: { id },
      data: { isArchived: true, isActive: false },
    });
    return {
      success: true,
      archivedInstead: true,
      message: "Product has sales or purchase history. It has been safely archived instead of permanently deleted to preserve financial ledgers.",
    };
  }

  // If no history, delete inventory & product safely
  await prisma.inventoryMovement.deleteMany({ where: { productId: id } });
  await prisma.inventory.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });

  revalidatePath("/products");
  revalidatePath("/inventory");
  return { success: true, message: "Product permanently deleted" };
}

export async function importProductsCsvAction(rows: Array<{
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  costPrice?: number;
  sellingPrice?: number;
  quantity?: number;
  minStock?: number;
}>) {
  try {
    const auth = await requireAuth("canManageProducts");
    const businessId = auth.business.id;

    let importedCount = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = idx + 1;

      if (!row.name || row.name.trim().length === 0) {
        errors.push(`Row ${rowNum}: Missing product name`);
        continue;
      }

      try {
        const sku = row.sku && row.sku.trim().length > 0 ? row.sku.trim() : generateSKU(row.category, row.name);
        const barcode = row.barcode && row.barcode.trim().length > 0 ? row.barcode.trim() : generateBarcode();
        const costPrice = Number(row.costPrice) || 0;
        const sellingPrice = Number(row.sellingPrice) || 0;
        const quantity = Number(row.quantity) || 0;
        const minStock = Number(row.minStock) || 5;

        // Find or create category if specified
        let categoryId: string | undefined;
        if (row.category && row.category.trim().length > 0) {
          const catName = row.category.trim();
          const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          let category = await prisma.category.findFirst({
            where: { businessId, name: { equals: catName } },
          });
          if (!category) {
            category = await prisma.category.create({
              data: {
                businessId,
                name: catName,
                slug: `${catSlug}-${Math.floor(100 + Math.random() * 900)}`,
                color: "#3b82f6",
              },
            });
          }
          categoryId = category.id;
        }

        // Check if product already exists by SKU
        const existing = await prisma.product.findUnique({
          where: { businessId_sku: { businessId, sku } },
        });

        if (existing) {
          errors.push(`Row ${rowNum}: SKU "${sku}" already exists`);
          continue;
        }

        const product = await prisma.product.create({
          data: {
            businessId,
            name: row.name.trim(),
            sku,
            barcode,
            categoryId,
            costPrice,
            sellingPrice,
            minStockLevel: minStock,
            unit: "pcs",
          },
        });

        if (quantity > 0) {
          await prisma.inventory.create({
            data: {
              businessId,
              productId: product.id,
              locationId: auth.defaultLocation.id,
              quantity,
            },
          });

          await prisma.inventoryMovement.create({
            data: {
              businessId,
              productId: product.id,
              locationId: auth.defaultLocation.id,
              quantityChange: quantity,
              previousQuantity: 0,
              newQuantity: quantity,
              type: "OPENING_STOCK",
              referenceType: "CSV_IMPORT",
              notes: "Imported via CSV batch upload",
              userId: auth.user.id,
            },
          });
        }

        importedCount++;
      } catch (err: any) {
        errors.push(`Row ${rowNum}: ${err.message || "Failed to import row"}`);
      }
    }

    await logAudit({
      businessId,
      userId: auth.user.id,
      action: "PRODUCT_IMPORT_CSV",
      entityType: "Product",
      details: { importedCount, totalRows: rows.length, errorsCount: errors.length },
    });

    revalidatePath("/products");
    revalidatePath("/inventory");
    return { success: true, importedCount, errors, error: undefined as string | undefined };
  } catch (error: any) {
    return { success: false, importedCount: 0, errors: [error.message], error: error.message || "Failed to import CSV" };
  }
}
