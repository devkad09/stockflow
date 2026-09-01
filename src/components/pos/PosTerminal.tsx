"use client";

import * as React from "react";
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowRight,
  Printer,
  FileText,
  CheckCircle2,
  X,
  Sparkles,
  Percent,
  Camera,
  PauseCircle,
  PlayCircle,
  Award,
  Tag,
  Lock,
  Unlock,
  Building,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { CameraScannerModal } from "./CameraScannerModal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { checkoutSaleAction } from "@/actions/pos-actions";
import { createCustomerAction } from "@/actions/customer-actions";
import { validateCouponAction } from "@/actions/coupon-actions";
import Link from "next/link";

export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryName: string;
  costPrice: number;
  sellingPrice: number;
  unit: string;
  currentStock: number;
  taxRate: number;
}

export interface PosCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  loyaltyPoints?: number;
  loyaltyTier?: string;
}

export interface CartItem {
  product: PosProduct;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
}

export interface ParkedCart {
  id: string;
  note: string;
  customerName: string;
  customerId: string | null;
  cart: CartItem[];
  orderDiscountPercent: number;
  couponCode: string | null;
  couponDiscountAmount: number;
  loyaltyPointsRedeemed: number;
  subtotal: number;
  parkedAt: string;
}

interface PosTerminalProps {
  initialProducts: PosProduct[];
  customers: PosCustomer[];
  activeShift?: {
    id: string;
    shiftNumber: string;
    openingFloat: number;
    expectedCash: number;
    cashSales: number;
    status: string;
  } | null;
  business: {
    name: string;
    currencySymbol: string;
    receiptHeader?: string | null;
    receiptFooter?: string | null;
    taxRate: number;
    phone?: string | null;
    address?: string | null;
    allowNegativeStock: boolean;
  };
  location: {
    id: string;
    name: string;
  };
  cashierName: string;
}

