import { z } from "zod";

// Auth
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Onboarding
export const onboardingSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  businessType: z.string().min(1, "Business type is required"),
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
  currencySymbol: z.string().min(1, "Currency symbol is required"),
  locationName: z.string().min(1, "Location name is required"),
  locationAddress: z.string().optional(),
  // Initial product
  productName: z.string().optional(),
  productCategory: z.string().optional(),
  costPrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  initialQuantity: z.coerce.number().int().min(0).optional(),
  minStockLevel: z.coerce.number().int().min(0).optional(),
});

// Products
export const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  sku: z.string().min(2, "SKU is required"),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  costPrice: z.coerce.number().min(0, "Cost price cannot be negative"),
  sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative"),
  minStockLevel: z.coerce.number().int().min(0, "Minimum stock cannot be negative"),
  maxStockLevel: z.coerce.number().int().optional().nullable(),
  unit: z.string().default("pcs"),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  initialQuantity: z.coerce.number().int().min(0).optional(),
});

// Categories
export const categorySchema = z.object({
  name: z.string().min(2, "Category name is required"),
  description: z.string().optional().nullable(),
  color: z.string().default("#3b82f6"),
});

// Inventory adjustment
export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  locationId: z.string().min(1, "Location is required"),
  quantityChange: z.coerce.number().int().refine((val) => val !== 0, "Quantity change cannot be 0"),
  type: z.enum(["ADJUSTMENT", "DAMAGED", "RETURN", "OPENING_STOCK", "TRANSFER"]),
  notes: z.string().min(2, "Reason / notes are required for manual adjustments"),
});

// Customers
export const customerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Suppliers
export const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required"),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Purchase Orders
export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantityOrdered: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unitCost: z.coerce.number().min(0, "Unit cost must be at least 0"),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  locationId: z.string().min(1, "Location is required"),
  expectedDeliveryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one product item is required"),
});

// POS Checkout
export const saleItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0),
  unitCost: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0).default(0),
  taxAmount: z.coerce.number().min(0).default(0),
});

export const saleCheckoutSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  customerId: z.string().optional().nullable(),
  shiftId: z.string().optional().nullable(),
  couponCode: z.string().optional().nullable(),
  loyaltyPointsRedeemed: z.coerce.number().min(0).default(0),
  loyaltyDiscount: z.coerce.number().min(0).default(0),
  items: z.array(saleItemSchema).min(1, "Cart cannot be empty"),
  subtotal: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0).default(0),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxAmount: z.coerce.number().min(0).default(0),
  totalAmount: z.coerce.number().min(0),
  paidAmount: z.coerce.number().min(0),
  changeAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY", "OTHER"]),
  notes: z.string().optional().nullable(),
});

// Refund
export const refundItemSchema = z.object({
  saleItemId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  refundAmount: z.coerce.number().min(0),
  restocked: z.boolean().default(true),
});

export const processRefundSchema = z.object({
  saleId: z.string().min(1, "Sale is required"),
  reason: z.string().min(2, "Refund reason is required"),
  items: z.array(refundItemSchema).min(1, "At least one item must be refunded"),
});

// Expenses
export const expenseSchema = z.object({
  category: z.enum([
    "RENT",
    "UTILITIES",
    "SALARIES",
    "TRANSPORT",
    "PACKAGING",
    "MARKETING",
    "MAINTENANCE",
    "OTHER",
  ]),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(2, "Description is required"),
  paymentMethod: z.string().default("CASH"),
  reference: z.string().optional().nullable(),
});

// Team Member
export const inviteMemberSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER", "INVENTORY_STAFF"]),
  password: z.string().min(6, "Temporary password must be at least 6 characters"),
});

// Business Settings
export const businessSettingsSchema = z.object({
  name: z.string().min(2, "Business name is required"),
  type: z.string().min(1, "Business type is required"),
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
  currencySymbol: z.string().min(1, "Currency symbol is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  taxNumber: z.string().optional().nullable(),
  receiptHeader: z.string().optional().nullable(),
  receiptFooter: z.string().optional().nullable(),
  allowNegativeStock: z.boolean().default(false),
});
