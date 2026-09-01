"use server";

import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, logAudit } from "@/lib/auth";
import { setSessionCookie, clearSessionCookie, getSession } from "@/lib/session";
import { loginSchema, registerSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: unknown) {
  const result = loginSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      memberships: {
        include: { business: true },
      },
    },
  });

  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }

  const isMatch = await verifyPassword(password, user.passwordHash);
  if (!isMatch) {
    return { success: false, error: "Invalid email or password" };
  }

  const activeMembership = user.memberships[0];

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    activeBusinessId: activeMembership?.businessId,
    role: activeMembership?.role || "CASHIER",
  });

  if (activeMembership) {
    await logAudit({
      businessId: activeMembership.businessId,
      userId: user.id,
      action: "USER_LOGIN",
      entityType: "User",
      entityId: user.id,
      details: "User logged into session",
    });
  }

  return {
    success: true,
    hasBusiness: user.memberships.length > 0,
  };
}

export async function registerAction(formData: unknown) {
  const result = registerSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const { name, email, password } = result.data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existing) {
    return { success: false, error: "An account with this email already exists" };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
    },
  });

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return { success: true };
}

export async function logoutAction() {
  await clearSessionCookie();
  return { success: true };
}

export async function switchBusinessAction(businessId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const membership = await prisma.businessMember.findUnique({
    where: {
      userId_businessId: {
        userId: session.userId,
        businessId,
      },
    },
  });

  if (!membership || membership.status !== "ACTIVE") {
    return { success: false, error: "Unauthorized access to business" };
  }

  await setSessionCookie({
    ...session,
    activeBusinessId: businessId,
    role: membership.role,
  });

  revalidatePath("/");
  return { success: true };
}
