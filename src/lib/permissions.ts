export type Role = "OWNER" | "ADMIN" | "MANAGER" | "CASHIER" | "INVENTORY_STAFF";

export interface RolePermissions {
  canViewDashboard: boolean;
  canAccessPOS: boolean;
  canViewSales: boolean;
  canProcessRefunds: boolean;
  canManageProducts: boolean;
  canManageInventory: boolean;
  canManagePurchases: boolean;
  canManageCustomers: boolean;
  canManageSuppliers: boolean;
  canManageExpenses: boolean;
  canViewReports: boolean;
  canManageTeam: boolean;
  canManageSettings: boolean;
  canManageBilling: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  OWNER: {
    canViewDashboard: true,
    canAccessPOS: true,
    canViewSales: true,
    canProcessRefunds: true,
    canManageProducts: true,
    canManageInventory: true,
    canManagePurchases: true,
    canManageCustomers: true,
    canManageSuppliers: true,
    canManageExpenses: true,
    canViewReports: true,
    canManageTeam: true,
    canManageSettings: true,
    canManageBilling: true,
  },
  ADMIN: {
    canViewDashboard: true,
    canAccessPOS: true,
    canViewSales: true,
    canProcessRefunds: true,
    canManageProducts: true,
    canManageInventory: true,
    canManagePurchases: true,
    canManageCustomers: true,
    canManageSuppliers: true,
    canManageExpenses: true,
    canViewReports: true,
    canManageTeam: true,
    canManageSettings: true,
    canManageBilling: false,
  },
  MANAGER: {
    canViewDashboard: true,
    canAccessPOS: true,
    canViewSales: true,
    canProcessRefunds: true,
    canManageProducts: true,
    canManageInventory: true,
    canManagePurchases: true,
    canManageCustomers: true,
    canManageSuppliers: true,
    canManageExpenses: true,
    canViewReports: true,
    canManageTeam: false,
    canManageSettings: false,
    canManageBilling: false,
  },
  CASHIER: {
    canViewDashboard: false,
    canAccessPOS: true,
    canViewSales: true,
    canProcessRefunds: false,
    canManageProducts: false,
    canManageInventory: false,
    canManagePurchases: false,
    canManageCustomers: true,
    canManageSuppliers: false,
    canManageExpenses: false,
    canViewReports: false,
    canManageTeam: false,
    canManageSettings: false,
    canManageBilling: false,
  },
  INVENTORY_STAFF: {
    canViewDashboard: false,
    canAccessPOS: false,
    canViewSales: false,
    canProcessRefunds: false,
    canManageProducts: true,
    canManageInventory: true,
    canManagePurchases: true,
    canManageCustomers: false,
    canManageSuppliers: true,
    canManageExpenses: false,
    canViewReports: false,
    canManageTeam: false,
    canManageSettings: false,
    canManageBilling: false,
  },
};

export function hasPermission(role: string | undefined, permission: keyof RolePermissions): boolean {
  if (!role) return false;
  const typedRole = role as Role;
  const permissions = ROLE_PERMISSIONS[typedRole];
  if (!permissions) return false;
  return !!permissions[permission];
}
