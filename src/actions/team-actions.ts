"use server";

import { prisma } from "@/lib/db";
import { requireAuth, hashPassword, logAudit } from "@/lib/auth";
import { inviteMemberSchema } from "@/lib/validators";
import { checkCanAddEmployee } from "@/lib/services/subscriptions";
import { revalidatePath } from "next/cache";

export async function inviteMemberAction(formData: unknown) {
  const auth = await requireAuth("canManageTeam");
  const businessId = auth.business.id;

  // Check subscription employee limit
  const canAdd = await checkCanAddEmployee(businessId);
  if (!canAdd) {
    return {
      success: false,
      error: `You have reached the staff limit for your ${auth.business.plan} plan. Please upgrade to add more team members.`,
    };
  }

  const result = inviteMemberSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const { name, email, role, password } = result.data;
  const cleanEmail = email.toLowerCase().trim();

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (!user) {
    const passwordHash = await hashPassword(password);
    user = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        passwordHash,
      },
    });
  }

  // Check if already member
  const existingMember = await prisma.businessMember.findUnique({
    where: {
      userId_businessId: {
        userId: user.id,
        businessId,
      },
    },
  });

  if (existingMember) {
    return { success: false, error: "User is already a member of this business" };
  }

  const member = await prisma.businessMember.create({
    data: {
      businessId,
      userId: user.id,
      role,
      invitedBy: auth.user.id,
      status: "ACTIVE",
    },
  });

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "MEMBER_INVITE",
    entityType: "BusinessMember",
    entityId: member.id,
    details: { name, email: cleanEmail, role },
  });

  revalidatePath("/team");
  return { success: true, member };
}

export async function updateMemberRoleAction(memberId: string, newRole: string) {
  const auth = await requireAuth("canManageTeam");
  const businessId = auth.business.id;

  const member = await prisma.businessMember.findUnique({
    where: { id: memberId },
  });

  if (!member || member.businessId !== businessId) {
    return { success: false, error: "Member not found" };
  }

  if (member.role === "OWNER" && auth.role !== "OWNER") {
    return { success: false, error: "Cannot modify Owner role" };
  }

  await prisma.businessMember.update({
    where: { id: memberId },
    data: { role: newRole },
  });

  await logAudit({
    businessId,
    userId: auth.user.id,
    action: "MEMBER_ROLE_UPDATE",
    entityType: "BusinessMember",
    entityId: memberId,
    details: { oldRole: member.role, newRole },
  });

  revalidatePath("/team");
  return { success: true };
}

export async function removeMemberAction(memberId: string) {
  const auth = await requireAuth("canManageTeam");
  const businessId = auth.business.id;

  const member = await prisma.businessMember.findUnique({
    where: { id: memberId },
  });

  if (!member || member.businessId !== businessId) {
    return { success: false, error: "Member not found" };
  }

  if (member.role === "OWNER") {
    return { success: false, error: "Cannot remove the business Owner" };
  }

  await prisma.businessMember.delete({
    where: { id: memberId },
  });

  revalidatePath("/team");
  return { success: true };
}
