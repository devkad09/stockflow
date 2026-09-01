"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { loginAction } from "@/actions/auth-actions";
import { Building2, Lock, Mail, Sparkles, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await loginAction(formData);
      if (!res.success) {
        toastError(res.error || "Login failed", "Authentication Error");
        setIsLoading(false);
        return;
      }

      toastSuccess("Welcome back to StockFlow!", "Signed In");
      if (res.hasBusiness) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
      router.refresh();
    } catch (err: any) {
      toastError(err.message || "An unexpected error occurred", "Error");
      setIsLoading(false);
    }
  };

  const quickFill = (email: string) => {
    setFormData({
      email,
      password: "password123",
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/25 text-white font-black text-2xl mb-2">
            SF
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Stock<span className="text-blue-500">Flow</span> SaaS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Inventory, POS & Business Operations Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              placeholder="name@business.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
              Sign In to Workspace
            </Button>
          </form>

          {/* Quick Demo Logins for Pair Review */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Demo Accounts (Click to Fill)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickFill("owner@stockflow.dev")}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition-colors"
              >
                <span className="font-bold text-blue-400 block">👑 Owner</span>
                <span className="text-[11px] text-slate-400">owner@stockflow.dev</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill("cashier@stockflow.dev")}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition-colors"
              >
                <span className="font-bold text-emerald-400 block">💳 Cashier</span>
                <span className="text-[11px] text-slate-400">cashier@stockflow.dev</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill("manager@stockflow.dev")}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition-colors"
              >
                <span className="font-bold text-purple-400 block">📊 Manager</span>
                <span className="text-[11px] text-slate-400">manager@stockflow.dev</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill("inventory@stockflow.dev")}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition-colors"
              >
                <span className="font-bold text-cyan-400 block">📦 Inventory</span>
                <span className="text-[11px] text-slate-400">inventory@stockflow.dev</span>
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              New business owner?{" "}
              <Link href="/register" className="font-semibold text-blue-400 hover:text-blue-300">
                Create new business account &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
