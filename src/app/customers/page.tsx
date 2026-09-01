import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CustomersView, CustomerItem } from "@/components/customers/CustomersView";
import { redirect } from "next/navigation";

export default async function CustomersPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  const dbCustomers = await prisma.customer.findMany({
    where: { businessId },
    include: {
      sales: {
        select: {
          id: true,
          receiptNumber: true,
          totalAmount: true,
          paymentMethod: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { totalSpent: "desc" },
  });

  const customers: CustomerItem[] = dbCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    notes: c.notes,
    totalSpent: c.totalSpent,
    totalPurchases: c.totalPurchases,
    outstandingBalance: c.outstandingBalance,
    loyaltyPoints: c.loyaltyPoints || 0,
    loyaltyTier: c.loyaltyTier || "BRONZE",
    createdAt: c.createdAt.toISOString(),
    sales: c.sales.map((s) => ({
      id: s.id,
      receiptNumber: s.receiptNumber,
      totalAmount: s.totalAmount,
      paymentMethod: s.paymentMethod,
      createdAt: s.createdAt.toISOString(),
    })),
  }));

  return (
    <AppLayout>
      <CustomersView
        initialCustomers={customers}
        currencySymbol={auth.business.currencySymbol}
      />
    </AppLayout>
  );
}
