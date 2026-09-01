import * as React from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { getCurrentUserAndBusiness } from "@/lib/auth";
import { getLowStockAlerts } from "@/lib/services/inventory";
import { redirect } from "next/navigation";

interface AppLayoutProps {
  children: React.ReactNode;
}

export async function AppLayout({ children }: AppLayoutProps) {
  const auth = await getCurrentUserAndBusiness();
  if (!auth) {
    redirect("/login");
  }

  const lowStockAlerts = await getLowStockAlerts(auth.business.id);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar role={auth.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          business={auth.business}
          user={auth.user}
          role={auth.role}
          location={auth.defaultLocation}
          lowStockCount={lowStockAlerts.length}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/60 dark:bg-slate-950/60">
          <div className="mx-auto max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
