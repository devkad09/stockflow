import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { getSession } from "./session";
import { hasPermission, RolePermissions, Role } from "./permissions";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface AuthContext {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };
  business: {
    id: string;
    name: string;
    slug: string;
    type: string;
    country: string;
    currency: string;
    currencySymbol: string;
    logoUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    taxRate: number;
    taxNumber?: string | null;
    receiptHeader?: string | null;
    receiptFooter?: string | null;
    allowNegativeStock: boolean;
    plan: string;
  };
  role: Role;
  defaultLocation: {
    id: string;
    name: string;
  };
}

export async function getCurrentUserAndBusiness(): Promise<AuthContext | null> {
  const session = await getSession();
  if (!session || !session.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: {
          business: {
            include: {
              locations: {
                where: { isActive: true },
                orderBy: { isDefault: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    return null;
  }

  // Determine active membership
  let activeMembership = user.memberships[0];
  if (session.activeBusinessId) {
    const found = user.memberships.find((m) => m.businessId === session.activeBusinessId);
    if (found) {
      activeMembership = found;
    }
  }

  const business = activeMembership.business;
  const defaultLoc = business.locations[0] || {
    id: "default-loc",
    name: "Main Store",
  };

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      type: business.type,
      country: business.country,
      currency: business.currency,
      currencySymbol: business.currencySymbol,
      logoUrl: business.logoUrl,
      phone: business.phone,
      email: business.email,
      address: business.address,
      taxRate: business.taxRate,
      taxNumber: business.taxNumber,
      receiptHeader: business.receiptHeader,
      receiptFooter: business.receiptFooter,
      allowNegativeStock: business.allowNegativeStock,
      plan: business.plan,
    },
    role: activeMembership.role as Role,
    defaultLocation: {
      id: defaultLoc.id,
      name: defaultLoc.name,
    },
  };
}

export async function requireAuth(requiredPermission?: keyof RolePermissions): Promise<AuthContext> {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    throw new Error("UNAUTHENTICATED");
  }

  if (requiredPermission && !hasPermission(auth.role, requiredPermission)) {
    throw new Error("UNAUTHORIZED");
  }

  return auth;
}

export async function logAudit({
  businessId,
  userId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
}: {
  businessId: string;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
}) {
  try {
    const detailsStr = typeof details === "object" ? JSON.stringify(details) : details;
    await prisma.auditLog.create({
      data: {
        businessId,
        userId: userId || null,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        details: detailsStr || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