export function PosTerminal({
  initialProducts,
  customers: initialCustomers,
  activeShift,
  business,
  location,
  cashierName,
}: PosTerminalProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const [products, setProducts] = React.useState<PosProduct[]>(initialProducts);
  const [customers, setCustomers] = React.useState<PosCustomer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>("");
  const [orderDiscountPercent, setOrderDiscountPercent] = React.useState<number>(0);
  const [orderTaxPercent, setOrderTaxPercent] = React.useState<number>(business.taxRate || 0);

  // Coupon state
  const [couponInput, setCouponInput] = React.useState("");
  const [appliedCoupon, setAppliedCoupon] = React.useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = React.useState(false);

  // Loyalty state
  const [redeemPoints, setRedeemPoints] = React.useState(0);

  // Parked Carts state
  const [parkedCarts, setParkedCarts] = React.useState<ParkedCart[]>([]);
  const [isParkedDrawerOpen, setIsParkedDrawerOpen] = React.useState(false);
  const [parkNoteInput, setParkNoteInput] = React.useState("");
  const [isParkModalOpen, setIsParkModalOpen] = React.useState(false);

  // Modals state
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = React.useState(false);
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [completedSale, setCompletedSale] = React.useState<any>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Payment form state
  const [paymentMethod, setPaymentMethod] = React.useState<
    "CASH" | "CARD" | "BANK_TRANSFER" | "MOBILE_MONEY" | "OTHER"
  >("CASH");
  const [amountPaidInput, setAmountPaidInput] = React.useState<string>("");

  // New customer form state
  const [newCustomer, setNewCustomer] = React.useState({ name: "", phone: "", email: "" });

  // Load parked carts from local storage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(`stockflow_parked_carts_${location.id}`);
      if (saved) setParkedCarts(JSON.parse(saved));
    } catch {}
  }, [location.id]);

  const saveParkedCarts = (newCarts: ParkedCart[]) => {
    setParkedCarts(newCarts);
    try {
      localStorage.setItem(`stockflow_parked_carts_${location.id}`, JSON.stringify(newCarts));
    } catch {}
  };

  const selectedCustomer = React.useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const categories = React.useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.categoryName || "General")));
    return ["ALL", ...cats];
  }, [products]);

  // Filter products by search and category
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));
      const matchesCategory =
        selectedCategory === "ALL" || p.categoryName === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Hotkeys
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (cart.length > 0) setIsPaymentOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart]);

  // Add to cart
  const addToCart = (product: PosProduct) => {
    if (product.currentStock <= 0 && !business.allowNegativeStock) {
      toastError(`"${product.name}" is out of stock!`, "Stock Alert");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = existing.quantity + 1;
        if (nextQty > product.currentStock && !business.allowNegativeStock) {
          toastError(`Cannot add more. Only ${product.currentStock} units in stock.`, "Stock Limit");
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: nextQty } : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
          discountAmount: 0,
          taxAmount: 0,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty > item.product.currentStock && !business.allowNegativeStock && delta > 0) {
              toastError(`Max stock available: ${item.product.currentStock}`, "Stock Limit");
              return item;
            }
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomerId("");
    setOrderDiscountPercent(0);
    setAppliedCoupon(null);
    setRedeemPoints(0);
  };

  // Park Cart Handler
  const handleParkCart = () => {
    if (cart.length === 0) return;
    const newParked: ParkedCart = {
      id: `park_${Date.now()}`,
      note: parkNoteInput.trim() || `Customer #${parkedCarts.length + 1}`,
      customerName: selectedCustomer ? selectedCustomer.name : "Walk-in Customer",
      customerId: selectedCustomerId || null,
      cart,
      orderDiscountPercent,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      couponDiscountAmount: appliedCoupon ? appliedCoupon.discountAmount : 0,
      loyaltyPointsRedeemed: redeemPoints,
      subtotal: rawSubtotal,
      parkedAt: new Date().toISOString(),
    };

    saveParkedCarts([newParked, ...parkedCarts]);
    toastSuccess(`Cart parked (${newParked.note})`, "Cart Suspended");
    clearCart();
    setIsParkModalOpen(false);
    setParkNoteInput("");
  };

  const handleResumeParkedCart = (pCart: ParkedCart) => {
    if (cart.length > 0) {
      if (!confirm("Current cart will be replaced by the resumed cart. Proceed?")) return;
    }

    setCart(pCart.cart);
    setSelectedCustomerId(pCart.customerId || "");
    setOrderDiscountPercent(pCart.orderDiscountPercent || 0);
    if (pCart.couponCode) {
      setAppliedCoupon({ code: pCart.couponCode, discountAmount: pCart.couponDiscountAmount });
    }
    setRedeemPoints(pCart.loyaltyPointsRedeemed || 0);

    const remaining = parkedCarts.filter((c) => c.id !== pCart.id);
    saveParkedCarts(remaining);
    setIsParkedDrawerOpen(false);
    toastSuccess(`Resumed cart for "${pCart.customerName}"`, "Cart Restored");
  };

  const handleDeleteParkedCart = (id: string) => {
    const remaining = parkedCarts.filter((c) => c.id !== id);
    saveParkedCarts(remaining);
    toastSuccess("Parked cart deleted", "Removed");
  };

  // Apply Promo Coupon
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsValidatingCoupon(true);
    try {
      const res = await validateCouponAction(couponInput.trim(), rawSubtotal);
      if (!res.success || !res.coupon?.code || res.discountAmount === undefined) {
        toastError(res.error || "Invalid coupon", "Coupon Failed");
        setIsValidatingCoupon(false);
        return;
      }

      setAppliedCoupon({
        code: res.coupon.code,
        discountAmount: res.discountAmount,
      });
      toastSuccess(`Applied coupon ${res.coupon.code}: -$${res.discountAmount.toFixed(2)} off!`, "Coupon Applied");
      setCouponInput("");
    } catch (err: any) {
      toastError(err.message || "Error validating coupon");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Cart Calculations
  const rawSubtotal = cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

  // Percentage discount
  const pctDiscountAmount = Math.round(rawSubtotal * (orderDiscountPercent / 100) * 100) / 100;

  // Coupon discount
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;

  // Loyalty points discount (e.g. 20 points = $1 off)
  const loyaltyDiscount = Math.round((redeemPoints / 20) * 100) / 100;

  const totalDiscountAmount = Math.min(rawSubtotal, pctDiscountAmount + couponDiscount + loyaltyDiscount);
  const taxableAmount = Math.max(0, rawSubtotal - totalDiscountAmount);
  const taxAmount = Math.round(taxableAmount * (orderTaxPercent / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const paidAmount = Number(amountPaidInput) || 0;
  const changeAmount = Math.max(0, Math.round((paidAmount - grandTotal) * 100) / 100);

  // Open Payment modal with default exact amount
  const handleOpenPayment = () => {
    if (cart.length === 0) {
      toastError("Cart is empty! Select products first.", "Empty Cart");
      return;
    }
    setAmountPaidInput(grandTotal.toString());
    setIsPaymentOpen(true);
  };

  // Barcode enter scanner
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const match = products.find(
      (p) =>
        (p.barcode && p.barcode === searchQuery.trim()) ||
        p.sku.toLowerCase() === searchQuery.trim().toLowerCase()
    );
    if (match) {
      addToCart(match);
      setSearchQuery("");
      toastSuccess(`Added "${match.name}" to cart`, "Barcode Scanned");
    } else {
      toastError(`No product found with barcode/SKU: ${searchQuery}`, "Not Found");
    }
  };

  // Complete checkout
  const handleCompleteSale = async () => {
    if (paidAmount < grandTotal && paymentMethod === "CASH") {
      toastError(`Paid amount is less than the total ($${grandTotal})`, "Payment Insufficient");
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        locationId: location.id,
        customerId: selectedCustomerId || null,
        shiftId: activeShift ? activeShift.id : null,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        loyaltyPointsRedeemed: redeemPoints,
        loyaltyDiscount,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: item.product.costPrice,
          discountAmount: item.discountAmount,
          taxAmount: item.taxAmount,
        })),
        subtotal: rawSubtotal,
        discountAmount: totalDiscountAmount,
        discountPercent: orderDiscountPercent,
        taxAmount,
        totalAmount: grandTotal,
        paidAmount: paymentMethod === "CASH" ? paidAmount : grandTotal,
        changeAmount: paymentMethod === "CASH" ? changeAmount : 0,
        paymentMethod,
      };

      const res = await checkoutSaleAction(payload);
      if (!res.success) {
        toastError(res.error || "Checkout failed", "Transaction Error");
        setIsProcessing(false);
        return;
      }

      // Update local product stocks
      setProducts((prev) =>
        prev.map((p) => {
          const sold = cart.find((c) => c.product.id === p.id);
          return sold ? { ...p, currentStock: p.currentStock - sold.quantity } : p;
        })
      );

      // Update local customer points if attached
      if (selectedCustomerId) {
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id === selectedCustomerId) {
              const currentPts = c.loyaltyPoints || 0;
              const earned = Math.floor(grandTotal);
              return { ...c, loyaltyPoints: Math.max(0, currentPts - redeemPoints + earned) };
            }
            return c;
          })
        );
      }

      setCompletedSale(res.sale);
      setIsPaymentOpen(false);
      setIsReceiptOpen(true);
      clearCart();
      toastSuccess("Sale completed successfully!", "Checkout Completed");
    } catch (err: any) {
      toastError(err.message || "Failed to process sale", "Error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) return;

    try {
      const res = await createCustomerAction(newCustomer);
      if (res.success && res.customer) {
        setCustomers((prev) => [res.customer as PosCustomer, ...prev]);
        setSelectedCustomerId(res.customer.id);
        setIsNewCustomerOpen(false);
        setNewCustomer({ name: "", phone: "", email: "" });
        toastSuccess(`Customer "${res.customer.name}" created!`);
      } else {
        toastError(res.error || "Failed to create customer");
      }
    } catch (err: any) {
      toastError(err.message || "Error creating customer");
    }
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-6.5rem)] gap-4 select-none">
      {/* LEFT PANE: Product Catalog & Fast Search */}
      <div className="flex-1 flex flex-col rounded-3xl border border-slate-800/90 bg-slate-950/70 backdrop-blur-2xl p-4 overflow-hidden shadow-2xl">
        {/* Top Status & Shift Indicator Bar */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-xs">
          <div className="flex items-center gap-2">
            <Link
              href="/shifts"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors text-slate-300 font-semibold"
            >
              {activeShift ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white font-mono">{activeShift.shiftNumber}</span>
                  <span className="text-[10px] text-emerald-400 font-bold">(Open)</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-bold">No Shift Open</span>
                  <span className="text-[10px] text-slate-400">&rarr; Open Float</span>
                </>
              )}
            </Link>

            <span className="text-slate-500">•</span>
            <span className="text-slate-400 text-[11px] font-medium">{location.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 rounded-xl border-slate-700 text-slate-300 relative"
              onClick={() => setIsParkedDrawerOpen(true)}
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Parked ({parkedCarts.length})</span>
              {parkedCarts.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse absolute -top-0.5 -right-0.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Search & Barcode Bar */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
            <Input
              ref={searchInputRef}
              placeholder="Search by name, SKU, or scan barcode (F2)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              className="bg-slate-900/90 border-slate-700/70 rounded-2xl h-11"
            />
          </form>

          <Button
            variant="secondary"
            size="md"
            onClick={handleBarcodeSubmit}
            title="Scan / Submit Barcode"
            className="shrink-0 rounded-2xl h-11 px-4"
          >
            <Barcode className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Enter</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsCameraOpen(true)}
            title="Scan via Device Camera"
            className="shrink-0 rounded-2xl h-11 px-4 border-purple-500/30 text-purple-300"
          >
            <Camera className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Camera</span>
          </Button>
        </div>

        {/* Categories Carousel */}
        <div className="flex items-center gap-2 py-3 overflow-x-auto border-b border-slate-800/80 shrink-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat
                  ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 border border-white/20 scale-105"
                  : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto py-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredProducts.map((p) => {
            const isOut = p.currentStock <= 0;
            return (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={isOut && !business.allowNegativeStock}
                className={`flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all duration-300 relative group overflow-hidden ${
                  isOut
                    ? "bg-slate-950/40 border-slate-900 opacity-40 cursor-not-allowed"
                    : "glass-card hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
                      {p.categoryName || "General"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isOut
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : p.currentStock <= 5
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                      }`}
                    >
                      {p.currentStock} {p.unit}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1.5 line-clamp-2 leading-tight group-hover:text-blue-300 transition-colors">
                    {p.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">SKU: {p.sku}</p>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                    {formatCurrency(p.sellingPrice, "USD", business.currencySymbol)}
                  </span>
                  <div className="h-7 w-7 rounded-xl bg-indigo-600/20 text-indigo-400 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white flex items-center justify-center transition-all shadow-sm">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs">
              No products found matching "{searchQuery}".
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Cart & Checkout Ledger */}
      <div className="w-full lg:w-96 flex flex-col rounded-3xl border border-slate-800/90 bg-slate-950/75 backdrop-blur-2xl p-4 shadow-2xl shrink-0">
        {/* Customer Selector & Loyalty Badge */}
        <div className="space-y-2 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setRedeemPoints(0);
                }}
                className="w-full bg-slate-900 border border-slate-700/80 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="">Walk-in Customer (General)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""} {c.loyaltyTier ? `[${c.loyaltyTier}]` : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNewCustomerOpen(true)}
              title="Add New Customer"
              className="rounded-xl px-3"
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>+</span>
            </Button>
          </div>

          {/* Customer Loyalty Points Info & Redeem */}
          {selectedCustomer && (
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="font-bold text-amber-300">
                    {selectedCustomer.loyaltyPoints || 0} Points
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1 font-semibold">
                    ({selectedCustomer.loyaltyTier || "BRONZE"})
                  </span>
                </div>
              </div>

              {(selectedCustomer.loyaltyPoints || 0) >= 20 && (
                <div className="flex items-center gap-1">
                  {redeemPoints === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const maxRedeem = Math.min(
                          selectedCustomer.loyaltyPoints || 0,
                          Math.floor(rawSubtotal * 20)
                        );
                        setRedeemPoints(maxRedeem);
                        toastSuccess(`Redeemed ${maxRedeem} points for -$${(maxRedeem / 20).toFixed(2)} off!`);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold text-amber-300 transition-all"
                    >
                      Redeem Points
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRedeemPoints(0)}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white"
                    >
                      Remove (-${loyaltyDiscount})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Item Lines */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 mb-3 text-slate-600">
                <ShoppingCart className="w-8 h-8 stroke-1" />
              </div>
              <p className="text-xs font-bold text-slate-400">Cart is empty</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Click products or scan barcodes</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-3 rounded-2xl glass-card flex items-center justify-between text-xs gap-2 transition-all hover:border-slate-600"
              >
                <div className="flex-1 truncate">
                  <p className="font-bold text-white truncate">{item.product.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatCurrency(item.unitPrice, "USD", business.currencySymbol)} × {item.quantity} ={" "}
                    <span className="text-slate-200 font-bold">
                      {formatCurrency(item.quantity * item.unitPrice, "USD", business.currencySymbol)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors shadow-sm"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-black text-white">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="h-7 w-7 rounded-lg text-rose-400 hover:bg-rose-500/20 flex items-center justify-center ml-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Coupon Code Input */}
        <div className="pt-2 pb-2 border-t border-slate-800/80">
          {!appliedCoupon ? (
            <form onSubmit={handleApplyCoupon} className="flex items-center gap-1.5">
              <Input
                placeholder="Promo / Coupon code..."
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                className="h-8 text-xs font-mono uppercase bg-slate-900"
              />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                className="h-8 text-xs font-bold px-3 shrink-0"
                isLoading={isValidatingCoupon}
              >
                Apply
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-xs">
              <div className="flex items-center gap-1.5 text-blue-300 font-mono font-bold">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                <span>{appliedCoupon.code} (-${appliedCoupon.discountAmount.toFixed(2)})</span>
              </div>
              <button
                type="button"
                onClick={() => setAppliedCoupon(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Discounts & Summary Footer */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
          {/* Quick Discount Picker */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
              <Percent className="w-3.5 h-3.5" /> Discount:
            </span>
            <div className="flex items-center gap-1">
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setOrderDiscountPercent(pct)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                    orderDiscountPercent === pct
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-200">
              {formatCurrency(rawSubtotal, "USD", business.currencySymbol)}
            </span>
          </div>

          {totalDiscountAmount > 0 && (
            <div className="flex justify-between text-emerald-400 font-semibold text-[11px]">
              <span>Total Discount</span>
              <span>-{formatCurrency(totalDiscountAmount, "USD", business.currencySymbol)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Tax ({orderTaxPercent}%)</span>
            <span className="font-semibold text-slate-200">
              {formatCurrency(taxAmount, "USD", business.currencySymbol)}
            </span>
          </div>

          {/* Grand Total Box */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex justify-between items-baseline shadow-lg">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300">Total Due</span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              {formatCurrency(grandTotal, "USD", business.currencySymbol)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsParkModalOpen(true)}
              disabled={cart.length === 0}
              className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 rounded-2xl text-xs px-2"
              title="Hold / Park Cart"
            >
              <PauseCircle className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="text-slate-400 rounded-2xl text-xs px-2"
            >
              Clear
            </Button>
            <Button
              variant="success"
              size="md"
              onClick={handleOpenPayment}
              disabled={cart.length === 0}
              className="col-span-2 font-black rounded-2xl shadow-lg shadow-emerald-500/20"
            >
              Checkout (F4) &rarr;
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL: Hold / Park Cart */}
      <Modal
        isOpen={isParkModalOpen}
        onClose={() => setIsParkModalOpen(false)}
        title="Park Current Cart"
        description="Temporarily hold this transaction and serve another customer without losing scanned items."
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Customer Name or Note (optional)"
            placeholder="e.g. Table 4, Red Jacket customer, Phone order"
            value={parkNoteInput}
            onChange={(e) => setParkNoteInput(e.target.value)}
            autoFocus
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsParkModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleParkCart} className="font-bold">
              <PauseCircle className="w-4 h-4 mr-1" />
              Hold & Park Cart
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL / DRAWER: Parked Carts List */}
      <Modal
        isOpen={isParkedDrawerOpen}
        onClose={() => setIsParkedDrawerOpen(false)}
        title={`Suspended / Parked Carts (${parkedCarts.length})`}
        description="Select a suspended cart to restore and continue checkout."
        size="md"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {parkedCarts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No suspended carts. Use the Hold Cart button to park carts during rushes.
            </div>
          ) : (
            parkedCarts.map((pCart) => (
              <div
                key={pCart.id}
                className="p-3.5 rounded-2xl glass-card flex items-center justify-between text-xs gap-3"
              >
                <div className="space-y-1 flex-1 truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{pCart.note}</span>
                    <Badge variant="outline" size="sm">
                      {pCart.cart.length} items
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Customer: {pCart.customerName} • Parked: {formatDateTime(pCart.parkedAt)}
                  </p>
                  <p className="font-black text-emerald-400">
                    {formatCurrency(pCart.subtotal, "USD", business.currencySymbol)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="success"
                    size="sm"
                    className="gap-1 font-bold"
                    onClick={() => handleResumeParkedCart(pCart)}
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    Resume
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDeleteParkedCart(pCart.id)}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* MODAL 1: Checkout & Payment Modal */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Complete Sale Payment"
        description="Select payment method and calculate customer change"
      >
        <div className="space-y-5">
          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {(
              [
                { id: "CASH", label: "Cash", icon: Banknote },
                { id: "CARD", label: "Card", icon: CreditCard },
                { id: "BANK_TRANSFER", label: "Transfer", icon: Building },
                { id: "MOBILE_MONEY", label: "Mobile", icon: Smartphone },
                { id: "OTHER", label: "Other", icon: Sparkles },
              ] as const
            ).map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 text-xs font-black transition-all ${
                    paymentMethod === m.id
                      ? "bg-gradient-to-tr from-blue-600/30 via-indigo-600/30 to-purple-600/30 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30 scale-105"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Amount Due Display */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 text-center space-y-1 shadow-inner">
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">Total Amount Due</span>
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 tracking-tight">
              {formatCurrency(grandTotal, "USD", business.currencySymbol)}
            </div>
            {selectedCustomer && (
              <p className="text-[11px] text-amber-400 font-semibold pt-1">
                ⭐ +{Math.floor(grandTotal)} loyalty points will be earned on this order
              </p>
            )}
          </div>

          {/* Cash Payment Quick Preset Buttons */}
          {paymentMethod === "CASH" && (
            <div className="space-y-3.5">
              <Input
                label="Amount Tendered / Paid"
                type="number"
                step="0.01"
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                autoFocus
                className="text-lg font-bold text-white bg-slate-950 border-slate-700 h-12"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAmountPaidInput(grandTotal.toString())}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all"
                >
                  Exact ({formatCurrency(grandTotal, "USD", business.currencySymbol)})
                </button>
                {[10, 20, 50, 100].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setAmountPaidInput((Math.ceil(grandTotal / inc) * inc).toString())}
                    className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all"
                  >
                    Round ${inc}
                  </button>
                ))}
              </div>

              {/* Change Calculator */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-sm shadow-sm">
                <span className="font-bold text-slate-300">Change Due to Customer:</span>
                <span className="text-xl font-black text-amber-400">
                  {formatCurrency(changeAmount, "USD", business.currencySymbol)}
                </span>
              </div>
            </div>
          )}

          {/* Complete Button */}
          <Button
            variant="success"
            size="lg"
            className="w-full font-bold"
            onClick={handleCompleteSale}
            isLoading={isProcessing}
          >
            Confirm & Print Receipt &rarr;
          </Button>
        </div>
      </Modal>

      {/* MODAL 2: Printable Receipt Preview */}
      <Modal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title="Transaction Completed"
        size="md"
      >
        <div className="space-y-4">
          {/* Printable Receipt Container */}
          <div
            id="printable-receipt"
            className="bg-white text-black p-6 rounded-lg font-mono text-xs space-y-3 shadow-inner border border-slate-300"
          >
            <div className="text-center space-y-1 pb-2 border-b border-dashed border-gray-400">
              <h2 className="font-bold text-base tracking-tight">{business.name}</h2>
              {business.address && <p className="text-[10px] text-gray-600">{business.address}</p>}
              {business.phone && <p className="text-[10px] text-gray-600">Tel: {business.phone}</p>}
              <p className="text-[10px] text-gray-700 font-bold mt-1">
                RECEIPT: #{completedSale?.receiptNumber}
              </p>
              <p className="text-[9px] text-gray-500">{formatDateTime(completedSale?.createdAt || new Date())}</p>
              <p className="text-[9px] text-gray-500">Cashier: {cashierName}</p>
            </div>

            {/* Line items */}
            <div className="space-y-1.5 py-2 border-b border-dashed border-gray-400 text-[11px]">
              {completedSale?.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span className="truncate max-w-[160px]">
                    {item.product?.name || "Item"} × {item.quantity}
                  </span>
                  <span className="font-semibold">{formatCurrency(item.total, "USD", business.currencySymbol)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 pt-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(completedSale?.subtotal || 0, "USD", business.currencySymbol)}</span>
              </div>
              {completedSale?.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-{formatCurrency(completedSale.discountAmount, "USD", business.currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(completedSale?.taxAmount || 0, "USD", business.currencySymbol)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-400">
                <span>TOTAL:</span>
                <span>{formatCurrency(completedSale?.totalAmount || 0, "USD", business.currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700 pt-1">
                <span>Payment ({completedSale?.paymentMethod}):</span>
                <span>{formatCurrency(completedSale?.paidAmount || 0, "USD", business.currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700">
                <span>Change:</span>
                <span>{formatCurrency(completedSale?.changeAmount || 0, "USD", business.currencySymbol)}</span>
              </div>
            </div>

            {/* Loyalty points info on receipt */}
            {completedSale?.customer && (
              <div className="pt-2 border-t border-dashed border-gray-400 text-[10px] text-gray-700">
                <p>Customer: {completedSale.customer.name}</p>
                <p>Points Earned: +{completedSale.loyaltyPointsEarned || Math.floor(completedSale.totalAmount)}</p>
                <p>Total Points Balance: {completedSale.customer.loyaltyPoints} pts</p>
              </div>
            )}

            {/* Receipt Footer */}
            <div className="text-center pt-3 border-t border-dashed border-gray-400 text-[10px] text-gray-600">
              <p>{business.receiptFooter || "Thank you for your business!"}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="primary" size="md" onClick={printReceipt} className="font-bold gap-2">
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsReceiptOpen(false)}
              className="font-semibold"
            >
              New Sale (F4)
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Create Customer Inline */}
      <Modal
        isOpen={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
        title="Add New Customer"
        description="Quick customer profile creation"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={newCustomer.name}
            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            autoFocus
          />
          <Input
            label="Phone Number"
            type="tel"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
          />
          <Input
            label="Email Address"
            type="email"
            value={newCustomer.email}
            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
          />
          <Button type="submit" variant="primary" className="w-full">
            Save Customer & Select
          </Button>
        </form>
      </Modal>

      {/* MODAL 4: Camera Barcode Scanner */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        availableProducts={products}
        onScan={(code) => {
          const match = products.find(
            (p) => (p.barcode && p.barcode === code) || p.sku.toLowerCase() === code.toLowerCase()
          );
          if (match) {
            addToCart(match);
            toastSuccess(`Added "${match.name}" to cart`, "Camera Scanned");
          } else {
            toastError(`No product found with barcode/SKU: ${code}`, "Not Found");
          }
        }}
      />
    </div>
  );
}
