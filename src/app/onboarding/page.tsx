"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { completeOnboardingAction } from "@/actions/onboarding-actions";
import {
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Store,
  Globe,
  Coins,
  MapPin,
  Package,
  Layers,
  Users,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);

  const [formData, setFormData] = React.useState({
    businessName: "",
    businessType: "Clothing & Apparel",
    country: "United States",
    currency: "USD",
    currencySymbol: "$",
    locationName: "Main Store",
    locationAddress: "100 Commercial Blvd",
    productName: "Classic Cotton T-Shirt",
    productCategory: "Apparel",
    costPrice: 12.0,
    sellingPrice: 28.0,
    initialQuantity: 25,
    minStockLevel: 5,
    employeeEmail: "",
    employeeRole: "CASHIER",
  });

  const totalSteps = 8;

  const nextStep = () => {
    if (currentStep === 1 && !formData.businessName.trim()) {
      toastError("Please enter your business name", "Step 1");
      return;
    }
    if (currentStep === 5 && !formData.locationName.trim()) {
      toastError("Please enter your store/location name", "Step 5");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps + 1));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      const res = await completeOnboardingAction(formData);
      if (!res.success) {
        toastError(res.error || "Failed to set up business", "Error");
        setIsLoading(false);
        return;
      }

      setCurrentStep(9); // Celebration screen
      toastSuccess("Your business and inventory are ready!", "Success");
    } catch (err: any) {
      toastError(err.message || "An unexpected error occurred", "Error");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10 space-y-6">
        {/* Progress header */}
        {currentStep <= 8 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-blue-400">
                Setup Wizard • Step {currentStep} of {totalSteps}
              </span>
              <span>{Math.round((currentStep / totalSteps) * 100)}% Completed</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Wizard Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* STEP 1: Business Name */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">What is your business name?</h2>
                  <p className="text-xs text-slate-400">This will appear on your receipts, reports and POS invoices.</p>
                </div>
              </div>

              <Input
                label="Business Name"
                placeholder="e.g. Apex Apparel & Accessories"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                autoFocus
              />
            </div>
          )}

          {/* STEP 2: Business Type */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Select your store type</h2>
                  <p className="text-xs text-slate-400">Helps us tailor categories, default units, and inventory defaults.</p>
                </div>
              </div>

              <Select
                label="Primary Business Category"
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                options={[
                  { value: "Clothing & Apparel", label: "Clothing & Fashion Store" },
                  { value: "Phone & Accessories", label: "Phone & Mobile Accessories Shop" },
                  { value: "Electronics & Tech", label: "Electronics & Computer Store" },
                  { value: "Beauty & Cosmetics", label: "Cosmetics & Skincare Retail" },
                  { value: "Grocery & Mart", label: "Grocery & Convenience Mart" },
                  { value: "Wholesale & Distribution", label: "Wholesaler / Bulk Trade" },
                  { value: "Online Seller", label: "Multi-channel / E-commerce" },
                  { value: "General Retail", label: "General Retail Store" },
                ]}
              />
            </div>
          )}

          {/* STEP 3: Country */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Where is your business based?</h2>
                  <p className="text-xs text-slate-400">Used for regional tax and currency defaults.</p>
                </div>
              </div>

              <Select
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                options={[
                  { value: "United States", label: "United States (US)" },
                  { value: "United Kingdom", label: "United Kingdom (UK)" },
                  { value: "Canada", label: "Canada (CA)" },
                  { value: "Australia", label: "Australia (AU)" },
                  { value: "Nigeria", label: "Nigeria (NG)" },
                  { value: "Kenya", label: "Kenya (KE)" },
                  { value: "South Africa", label: "South Africa (ZA)" },
                  { value: "Ghana", label: "Ghana (GH)" },
                  { value: "Germany", label: "Germany (EU)" },
                  { value: "France", label: "France (EU)" },
                  { value: "India", label: "India (IN)" },
                  { value: "United Arab Emirates", label: "United Arab Emirates (UAE)" },
                  { value: "Other", label: "Other Country" },
                ]}
              />
            </div>
          )}

          {/* STEP 4: Currency */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Select your primary currency</h2>
                  <p className="text-xs text-slate-400">All prices, sales, and reports will use this currency.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Currency Code"
                  value={formData.currency}
                  onChange={(e) => {
                    const c = e.target.value;
                    const symbols: Record<string, string> = {
                      USD: "$",
                      EUR: "€",
                      GBP: "£",
                      CAD: "$",
                      AUD: "$",
                      NGN: "₦",
                      KES: "KSh",
                      ZAR: "R",
                      GHS: "GH₵",
                      INR: "₹",
                      AED: "AED",
                    };
                    setFormData({
                      ...formData,
                      currency: c,
                      currencySymbol: symbols[c] || "$",
                    });
                  }}
                  options={[
                    { value: "USD", label: "USD - US Dollar" },
                    { value: "EUR", label: "EUR - Euro" },
                    { value: "GBP", label: "GBP - British Pound" },
                    { value: "CAD", label: "CAD - Canadian Dollar" },
                    { value: "AUD", label: "AUD - Australian Dollar" },
                    { value: "NGN", label: "NGN - Nigerian Naira" },
                    { value: "KES", label: "KES - Kenyan Shilling" },
                    { value: "ZAR", label: "ZAR - South African Rand" },
                    { value: "GHS", label: "GHS - Ghanaian Cedi" },
                    { value: "INR", label: "INR - Indian Rupee" },
                    { value: "AED", label: "AED - UAE Dirham" },
                  ]}
                />

                <Input
                  label="Currency Symbol"
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* STEP 5: Business Location */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Your first store location</h2>
                  <p className="text-xs text-slate-400">Your initial inventory and POS terminal will be bound to this location.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Location / Branch Name"
                  placeholder="e.g. Downtown Main Store"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                />
                <Input
                  label="Physical Address (Optional)"
                  placeholder="e.g. 100 Main Street, Suite 4B"
                  value={formData.locationAddress}
                  onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* STEP 6: Create First Product */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Add your first product</h2>
                  <p className="text-xs text-slate-400">Enter a sample product to test your inventory flow.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Product Name"
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                />

                <Input
                  label="Category Name"
                  placeholder="e.g. Audio & Electronics"
                  value={formData.productCategory}
                  onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={`Cost Price (${formData.currencySymbol})`}
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                  />
                  <Input
                    label={`Selling Price (${formData.currencySymbol})`}
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Set Initial Inventory */}
          {currentStep === 7 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Set initial inventory count</h2>
                  <p className="text-xs text-slate-400">StockFlow will create an Opening Stock movement record.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Initial Quantity in Stock"
                  type="number"
                  value={formData.initialQuantity}
                  onChange={(e) => setFormData({ ...formData, initialQuantity: Number(e.target.value) })}
                />
                <Input
                  label="Low-Stock Alert Level"
                  type="number"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                <p className="font-semibold text-white mb-1">Stock Calculation Preview:</p>
                <p>
                  Product: <span className="text-blue-400 font-bold">{formData.productName}</span>
                </p>
                <p>
                  Initial Stock: <span className="text-emerald-400 font-bold">{formData.initialQuantity} pcs</span>
                </p>
                <p>
                  Inventory Asset Value:{" "}
                  <span className="text-amber-400 font-bold">
                    {formData.currencySymbol}
                    {(formData.initialQuantity * formData.costPrice).toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* STEP 8: Invite Employees (Optional) */}
          {currentStep === 8 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Invite team members (Optional)</h2>
                  <p className="text-xs text-slate-400">You can invite cashiers, managers, and inventory staff anytime later.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-3">
                <p className="text-xs text-slate-300">
                  Your account is registered as the <strong className="text-blue-400">Business Owner (full permissions)</strong>. Additional staff can be added under <strong>Team & RBAC</strong>.
                </p>
              </div>

              <Button
                type="button"
                variant="success"
                className="w-full py-3 font-bold text-sm"
                onClick={handleFinish}
                isLoading={isLoading}
              >
                Complete Setup & Launch Workspace &rarr;
              </Button>
            </div>
          )}

          {/* STEP 9: Final Celebration */}
          {currentStep === 9 && (
            <div className="text-center py-6 space-y-5 animate-in zoom-in-95">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Your inventory is ready.
                </h2>
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  <strong className="text-white">{formData.businessName}</strong> is configured with multi-tenancy, POS, inventory tracking, and financial ledgers.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push("/dashboard")}
                  className="font-bold"
                >
                  Go to Dashboard &rarr;
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/pos")}
                  className="font-bold"
                >
                  Open POS Terminal (F4)
                </Button>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          {currentStep <= 7 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>

              <Button type="button" variant="primary" size="md" onClick={nextStep}>
                Continue
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
