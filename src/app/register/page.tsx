"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { registerAction } from "@/actions/auth-actions";
import { Lock, Mail, User } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await registerAction(formData);
      if (!res.success) {
        toastError(res.error || "Registration failed", "Error");
        setIsLoading(false);
        return;
      }

      toastSuccess("Account created successfully! Let's set up your business.", "Welcome");
      router.push("/onboarding");
      router.refresh();
    } catch (err: any) {
      toastError(err.message || "An unexpected error occurred", "Error");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/25 text-white font-black text-2xl mb-2">
            SF
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Start with StockFlow
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Create your account to manage inventory, POS & sales
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Alex Johnson"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              label="Work Email"
              type="email"
              placeholder="alex@business.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 6 characters"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
              Create Account &rarr;
            </Button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300">
                Sign in &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
