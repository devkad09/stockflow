"use client";

import * as React from "react";
import {
  Layers,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  History,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Package,
  Boxes,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { adjustStockAction } from "@/actions/inventory-actions";

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryName: string;
  costPrice: number;
  sellingPrice: number;
  minStockLevel: number;
  unit: string;
  currentStock: number;
}

export interface MovementRecord {
  id: string;
  productName: string;
  productSku: string;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  type: string;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  userName: string;
  createdAt: string | Date;
}

interface InventoryViewProps {
  initialInventory: InventoryItem[];
  initialMovements: MovementRecord[];
  currencySymbol: string;
  locationId: string;
  locationName: string;
}

export function InventoryView({
  initialInventory,
  initialMovements,
  currencySymbol,
  locationId,
  locationName,
}: InventoryViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [activeTab, setActiveTab] = React.useState<"levels" | "ledger">("levels");
  const [items, setItems] = React.useState<InventoryItem[]>(initialInventory);
  const [movements, setMovements] = React.useState<MovementRecord[]>(initialMovements);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [movementTypeFilter, setMovementTypeFilter] = React.useState<string>("ALL");
  const [stockLevelFilter, setStockLevelFilter] = React.useState<string>("ALL");

  // Quick Adjust Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<InventoryItem | null>(null);
  const [adjustForm, setAdjustForm] = React.useState({
    productId: "",
    quantityChange: 1,
    type: "ADJUSTMENT" as "ADJUSTMENT" | "DAMAGED" | "RETURN" | "OPENING_STOCK" | "TRANSFER",
    notes: "",
  });
  const [isSaving, setIsSaving] = React.useState(false);

  // Filtered inventory levels
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());

      let matchLevel = true;
      if (stockLevelFilter === "LOW") {
        matchLevel = item.currentStock <= item.minStockLevel && item.currentStock > 0;
      } else if (stockLevelFilter === "OUT") {
        matchLevel = item.currentStock <= 0;
      } else if (stockLevelFilter === "IN") {
        matchLevel = item.currentStock > item.minStockLevel;
      }

      return matchSearch && matchLevel;
    });
  }, [items, searchQuery, stockLevelFilter]);

  // Filtered movements
  const filteredMovements = React.useMemo(() => {
    return movements.filter((m) => {
      const matchSearch =
        m.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.productSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = movementTypeFilter === "ALL" || m.type === movementTypeFilter;

      return matchSearch && matchType;
    });
  }, [movements, searchQuery, movementTypeFilter]);

  // Totals
  const totalValuation = items.reduce((sum, item) => sum + item.currentStock * item.costPrice, 0);
  const totalItemsCount = items.reduce((sum, item) => sum + item.currentStock, 0);
  const lowStockCount = items.filter((i) => i.currentStock <= i.minStockLevel && i.currentStock > 0).length;
  const outOfStockCount = items.filter((i) => i.currentStock <= 0).length;

  const handleOpenAdjust = (item?: InventoryItem) => {
    const prod = item || items[0];
    setSelectedProduct(prod || null);
    setAdjustForm({
      productId: prod?.id || "",
      quantityChange: 1,
      type: "ADJUSTMENT",
      notes: "",
    });
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.productId) {
      toastError("Please select a product");
      return;
    }
    if (!adjustForm.notes.trim()) {
      toastError("Reason / notes are required for inventory audits");
      return;
    }

    setIsSaving(true);
    try {
      const res = await adjustStockAction({
        productId: adjustForm.productId,
        locationId,
        quantityChange: Number(adjustForm.quantityChange),
        type: adjustForm.type,
        notes: adjustForm.notes,
      });

      if (!res.success) {
        toastError(res.error || "Failed to adjust stock", "Inventory Error");
        setIsSaving(false);
        return;
      }

      toastSuccess("Stock adjusted and immutable ledger entry recorded!", "Stock Updated");
      setIsAdjustModalOpen(false);

      // Update local state
      const delta = Number(adjustForm.quantityChange);
      setItems((prev) =>
        prev.map((it) => (it.id === adjustForm.productId ? { ...it, currentStock: it.currentStock + delta } : it))
      );

      const targetProd = items.find((i) => i.id === adjustForm.productId);
      if (targetProd && res.movement) {
        const newMov: MovementRecord = {
          id: res.movement.id,
          productName: targetProd.name,
          productSku: targetProd.sku,
          quantityChange: res.movement.quantityChange,
          previousQuantity: res.movement.previousQuantity,
          newQuantity: res.movement.newQuantity,
          type: res.movement.type,
          referenceType: res.movement.referenceType,
          referenceId: res.movement.referenceId,
          notes: res.movement.notes,
          userName: "You",
          createdAt: new Date().toISOString(),
        };
        setMovements((prev) => [newMov, ...prev]);
      }
    } catch (err: any) {
      toastError(err.message || "Error adjusting stock");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Inventory & Movement Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Active stock levels at <strong className="text-blue-400">{locationName}</strong> and complete immutable ledger of every stock transaction.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="primary" size="md" onClick={() => handleOpenAdjust()} className="font-bold">
            <Plus className="w-4 h-4" />
            Quick Adjust Stock
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase">Total Asset Value</span>
          <div className="text-xl font-bold text-white mt-1">
            {formatCurrency(totalValuation, "USD", currencySymbol)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase">Units in Stock</span>
          <div className="text-xl font-bold text-blue-400 mt-1">{totalItemsCount} pcs</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase">Low Stock Alerts</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{lowStockCount} items</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase">Out of Stock</span>
          <div className="text-xl font-bold text-rose-400 mt-1">{outOfStockCount} items</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("levels")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === "levels"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Boxes className="w-4 h-4" />
          Stock Levels ({items.length})
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === "ledger"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <History className="w-4 h-4" />
          Movement History Ledger ({movements.length})
        </button>
      </div>

      {/* TAB 1: STOCK LEVELS */}
      {activeTab === "levels" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <Input
              placeholder="Search product name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />

            <select
              value={stockLevelFilter}
              onChange={(e) => setStockLevelFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 text-slate-100 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN">Healthy Stock</option>
              <option value="LOW">Low Stock Alert</option>
              <option value="OUT">Out of Stock (0)</option>
            </select>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Product / SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Cost</th>
                    <th className="py-3 px-4 text-right">Asset Valuation</th>
                    <th className="py-3 px-4 text-center">Available Stock</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredItems.map((item) => {
                    const isOut = item.currentStock <= 0;
                    const isLow = item.currentStock <= item.minStockLevel && !isOut;
                    const itemValuation = item.currentStock * item.costPrice;

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-white">{item.name}</p>
                          <p className="text-[11px] font-mono text-slate-400">SKU: {item.sku}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{item.categoryName}</td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          {formatCurrency(item.costPrice, "USD", currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                          {formatCurrency(itemValuation, "USD", currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-sm">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={isOut ? "destructive" : isLow ? "warning" : "success"}
                            size="sm"
                          >
                            {isOut ? "Out of Stock" : isLow ? `Low Stock (Min: ${item.minStockLevel})` : "In Stock"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenAdjust(item)}
                            className="text-xs"
                          >
                            Adjust
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOVEMENT HISTORY LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <Input
              placeholder="Search product, SKU, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />

            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 text-slate-100 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Movement Types</option>
              <option value="PURCHASE">Purchases</option>
              <option value="SALE">Sales Deductions</option>
              <option value="RETURN">Customer Returns</option>
              <option value="ADJUSTMENT">Manual Adjustments</option>
              <option value="DAMAGED">Damaged / Written-Off</option>
              <option value="OPENING_STOCK">Opening Stock</option>
            </select>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4 text-center">Change</th>
                    <th className="py-3 px-4 text-center">Prev &rarr; New</th>
                    <th className="py-3 px-4">Staff / User</th>
                    <th className="py-3 px-4">Notes / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredMovements.map((m) => {
                    const isPositive = m.quantityChange > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-slate-400">{formatDateTime(m.createdAt)}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-white">{m.productName}</p>
                          <p className="text-[11px] font-mono text-slate-400">{m.productSku}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              m.type === "SALE"
                                ? "destructive"
                                : m.type === "PURCHASE" || m.type === "RETURN"
                                ? "success"
                                : m.type === "OPENING_STOCK"
                                ? "purple"
                                : "outline"
                            }
                            size="sm"
                          >
                            {m.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span
                            className={
                              isPositive ? "text-emerald-400" : "text-rose-400"
                            }
                          >
                            {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">
                          {m.previousQuantity} &rarr; <span className="font-bold text-white">{m.newQuantity}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{m.userName || "System"}</td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{m.notes || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADJUST STOCK MODAL */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Adjust Inventory Stock"
        description="Every stock adjustment is recorded in the immutable inventory ledger."
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
          <Select
            label="Product"
            value={adjustForm.productId}
            onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
          >
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name} (Current: {it.currentStock} {it.unit})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Adjustment Reason"
              value={adjustForm.type}
              onChange={(e: any) => setAdjustForm({ ...adjustForm, type: e.target.value })}
            >
              <option value="ADJUSTMENT">Manual Count Adjustment</option>
              <option value="DAMAGED">Damaged / Expired</option>
              <option value="RETURN">Supplier Return / Restock</option>
              <option value="OPENING_STOCK">Opening Stock Correction</option>
              <option value="TRANSFER">Inter-store Transfer</option>
            </Select>

            <Input
              label="Quantity Change (+ or -)"
              type="number"
              value={adjustForm.quantityChange}
              onChange={(e) =>
                setAdjustForm({ ...adjustForm, quantityChange: Number(e.target.value) })
              }
              helperText="Use positive for addition, negative for deduction."
            />
          </div>

          <Input
            label="Audit Notes / Explanation"
            required
            placeholder="e.g. Month-end physical stock count verified +5 units"
            value={adjustForm.notes}
            onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdjustModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving} className="font-bold">
              Record Adjustment &rarr;
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
