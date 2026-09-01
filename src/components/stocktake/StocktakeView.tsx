"use client";

import * as React from "react";
import {
  ClipboardCheck,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  History,
  RotateCcw,
  Sparkles,
  Camera,
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
  createStocktakeAction,
  updateStocktakeCountAction,
  completeStocktakeAction,
} from "@/actions/stocktake-actions";

export interface StocktakeRecord {
  id: string;
  title: string;
  status: string;
  totalItemsCount: number;
  totalVarianceCost: number;
  notes: string | null;
  createdAt: string | Date;
  completedAt: string | Date | null;
  location: { id: string; name: string };
  creator: { id: string; name: string } | null;
  items: Array<{
    id: string;
    productId: string;
    expectedStock: number;
    countedStock: number;
    variance: number;
    unitCost: number;
    varianceCost: number;
    product: {
      id: string;
      name: string;
      sku: string;
      barcode: string | null;
      unit: string;
      sellingPrice: number;
    };
  }>;
}

interface StocktakeViewProps {
  initialStocktakes: StocktakeRecord[];
  categories: Array<{ id: string; name: string }>;
  locationId: string;
  locationName: string;
  currencySymbol: string;
}

export function StocktakeView({
  initialStocktakes,
  categories,
  locationId,
  locationName,
  currencySymbol,
}: StocktakeViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [stocktakes, setStocktakes] = React.useState<StocktakeRecord[]>(initialStocktakes);
  const [activeSession, setActiveSession] = React.useState<StocktakeRecord | null>(
    initialStocktakes.find((s) => s.status === "DRAFT") || null
  );

  // Filters & Scanning
  const [searchQuery, setSearchQuery] = React.useState("");
  const [barcodeScanInput, setBarcodeScanInput] = React.useState("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState(`Cycle Count Audit - ${new Date().toLocaleDateString()}`);
  const [selectedCategory, setSelectedCategory] = React.useState("ALL");
  const [newNotes, setNewNotes] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  // Reconciliation Modal
  const [isReconcileModalOpen, setIsReconcileModalOpen] = React.useState(false);
  const [reconcileNotes, setReconcileNotes] = React.useState("");
  const [isReconciling, setIsReconciling] = React.useState(false);

  // Filtered items in active session
  const filteredActiveItems = React.useMemo(() => {
    if (!activeSession) return [];
    return activeSession.items.filter((item) => {
      const q = searchQuery.toLowerCase();
      return (
        item.product.name.toLowerCase().includes(q) ||
        item.product.sku.toLowerCase().includes(q) ||
        (item.product.barcode && item.product.barcode.includes(q))
      );
    });
  }, [activeSession, searchQuery]);

  // Handle Barcode Scan Quick Increment
  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !barcodeScanInput.trim()) return;

    const query = barcodeScanInput.trim();
    const item = activeSession.items.find(
      (i) => i.product.barcode === query || i.product.sku.toLowerCase() === query.toLowerCase()
    );

    if (!item) {
      toastError(`No item matching barcode/SKU "${query}" in this cycle count.`);
      setBarcodeScanInput("");
      return;
    }

    const newCount = item.countedStock + 1;
    await handleUpdateItemCount(item.productId, newCount);
    toastSuccess(`Counted: ${item.product.name} (Total: ${newCount})`, "Item Scanned");
    setBarcodeScanInput("");
  };

  const handleUpdateItemCount = async (productId: string, newCount: number) => {
    if (!activeSession) return;
    const count = Math.max(0, newCount);

    try {
      const res = await updateStocktakeCountAction(activeSession.id, productId, count);
      if (!res.success) {
        toastError(res.error || "Failed to update item count");
        return;
      }

      const updatedItems = activeSession.items.map((i) => {
        if (i.productId === productId) {
          const variance = count - i.expectedStock;
          const varianceCost = variance * i.unitCost;
          return { ...i, countedStock: count, variance, varianceCost };
        }
        return i;
      });

      const totalVarianceCost = updatedItems.reduce((sum, i) => sum + i.varianceCost, 0);
      const updatedSession = { ...activeSession, items: updatedItems, totalVarianceCost };

      setActiveSession(updatedSession);
      setStocktakes(stocktakes.map((s) => (s.id === activeSession.id ? updatedSession : s)));
    } catch (err: any) {
      toastError(err.message || "Error updating count");
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const res = await createStocktakeAction(
        locationId,
        newTitle,
        selectedCategory === "ALL" ? undefined : selectedCategory,
        newNotes || undefined
      );

      if (!res.success) {
        toastError(res.error || "Failed to start stocktake");
        setIsCreating(false);
        return;
      }

      toastSuccess("Cycle count stocktake session started!", "Session Started");
      setActiveSession(res.stocktake as any);
      setStocktakes([res.stocktake as any, ...stocktakes]);
      setIsCreateOpen(false);
      setNewNotes("");
    } catch (err: any) {
      toastError(err.message || "Error starting stocktake");
    } finally {
      setIsCreating(false);
    }
  };

  const handleReconcile = async () => {
    if (!activeSession) return;
    setIsReconciling(true);

    try {
      const res = await completeStocktakeAction(activeSession.id, reconcileNotes || undefined);
      if (!res.success || !res.stocktake) {
        toastError(res.error || "Failed to reconcile stocktake");
        setIsReconciling(false);
        return;
      }

      toastSuccess("Stocktake completed and inventory atomically adjusted!", "Reconciliation Complete");
      setIsReconcileModalOpen(false);
      setActiveSession(null);
      setStocktakes(stocktakes.map((s) => (s.id === res.stocktake!.id ? (res.stocktake as any) : s)));
      setReconcileNotes("");
    } catch (err: any) {
      toastError(err.message || "Error reconciling stocktake");
    } finally {
      setIsReconciling(false);
    }
  };

  // Stats for active session
  const totalCountedItems = activeSession
    ? activeSession.items.filter((i) => i.countedStock !== i.expectedStock).length
    : 0;
  const netVarianceCost = activeSession ? activeSession.totalVarianceCost : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Stocktake & Cycle Count Studio
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ClipboardCheck className="w-3 h-3 text-purple-400" />
              Cycle Count
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Perform physical inventory audits, barcode scanning counts, and automatic variance ledger reconciliation for {locationName}.
          </p>
        </div>

        {!activeSession ? (
          <Button
            variant="primary"
            size="md"
            className="gap-2 font-bold shadow-lg shadow-blue-500/20"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Start New Stocktake
          </Button>
        ) : (
          <Button
            variant="success"
            size="md"
            className="gap-2 font-bold shadow-lg shadow-emerald-500/20"
            onClick={() => setIsReconcileModalOpen(true)}
          >
            <CheckCircle2 className="w-4 h-4" />
            Commit & Reconcile Stock
          </Button>
        )}
      </div>

      {/* Active Session Studio */}
      {activeSession ? (
        <div className="space-y-4">
          {/* Active Session Control Card */}
          <Card className="border-purple-500/40 bg-gradient-to-r from-purple-950/20 via-slate-900 to-slate-900 shadow-xl shadow-purple-500/5">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base text-white">{activeSession.title}</CardTitle>
                    <Badge variant="purple" size="sm">IN PROGRESS</Badge>
                  </div>
                  <CardDescription>
                    Started: {formatDateTime(activeSession.createdAt)} • {activeSession.items.length} products to audit
                  </CardDescription>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Discrepancy Valuation
                    </span>
                    <span
                      className={`text-xl font-black ${
                        netVarianceCost < 0
                          ? "text-rose-400"
                          : netVarianceCost > 0
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }`}
                    >
                      {netVarianceCost > 0 ? "+" : ""}
                      {formatCurrency(netVarianceCost, "USD", currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              {/* Rapid Barcode Scanner Wedge & Search */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <form onSubmit={handleBarcodeScan} className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <Input
                    placeholder="Scan Barcode / SKU to count (+1)..."
                    value={barcodeScanInput}
                    onChange={(e) => setBarcodeScanInput(e.target.value)}
                    className="pl-9 font-mono border-purple-500/40 focus:border-purple-400 bg-slate-950/80"
                    autoFocus
                  />
                </form>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Filter products by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Count Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Product / SKU</th>
                      <th className="py-3 px-4">Barcode</th>
                      <th className="py-3 px-4 text-right">Unit Cost</th>
                      <th className="py-3 px-4 text-center">Expected Stock</th>
                      <th className="py-3 px-4 text-center">Physical Count</th>
                      <th className="py-3 px-4 text-right">Variance</th>
                      <th className="py-3 px-4 text-right">Cost Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredActiveItems.map((item) => {
                      const hasDiscrepancy = item.variance !== 0;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-800/30 transition-colors ${
                            hasDiscrepancy ? "bg-purple-950/10" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <p className="font-bold text-white">{item.product.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">SKU: {item.product.sku}</p>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {item.product.barcode || "-"}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-300">
                            {formatCurrency(item.unitCost, "USD", currencySymbol)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 font-bold text-slate-200">
                              {item.expectedStock} {item.product.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center"
                                onClick={() => handleUpdateItemCount(item.productId, item.countedStock - 1)}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                className="w-16 h-7 text-center rounded-lg bg-slate-950 border border-slate-700 font-bold text-white text-xs focus:border-purple-500 focus:outline-none"
                                value={item.countedStock}
                                onChange={(e) =>
                                  handleUpdateItemCount(item.productId, parseInt(e.target.value) || 0)
                                }
                              />
                              <button
                                type="button"
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center"
                                onClick={() => handleUpdateItemCount(item.productId, item.countedStock + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-bold">
                            {item.variance === 0 ? (
                              <span className="text-slate-400 font-medium">0</span>
                            ) : item.variance > 0 ? (
                              <span className="text-emerald-400">+{item.variance} (Overage)</span>
                            ) : (
                              <span className="text-rose-400">{item.variance} (Shrinkage)</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold">
                            {item.varianceCost === 0 ? (
                              <span className="text-slate-400">$0.00</span>
                            ) : item.varianceCost > 0 ? (
                              <span className="text-emerald-400">
                                +{formatCurrency(item.varianceCost, "USD", currencySymbol)}
                              </span>
                            ) : (
                              <span className="text-rose-400">
                                {formatCurrency(item.varianceCost, "USD", currencySymbol)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Historical Stocktakes */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Cycle Count Audits</CardTitle>
          <CardDescription>Past physical count reconciliations and variance summaries</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stocktakes.filter((s) => s.status !== "DRAFT").length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No completed stocktake audits recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-y border-slate-800 bg-slate-900/40 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Audit Title</th>
                    <th className="py-3 px-4">Date Completed</th>
                    <th className="py-3 px-4">Audited By</th>
                    <th className="py-3 px-4 text-center">Items Audited</th>
                    <th className="py-3 px-4 text-right">Variance Impact</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stocktakes
                    .filter((s) => s.status !== "DRAFT")
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{s.title}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {s.completedAt ? formatDateTime(s.completedAt) : formatDateTime(s.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{s.creator?.name || "Staff"}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-200">
                          {s.totalItemsCount} items
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          <span
                            className={
                              s.totalVarianceCost < 0
                                ? "text-rose-400"
                                : s.totalVarianceCost > 0
                                ? "text-emerald-400"
                                : "text-slate-300"
                            }
                          >
                            {s.totalVarianceCost > 0 ? "+" : ""}
                            {formatCurrency(s.totalVarianceCost, "USD", currencySymbol)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="success" size="sm">COMPLETED</Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Stocktake Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Start Inventory Cycle Count Audit"
        description="Initialize a snapshot of current stock levels for physical barcode counting."
        size="md"
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          <Input
            label="Audit Session Title *"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Product Category (optional)"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            options={[
              { value: "ALL", label: "All Categories (Full Store Audit)" },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Input
            label="Audit Notes / Reason"
            placeholder="e.g. Monthly cycle count, end-of-month stock check"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
          />

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
              isLoading={isCreating}
              className="gap-1.5 font-bold"
            >
              <ClipboardCheck className="w-4 h-4" />
              Begin Cycle Count
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reconcile Modal */}
      <Modal
        isOpen={isReconcileModalOpen}
        onClose={() => setIsReconcileModalOpen(false)}
        title="Reconcile & Apply Stock Adjustments"
        description="This will automatically update on-hand inventory levels to match your physical count and write immutable ledger adjustment movements."
        size="md"
      >
        {activeSession && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Total Items in Audit:</span>
                <span className="font-bold text-white">{activeSession.items.length}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Items with Discrepancy:</span>
                <span className="font-bold text-amber-400">
                  {activeSession.items.filter((i) => i.variance !== 0).length} items
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                <span className="text-white">Net Valuation Variance:</span>
                <span
                  className={
                    activeSession.totalVarianceCost < 0
                      ? "text-rose-400"
                      : activeSession.totalVarianceCost > 0
                      ? "text-emerald-400"
                      : "text-slate-300"
                  }
                >
                  {activeSession.totalVarianceCost > 0 ? "+" : ""}
                  {formatCurrency(activeSession.totalVarianceCost, "USD", currencySymbol)}
                </span>
              </div>
            </div>

            <Input
              label="Reconciliation Notes (optional)"
              placeholder="e.g. Approved by Store Manager after verification"
              value={reconcileNotes}
              onChange={(e) => setReconcileNotes(e.target.value)}
            />

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsReconcileModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="success"
                size="md"
                isLoading={isReconciling}
                className="gap-1.5 font-bold"
                onClick={handleReconcile}
              >
                <CheckCircle2 className="w-4 h-4" />
                Commit Reconciliation
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
