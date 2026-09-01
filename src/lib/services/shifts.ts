import { prisma } from "../db";

export interface OpenShiftInput {
  businessId: string;
  locationId: string;
  cashierId: string;
  openingFloat: number;
  notes?: string;
}

export interface CloseShiftInput {
  businessId: string;
  shiftId: string;
  actualCash: number;
  notes?: string;
}

export interface CashMovementInput {
  businessId: string;
  shiftId: string;
  type: "CASH_IN" | "CASH_OUT";
  amount: number;
  reason: string;
}

export async function getActiveShift(businessId: string, cashierId?: string, locationId?: string) {
  const where: any = {
    businessId,
    status: "OPEN",
  };
  if (cashierId) where.cashierId = cashierId;
  if (locationId) where.locationId = locationId;

  return prisma.registerShift.findFirst({
    where,
    include: {
      cashier: { select: { id: true, name: true, email: true } },
      location: { select: { id: true, name: true } },
      cashMovements: { orderBy: { createdAt: "desc" } },
      sales: {
        select: {
          id: true,
          receiptNumber: true,
          totalAmount: true,
          paidAmount: true,
          paymentMethod: true,
          createdAt: true,
        },
      },
    },
    orderBy: { openedAt: "desc" },
  });
}

export async function openShift(input: OpenShiftInput) {
  // Check if there is already an open shift for this cashier
  const active = await prisma.registerShift.findFirst({
    where: {
      businessId: input.businessId,
      cashierId: input.cashierId,
      status: "OPEN",
    },
  });

  if (active) {
    throw new Error("You already have an active open register shift. Please close it before opening a new one.");
  }

  const shiftCount = await prisma.registerShift.count({
    where: { businessId: input.businessId },
  });
  const shiftNumber = `SH-${String(shiftCount + 1).padStart(4, "0")}`;

  return prisma.registerShift.create({
    data: {
      businessId: input.businessId,
      locationId: input.locationId,
      cashierId: input.cashierId,
      shiftNumber,
      openingFloat: input.openingFloat || 0,
      expectedCash: input.openingFloat || 0,
      status: "OPEN",
      notes: input.notes || null,
    },
    include: {
      cashier: true,
      location: true,
    },
  });
}

export async function recordCashMovement(input: CashMovementInput) {
  return prisma.$transaction(async (tx) => {
    const shift = await tx.registerShift.findFirst({
      where: { id: input.shiftId, businessId: input.businessId, status: "OPEN" },
    });

    if (!shift) throw new Error("Active shift not found");

    const movement = await tx.cashMovement.create({
      data: {
        businessId: input.businessId,
        shiftId: input.shiftId,
        type: input.type,
        amount: input.amount,
        reason: input.reason,
      },
    });

    // Update shift expected cash
    const cashInDelta = input.type === "CASH_IN" ? input.amount : 0;
    const cashOutDelta = input.type === "CASH_OUT" ? input.amount : 0;
    const expectedCashDelta = input.type === "CASH_IN" ? input.amount : -input.amount;

    await tx.registerShift.update({
      where: { id: input.shiftId },
      data: {
        cashIn: { increment: cashInDelta },
        cashOut: { increment: cashOutDelta },
        expectedCash: { increment: expectedCashDelta },
      },
    });

    return movement;
  });
}

export async function closeShift(input: CloseShiftInput) {
  return prisma.$transaction(async (tx) => {
    const shift = await tx.registerShift.findFirst({
      where: { id: input.shiftId, businessId: input.businessId },
      include: {
        sales: true,
        cashMovements: true,
      },
    });

    if (!shift) throw new Error("Shift not found");
    if (shift.status === "CLOSED") throw new Error("Shift is already closed");

    // Recalculate totals from sales for safety
    let cashSales = 0;
    let cardSales = 0;
    let otherSales = 0;

    for (const sale of shift.sales) {
      if (sale.paymentMethod === "CASH") cashSales += sale.paidAmount;
      else if (sale.paymentMethod === "CARD") cardSales += sale.paidAmount;
      else otherSales += sale.paidAmount;
    }

    const cashInTotal = shift.cashMovements
      .filter((m) => m.type === "CASH_IN")
      .reduce((sum, m) => sum + m.amount, 0);
    const cashOutTotal = shift.cashMovements
      .filter((m) => m.type === "CASH_OUT")
      .reduce((sum, m) => sum + m.amount, 0);

    const expectedCash = shift.openingFloat + cashSales + cashInTotal - cashOutTotal;
    const difference = input.actualCash - expectedCash;

    return tx.registerShift.update({
      where: { id: input.shiftId },
      data: {
        closedAt: new Date(),
        status: "CLOSED",
        cashSales,
        cardSales,
        otherSales,
        cashIn: cashInTotal,
        cashOut: cashOutTotal,
        expectedCash,
        actualCash: input.actualCash,
        difference,
        notes: input.notes ? `${shift.notes ? shift.notes + " | " : ""}${input.notes}` : shift.notes,
      },
      include: {
        cashier: { select: { id: true, name: true, email: true } },
        location: { select: { id: true, name: true } },
        cashMovements: true,
        sales: true,
      },
    });
  });
}

export async function listShifts(businessId: string, locationId?: string) {
  const where: any = { businessId };
  if (locationId) where.locationId = locationId;

  return prisma.registerShift.findMany({
    where,
    include: {
      cashier: { select: { id: true, name: true, email: true } },
      location: { select: { id: true, name: true } },
      cashMovements: true,
      sales: { select: { id: true, totalAmount: true, paymentMethod: true } },
    },
    orderBy: { openedAt: "desc" },
    take: 50,
  });
}
