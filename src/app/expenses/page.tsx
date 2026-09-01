import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExpensesView, ExpenseItem } from "@/components/expenses/ExpensesView";
import { redirect } from "next/navigation";

export default async function ExpensesPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  const dbExpenses = await prisma.expense.findMany({
    where: { businessId },
    include: {
      creator: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const expenses: ExpenseItem[] = dbExpenses.map((e) => ({
    id: e.id,
    category: e.category,
    amount: e.amount,
    date: e.date.toISOString(),
    description: e.description,
    paymentMethod: e.paymentMethod,
    reference: e.reference,
    creatorName: e.creator?.name || "Staff",
  }));

  return (
    <AppLayout>
      <ExpensesView
        initialExpenses={expenses}
        currencySymbol={auth.business.currencySymbol}
      />
    </AppLayout>
  );
}
