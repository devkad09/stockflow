"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  MapPin,
  LogOut,
  User,
  ShieldCheck,
  PackageCheck,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { logoutAction } from "@/actions/auth-actions";

interface NavbarProps {
  business: {
    name: string;
    currency: string;
    currencySymbol: string;
    plan: string;
  };
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  role: string;
  location: {
    name: string;
  };
  lowStockCount?: number;
}

export function Navbar({ business, user, role, location, lowStockCount = 0 }: NavbarProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/75 px-4 sm:px-6 backdrop-blur-2xl">
      {/* Left: Business Info & Location */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/20 border border-indigo-500/30 text-indigo-400 shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white tracking-tight">{business.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30">
                {business.plan}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping mr-0.5" />
              <MapPin className="h-3.5 w-3.5 text-slate-500" />
              <span>{location.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Quick Actions, Alerts, User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick POS link */}
        <Link
          href="/pos"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/40 text-emerald-300 hover:from-emerald-600/30 hover:to-teal-600/30 text-xs font-bold tracking-wide transition-all shadow-sm hover:shadow-emerald-500/20 hover:-translate-y-0.5"
        >
          <PackageCheck className="h-4 w-4 text-emerald-400" />
          <span>Launch POS (F4)</span>
        </Link>

        {/* Low Stock Alerts Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors"
            title="Stock Notifications"
          >
            <Bell className="h-5 w-5" />
            {lowStockCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-slate-950 animate-pulse shadow-md shadow-rose-500/50">
                {lowStockCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Stock Alerts
                </span>
                <Badge variant={lowStockCount > 0 ? "destructive" : "success"} size="sm">
                  {lowStockCount} alerts
                </Badge>
              </div>

              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {lowStockCount > 0 ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-200">
                        {lowStockCount} products are low or out of stock!
                      </p>
                      <Link
                        href="/inventory"
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-rose-400 hover:underline mt-1 inline-block font-semibold"
                      >
                        View inventory & restock &rarr;
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">
                    All inventory levels are healthy.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme & Colour Switcher */}
        <ThemeSelector />

        {/* Role Badge */}
        <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
          {role.replace("_", " ")}
        </span>

        {/* User Avatar & Logout */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800/80">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white/20 text-white font-bold text-xs shadow-md">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="hidden lg:block text-left text-xs">
            <p className="font-bold text-white leading-tight">{user.name}</p>
            <p className="text-slate-400 text-[10px] truncate max-w-[120px]">{user.email}</p>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-2 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors ml-1"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
