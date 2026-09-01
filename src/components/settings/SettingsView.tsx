"use client";

import * as React from "react";
import {
  Settings,
  Building2,
  Percent,
  Receipt,
  ShieldCheck,
  Save,
  AlertTriangle,
  Palette,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { updateSettingsAction } from "@/actions/settings-actions";
import { ACCENT_PALETTES, AccentColor } from "@/components/theme/ThemeSelector";

export interface BusinessSettingsData {
  name: string;
  type: string;
  country: string;
  currency: string;
  currencySymbol: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxRate: number;
  taxNumber: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  allowNegativeStock: boolean;
}

interface SettingsViewProps {
  initialSettings: BusinessSettingsData;
}

export function SettingsView({ initialSettings }: SettingsViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [formData, setFormData] = React.useState<BusinessSettingsData>(initialSettings);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedAccent, setSelectedAccent] = React.useState<AccentColor>("violet");

  React.useEffect(() => {
    const saved = (localStorage.getItem("stockflow_accent") as AccentColor) || "violet";
    setSelectedAccent(saved);
  }, []);

  const handleSelectAccent = (color: AccentColor) => {
    setSelectedAccent(color);
    localStorage.setItem("stockflow_accent", color);
    document.documentElement.setAttribute("data-accent", color);
    toastSuccess(`Theme colour updated to ${color.toUpperCase()}!`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await updateSettingsAction(formData);
      if (!res.success) {
        toastError(res.error || "Failed to update settings");
        setIsSaving(false);
        return;
      }

      toastSuccess("Business settings updated successfully!");
    } catch (err: any) {
      toastError(err.message || "Error updating settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Business Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure company profile, receipt print disclaimers, regional tax, and inventory safety constraints.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Brand Theme & Colour Customizer Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-400" />
              App Theme & Brand Accent Colour
            </CardTitle>
            <CardDescription>
              Choose your company brand accent colour for POS buttons, gradients, highlights, and cards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {ACCENT_PALETTES.map((p) => {
                const isSelected = selectedAccent === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectAccent(p.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-slate-800 border-white/60 shadow-lg text-white ring-2 ring-white/20"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-full ${p.dotColor} flex items-center justify-center shadow-md`}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              General Business Profile
            </CardTitle>
            <CardDescription>Legal business name and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Business Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Input
                label="Store Category / Business Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Business Phone Number"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <Input
                label="Business Email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <Input
              label="Store Street Address"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Currency & Tax Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-400" />
              Currency & Tax Settings
            </CardTitle>
            <CardDescription>Default currency symbol and VAT/Sales Tax rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Input
                label="Currency Code"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              />

              <Input
                label="Currency Symbol"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
              />

              <Input
                label="Default Tax Rate (%)"
                type="number"
                step="0.01"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
              />

              <Input
                label="Tax Identification #"
                value={formData.taxNumber || ""}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Receipt Disclaimers Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-purple-400" />
              Receipt Customization
            </CardTitle>
            <CardDescription>Header message and footer terms printed on POS slips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Receipt Header Note (Optional)"
              value={formData.receiptHeader || ""}
              onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
              placeholder="e.g. Welcome to our flagship store!"
            />

            <Input
              label="Receipt Footer / Return Policy"
              value={formData.receiptFooter || ""}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              placeholder="e.g. Returns accepted within 14 days with original receipt."
            />
          </CardContent>
        </Card>

        {/* Inventory Safety Constraints Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Inventory Safety & Integrity Constraints
            </CardTitle>
            <CardDescription>Control whether POS sales can occur when physical stock is 0</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="space-y-1">
                <span className="font-bold text-white block">Allow Negative Inventory</span>
                <p className="text-slate-400 text-xs max-w-lg">
                  When <strong>disabled (recommended)</strong>, the POS terminal and API will strictly reject checkouts that exceed current on-hand stock.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowNegativeStock}
                  onChange={(e) =>
                    setFormData({ ...formData, allowNegativeStock: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="lg" isLoading={isSaving} className="font-bold gap-2">
            <Save className="w-4 h-4" />
            Save Business Settings &rarr;
          </Button>
        </div>
      </form>
    </div>
  );
}
