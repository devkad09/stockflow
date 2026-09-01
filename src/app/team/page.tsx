import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TeamView, TeamMemberItem } from "@/components/team/TeamView";
import { redirect } from "next/navigation";

export default async function TeamPage() {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const businessId = auth.business.id;

  const dbMembers = await prisma.businessMember.findMany({
    where: { businessId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const members: TeamMemberItem[] = dbMembers.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <AppLayout>
      <TeamView
        initialMembers={members}
        currentUserRole={auth.role}
        currentUserId={auth.user.id}
      />
    </AppLayout>
  );
}
