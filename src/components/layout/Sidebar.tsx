"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Boxes,
  Layers,
  Truck,
  Users,
  Building,
  DollarSign,
  BarChart3,
  UserCheck,
  History,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MapPin,
  Barcode,
  FileText,
  Sparkles,
  Banknote,
  Tag,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission, RolePermissions } from "@/lib/permissions";

interface SidebarProps {
  role: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: keyof RolePermissions;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "canViewDashboard" },
  { label: "Point of Sale", href: "/pos", icon: ShoppingCart, permission: "canAccessPOS", badge: "POS" },
  { label: "Cash Register Shifts", href: "/shifts", icon: Banknote, permission: "canAccessPOS" },
  { label: "Sales History", href: "/sales", icon: Receipt, permission: "canViewSales" },
  { label: "Wholesale Invoices", href: "/invoices", icon: FileText, permission: "canViewSales" },
  { label: "Coupons & Promos", href: "/coupons", icon: Tag, permission: "canManageSettings", badge: "Promo" },
  { label: "Products", href: "/products", icon: Boxes, permission: "canManageProducts" },
  { label: "Inventory", href: "/inventory", icon: Layers, permission: "canManageInventory" },
  { label: "Stocktake Studio", href: "/stocktake", icon: ClipboardCheck, permission: "canManageInventory", badge: "Audit" },
  { label: "Locations & Transfers", href: "/locations", icon: MapPin, permission: "canManageInventory" },
  { label: "Barcode Print Studio", href: "/barcodes", icon: Barcode, permission: "canManageProducts" },
  { label: "Purchases (PO)", href: "/purchases", icon: Truck, permission: "canManagePurchases" },
  { label: "Customers", href: "/customers", icon: Users, permission: "canManageCustomers" },
  { label: "Suppliers", href: "/suppliers", icon: Building, permission: "canManageSuppliers" },
  { label: "Expenses", href: "/expenses", icon: DollarSign, permission: "canManageExpenses" },
  { label: "Reports & Profit", href: "/reports", icon: BarChart3, permission: "canViewReports" },
  { label: "Employees (RBAC)", href: "/team", icon: UserCheck, permission: "canManageTeam" },
  { label: "Audit Logs", href: "/audit-logs", icon: History, permission: "canManageSettings" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "canManageSettings" },
  { label: "Billing & Plans", href: "/billing", icon: CreditCard, permission: "canManageBilling" },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(role, item.permission);
  });

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-2xl transition-all duration-300 select-none z-20 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80 bg-slate-900/30">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/25 text-white font-black text-sm tracking-wider border border-white/20 transition-transform group-hover:scale-105">
              SF
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-white flex items-center gap-1">
                Stock<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Flow</span>
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Enterprise SaaS
              </span>
            </div>
          </Link>
        )}

        {collapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-sm shadow-md border border-white/20">
            SF
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-lg text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors",
            collapsed && "hidden"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 relative group",
                isActive
                  ? "bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 text-white border border-indigo-500/30 shadow-md shadow-indigo-500/10"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
              )}
              title={collapsed ? item.label : undefined}
            >
              <div
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm"
                    : "text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
              </div>

              {!collapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black tracking-wider border border-emerald-500/25">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {isActive && (
                <span className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-gradient-to-b from-blue-500 to-purple-500" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Toggle Button for collapsed mode */}
      {collapsed && (
        <div className="p-2 border-t border-slate-800 flex justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
