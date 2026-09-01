import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SuppliersView, SupplierItem } from "@/components/suppliers/SuppliersView";
import { redirect } from "next/navigation";

export default async function SuppliersPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  const dbSuppliers = await prisma.supplier.findMany({
    where: { businessId },
    include: {
      _count: {
        select: { purchaseOrders: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const suppliers: SupplierItem[] = dbSuppliers.map((s) => ({
    id: s.id,
    name: s.name,
    contactPerson: s.contactPerson,
    phone: s.phone,
    email: s.email,
    address: s.address,
    notes: s.notes,
    isActive: s.isActive,
    poCount: s._count.purchaseOrders,
  }));

  return (
    <AppLayout>
      <SuppliersView initialSuppliers={suppliers} />
    </AppLayout>
  );
}
