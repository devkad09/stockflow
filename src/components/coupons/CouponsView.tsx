"use client";

import * as React from "react";
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Percent,
  DollarSign,
  Trash2,
  Power,
  Calendar,
  Sparkles,
  Layers,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  createCouponAction,
  toggleCouponAction,
  deleteCouponAction,
} from "@/actions/coupon-actions";

export interface CouponItem {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  expiresAt: string | Date | null;
  createdAt: string | Date;
}

interface CouponsViewProps {
  initialCoupons: CouponItem[];
  currencySymbol: string;
}

export function CouponsView({ initialCoupons, currencySymbol }: CouponsViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [coupons, setCoupons] = React.useState<CouponItem[]>(initialCoupons);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscountAmount: "",
    usageLimit: "",
    expiresAt: "",
  });

  const filteredCoupons = React.useMemo(() => {
    return coupons.filter((c) => {
      const matchSearch =
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchStatus = true;
      if (statusFilter === "ACTIVE") matchStatus = c.isActive;
      else if (statusFilter === "INACTIVE") matchStatus = !c.isActive;

      return matchSearch && matchStatus;
    });
  }, [coupons, searchQuery, statusFilter]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      toastError("Coupon code is required");
      return;
    }
    if (form.discountValue <= 0) {
      toastError("Discount value must be greater than 0");
      return;
    }

    setIsSaving(true);
    try {
      const res = await createCouponAction({
        code: form.code,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderAmount: Number(form.minOrderAmount) || 0,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        expiresAt: form.expiresAt || null,
      });

      if (!res.success) {
        toastError(res.error || "Failed to create coupon");
        setIsSaving(false);
        return;
      }

      setCoupons([res.coupon as any, ...coupons]);
      toastSuccess(`Coupon ${res.coupon?.code} created successfully!`, "Coupon Created");
      setIsCreateOpen(false);
      setForm({
        code: "",
        description: "",
        discountType: "PERCENTAGE",
        discountValue: 10,
        minOrderAmount: 0,
        maxDiscountAmount: "",
        usageLimit: "",
        expiresAt: "",
      });
    } catch (err: any) {
      toastError(err.message || "Error creating coupon");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (couponId: string) => {
    try {
      const res = await toggleCouponAction(couponId);
      if (!res.success || !res.coupon) {
        toastError(res.error || "Failed to update coupon status");
        return;
      }

      setCoupons(
        coupons.map((c) => (c.id === couponId ? { ...c, isActive: res.coupon!.isActive } : c))
      );
      toastSuccess("Coupon status updated", "Updated");
    } catch (err: any) {
      toastError(err.message || "Error updating coupon");
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm("Are you sure you want to delete this promotional coupon?")) return;

    try {
      const res = await deleteCouponAction(couponId);
      if (!res.success) {
        toastError(res.error || "Failed to delete coupon");
        return;
      }

      setCoupons(coupons.filter((c) => c.id !== couponId));
      toastSuccess("Coupon removed successfully", "Deleted");
    } catch (err: any) {
      toastError(err.message || "Error deleting coupon");
    }
  };

  // Quick stats
  const totalActive = coupons.filter((c) => c.isActive).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + c.usageCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Promotions & Coupons
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="w-3 h-3 text-blue-400" />
              Promo Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Create discount codes, flash sale vouchers, and customer loyalty promo rules.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          className="gap-2 font-bold shadow-lg shadow-blue-500/20"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Create Promo Code
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Coupons</p>
            <p className="text-2xl font-black text-white mt-1">{coupons.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-400">
            <Tag className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Campaigns</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{totalActive}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Redemptions</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{totalRedemptions}</p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search coupon code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "ACTIVE", label: "Active Only" },
                { value: "INACTIVE", label: "Inactive Only" },
              ]}
              className="w-full sm:w-44"
            />
          </div>
        </div>
      </Card>

      {/* Coupon Grid */}
      {filteredCoupons.length === 0 ? (
        <Card className="p-12 text-center">
          <Tag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Promo Codes Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Create promotional coupon codes to offer discounts at the POS terminal and in wholesale invoices.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Create First Coupon
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((c) => {
            const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
            return (
              <div
                key={c.id}
                className={`rounded-2xl border p-5 transition-all relative overflow-hidden flex flex-col justify-between ${
                  !c.isActive || isExpired
                    ? "bg-slate-900/40 border-slate-800/80 opacity-75"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-lg shadow-black/20"
                }`}
              >
                {/* Decorative cut-out notches for coupon effect */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950 border border-slate-800" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950 border border-slate-800" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lg text-white tracking-wider px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        {c.code}
                      </span>
                    </div>

                    <Badge
                      variant={!c.isActive ? "outline" : isExpired ? "destructive" : "success"}
                      size="sm"
                    >
                      {!c.isActive ? "Deactivated" : isExpired ? "Expired" : "Active"}
                    </Badge>
                  </div>

                  {c.description && (
                    <p className="text-xs text-slate-300 font-medium">{c.description}</p>
                  )}

                  <div className="pt-2 border-t border-dashed border-slate-800 space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span className="font-bold text-emerald-400">
                        {c.discountType === "PERCENTAGE"
                          ? `${c.discountValue}% OFF`
                          : `${currencySymbol}${c.discountValue.toFixed(2)} OFF`}
                      </span>
                    </div>

                    {c.minOrderAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Min. Subtotal:</span>
                        <span className="font-medium text-slate-200">
                          {formatCurrency(c.minOrderAmount, "USD", currencySymbol)}
                        </span>
                      </div>
                    )}

                    {c.maxDiscountAmount && (
                      <div className="flex justify-between">
                        <span>Max. Cap:</span>
                        <span className="font-medium text-slate-200">
                          {formatCurrency(c.maxDiscountAmount, "USD", currencySymbol)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Used:</span>
                      <span className="font-medium text-slate-200">
                        {c.usageCount} times {c.usageLimit ? `/ max ${c.usageLimit}` : "(Unlimited)"}
                      </span>
                    </div>

                    {c.expiresAt && (
                      <div className="flex justify-between">
                        <span>Expires:</span>
                        <span className={`font-medium ${isExpired ? "text-rose-400" : "text-slate-200"}`}>
                          {formatDateTime(c.expiresAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                  <Button
                    variant={c.isActive ? "secondary" : "outline"}
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => handleToggleStatus(c.id)}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {c.isActive ? "Deactivate" : "Activate"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-2"
                    onClick={() => handleDeleteCoupon(c.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Coupon Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Promotional Coupon Code"
        description="Set discount rules and redemption constraints for your POS & wholesale registers."
        size="lg"
      >
        <form onSubmit={handleCreateCoupon} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Coupon Code *"
              placeholder="e.g. SUMMER20, VIP50, SAVE10"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              required
            />

            <Select
              label="Discount Type *"
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
              options={[
                { value: "PERCENTAGE", label: "Percentage (%) Discount" },
                { value: "FIXED", label: "Fixed Amount ($) Discount" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={form.discountType === "PERCENTAGE" ? "Discount Percentage (%) *" : "Discount Amount ($) *"}
              type="number"
              min="0.01"
              step="any"
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
              required
            />

            <Input
              label="Minimum Order Subtotal ($)"
              type="number"
              min="0"
              step="any"
              placeholder="0 (No minimum)"
              value={form.minOrderAmount}
              onChange={(e) => setForm({ ...form, minOrderAmount: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Max Discount Cap ($ optional)"
              type="number"
              min="0"
              step="any"
              placeholder="Unlimited"
              value={form.maxDiscountAmount}
              onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
            />

            <Input
              label="Total Usage Limit (optional)"
              type="number"
              min="1"
              placeholder="e.g. 100 uses"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Expiration Date (optional)"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />

            <Input
              label="Description / Campaign Name"
              placeholder="e.g. Summer weekend flash sale"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              className="gap-1.5 font-bold"
            >
              <Sparkles className="w-4 h-4" />
              Publish Coupon
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
