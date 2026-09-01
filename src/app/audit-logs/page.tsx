import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuditLogsView, AuditLogItem } from "@/components/audit/AuditLogsView";
import { redirect } from "next/navigation";

export default async function AuditLogsPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  const dbLogs = await prisma.auditLog.findMany({
    where: { businessId },
    include: {
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const logs: AuditLogItem[] = dbLogs.map((l) => ({
    id: l.id,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    details: l.details,
    userName: l.user?.name || "System",
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <AppLayout>
      <AuditLogsView initialLogs={logs} />
    </AppLayout>
  );
}
