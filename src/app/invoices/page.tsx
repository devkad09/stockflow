import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  InvoicesView,
  InvoiceItem,
  AvailableProduct,
  AvailableCustomer,
} from "@/components/invoices/InvoicesView";
import { redirect } from "next/navigation";

export default async function InvoicesPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  // 1. Fetch quotes & wholesale invoices
  const dbQuotes = await prisma.sale.findMany({
    where: {
      businessId,
      status: { in: ["QUOTE", "CONVERTED"] },
    },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const invoices: InvoiceItem[] = dbQuotes.map((q) => ({
    id: q.id,
    quoteNumber: q.receiptNumber,
    customerName: q.customer?.name || "General Client",
    customerPhone: q.customer?.phone || null,
    customerEmail: q.customer?.email || null,
    customerAddress: q.customer?.address || null,
    totalAmount: q.totalAmount,
    subtotal: q.subtotal,
    taxAmount: q.taxAmount,
    discountAmount: q.discountAmount,
    status: q.status,
    createdAt: q.createdAt.toISOString(),
    notes: q.notes,
    items: q.items.map((i) => ({
      id: i.id,
      productName: i.product.name,
      sku: i.product.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
  }));

  // 2. Available Products
  const dbProducts = await prisma.product.findMany({
    where: { businessId, isArchived: false, isActive: true },
    select: { id: true, name: true, sku: true, sellingPrice: true },
    orderBy: { name: "asc" },
  });

  // 3. Available Customers
  const dbCustomers = await prisma.customer.findMany({
    where: { businessId },
    select: { id: true, name: true, phone: true, email: true, address: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppLayout>
      <InvoicesView
        initialInvoices={invoices}
        products={dbProducts}
        customers={dbCustomers}
        business={{
          name: auth.business.name,
          phone: auth.business.phone || null,
          email: auth.business.email || null,
          address: auth.business.address || null,
          taxNumber: auth.business.taxNumber || null,
          currencySymbol: auth.business.currencySymbol,
        }}
      />
    </AppLayout>
  );
}
