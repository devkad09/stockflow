"use client";

import * as React from "react";
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  PackageCheck,
  Clock,
  Building,
  DollarSign,
  Eye,
  Trash2,
  Sparkles,
  AlertTriangle,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  createPurchaseOrderAction,
  receivePurchaseStockAction,
  updatePOStatusAction,
  getLowStockReorderSuggestionsAction,
  autoGeneratePOsAction,
} from "@/actions/purchase-actions";

export interface POItem {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: string;
  subtotal: number;
  totalAmount: number;
  expectedDeliveryDate: string | null;
  notes: string | null;
  creatorName: string;
  createdAt: string | Date;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
    subtotal: number;
  }>;
}

export interface SupplierOption {
  id: string;
  name: string;
}

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
}

interface PurchasesViewProps {
  initialPOs: POItem[];
  suppliers: SupplierOption[];
  products: ProductOption[];
  currencySymbol: string;
  locationId: string;
}

export function PurchasesView({
  initialPOs,
  suppliers,
  products,
  currencySymbol,
  locationId,
}: PurchasesViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [pos, setPOs] = React.useState<POItem[]>(initialPOs);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Create PO Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [supplierId, setSupplierId] = React.useState(suppliers[0]?.id || "");
  const [expectedDate, setExpectedDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [poLines, setPoLines] = React.useState<
    Array<{ productId: string; quantityOrdered: number; unitCost: number }>
  >([{ productId: products[0]?.id || "", quantityOrdered: 10, unitCost: products[0]?.costPrice || 0 }]);
  const [isCreating, setIsCreating] = React.useState(false);

  // Receive Modal State
  const [selectedPO, setSelectedPO] = React.useState<POItem | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = React.useState(false);
  const [receiveQtys, setReceiveQtys] = React.useState<Record<string, number>>({});
  const [isReceiving, setIsReceiving] = React.useState(false);

  // Smart Reorder Modal State
  const [isSmartReorderOpen, setIsSmartReorderOpen] = React.useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
  const [reorderSuggestions, setReorderSuggestions] = React.useState<any>(null);
  const [isAutoGenerating, setIsAutoGenerating] = React.useState(false);

  const filteredPOs = React.useMemo(() => {
    return pos.filter((p) => {
      const matchSearch =
        p.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [pos, searchQuery, statusFilter]);

  const handleAddLine = () => {
    if (products.length === 0) return;
    setPoLines((prev) => [
      ...prev,
      { productId: products[0].id, quantityOrdered: 10, unitCost: products[0].costPrice },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setPoLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toastError("Please select a supplier");
      return;
    }
    if (poLines.length === 0) {
      toastError("Add at least one item line to purchase order");
      return;
    }

    setIsCreating(true);
    try {
      const res = await createPurchaseOrderAction({
        supplierId,
        locationId,
        expectedDeliveryDate: expectedDate || null,
        notes: notes || null,
        items: poLines,
      });

      if (!res.success) {
        toastError(res.error || "Failed to create PO");
        setIsCreating(false);
        return;
      }

      toastSuccess(`Purchase Order created successfully!`);
      setIsCreateModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || "Error creating PO");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenReceive = (po: POItem) => {
    setSelectedPO(po);
    const initialRec: Record<string, number> = {};
    po.items.forEach((item) => {
      const pending = Math.max(0, item.quantityOrdered - item.quantityReceived);
      initialRec[item.id] = pending;
    });
    setReceiveQtys(initialRec);
    setIsReceiveModalOpen(true);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    const payloadItems = Object.entries(receiveQtys)
      .map(([poItemId, qty]) => ({ poItemId, quantityToReceive: Number(qty) }))
      .filter((i) => i.quantityToReceive > 0);

    if (payloadItems.length === 0) {
      toastError("Specify quantity to receive");
      return;
    }

    setIsReceiving(true);
    try {
      const res = await receivePurchaseStockAction({
        purchaseOrderId: selectedPO.id,
        receivedItems: payloadItems,
      });

      if (!res.success) {
        toastError(res.error || "Failed to receive stock");
        setIsReceiving(false);
        return;
      }

      toastSuccess("Stock received & automatically added to inventory!", "Inventory Restocked");
      setIsReceiveModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || "Error receiving PO");
    } finally {
      setIsReceiving(false);
    }
  };

  // Open Smart Reorder
  const handleOpenSmartReorder = async () => {
    setIsSmartReorderOpen(true);
    setIsLoadingSuggestions(true);
    try {
      const res = await getLowStockReorderSuggestionsAction(locationId);
      if (res.success) {
        setReorderSuggestions(res);
      } else {
        toastError(res.error || "Failed to fetch reorder suggestions");
      }
    } catch (err: any) {
      toastError(err.message || "Error scanning low stock");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleAutoGeneratePOs = async () => {
    if (!reorderSuggestions || !reorderSuggestions.groupedSuppliers) return;
    setIsAutoGenerating(true);

    try {
      const orders = reorderSuggestions.groupedSuppliers
        .filter((g: any) => g.supplier.id !== "UNASSIGNED")
        .map((g: any) => ({
          supplierId: g.supplier.id,
          items: g.items.map((item: any) => ({
            productId: item.product.id,
            quantityOrdered: item.suggestedQty,
            unitCost: item.product.costPrice,
          })),
        }));

      if (orders.length === 0) {
        toastError("No suppliers assigned to low-stock items");
        setIsAutoGenerating(false);
        return;
      }

      const res = await autoGeneratePOsAction({ locationId, orders });
      if (!res.success) {
        toastError(res.error || "Failed to auto-generate POs");
        setIsAutoGenerating(false);
        return;
      }

      toastSuccess(`Successfully generated ${res.count} Purchase Orders!`, "POs Auto-Generated");
      setIsSmartReorderOpen(false);
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || "Error generating POs");
    } finally {
      setIsAutoGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Purchase Orders & Receiving
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Order stock from wholesale suppliers and automatically increment inventory on delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={handleOpenSmartReorder}
            className="gap-2 font-bold border-indigo-500/30 text-indigo-300 hover:text-white"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Smart Reorder (Low Stock)
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            className="font-bold gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Purchase Order
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <Input
          placeholder="Search PO # or supplier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700/80 text-slate-100 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Order Statuses</option>
          <option value="ORDERED">Ordered</option>
          <option value="PARTIALLY_RECEIVED">Partially Received</option>
          <option value="RECEIVED">Received in Full</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      {/* POs List */}
      {filteredPOs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400">
          <Truck className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="font-bold text-white text-base">No Purchase Orders Found</p>
          <p className="text-xs mt-1 text-slate-500">
            Create a purchase order to record inbound supplier stock or use the Smart Reorder assistant.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPOs.map((po) => {
            const isFullReceived = po.status === "RECEIVED";
            const isPartial = po.status === "PARTIALLY_RECEIVED";
            const totalOrdered = po.items.reduce((sum, i) => sum + i.quantityOrdered, 0);
            const totalReceived = po.items.reduce((sum, i) => sum + i.quantityReceived, 0);

            return (
              <div
                key={po.id}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all space-y-4 shadow-lg shadow-black/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-white font-mono">{po.orderNumber}</span>
                      <Badge
                        variant={isFullReceived ? "success" : isPartial ? "warning" : "default"}
                        size="sm"
                      >
                        {po.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      Supplier: <span className="font-bold text-slate-200">{po.supplierName}</span> • Created: {formatDateTime(po.createdAt)} by {po.creatorName}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total PO Cost</span>
                      <span className="text-lg font-black text-white">
                        {formatCurrency(po.totalAmount, "USD", currencySymbol)}
                      </span>
                    </div>

                    {!isFullReceived && (
                      <Button
                        variant="success"
                        size="sm"
                        className="gap-1.5 font-bold shadow-md shadow-emerald-500/20"
                        onClick={() => handleOpenReceive(po)}
                      >
                        <PackageCheck className="w-4 h-4" />
                        Receive Stock
                      </Button>
                    )}
                  </div>
                </div>

                {/* Items Summary Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800/60 text-[10px] uppercase">
                        <th className="pb-2">Product</th>
                        <th className="pb-2">SKU</th>
                        <th className="pb-2 text-right">Unit Cost</th>
                        <th className="pb-2 text-center">Ordered</th>
                        <th className="pb-2 text-center">Received</th>
                        <th className="pb-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {po.items.map((item) => (
                        <tr key={item.id} className="text-slate-300">
                          <td className="py-2 font-medium text-white">{item.productName}</td>
                          <td className="py-2 font-mono text-slate-400">{item.productSku}</td>
                          <td className="py-2 text-right">{formatCurrency(item.unitCost, "USD", currencySymbol)}</td>
                          <td className="py-2 text-center font-bold text-slate-200">{item.quantityOrdered}</td>
                          <td className="py-2 text-center font-bold text-emerald-400">
                            {item.quantityReceived} / {item.quantityOrdered}
                          </td>
                          <td className="py-2 text-right font-medium text-white">
                            {formatCurrency(item.subtotal, "USD", currencySymbol)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {po.notes && (
                  <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-800/40">
                    Notes: {po.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PO MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Wholesale Purchase Order"
        description="Select supplier and specify line items to place an order."
        size="lg"
      >
        <form onSubmit={handleCreatePOSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Supplier *"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            />

            <Input
              label="Expected Delivery Date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>

          {/* Line Items */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-300">Order Line Items</span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                <Plus className="w-3 h-3 mr-1" /> Add Product
              </Button>
            </div>

            {poLines.map((line, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 items-end"
              >
                <div className="col-span-5">
                  <label className="text-[10px] text-slate-400 block mb-1">Product</label>
                  <select
                    value={line.productId}
                    onChange={(e) => {
                      const pId = e.target.value;
                      const prod = products.find((p) => p.id === pId);
                      setPoLines((prev) =>
                        prev.map((l, i) =>
                          i === idx ? { ...l, productId: pId, unitCost: prod?.costPrice || 0 } : l
                        )
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <label className="text-[10px] text-slate-400 block mb-1">Qty Ordered</label>
                  <input
                    type="number"
                    min="1"
                    value={line.quantityOrdered}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPoLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, quantityOrdered: val } : l))
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-bold"
                  />
                </div>

                <div className="col-span-3">
                  <label className="text-[10px] text-slate-400 block mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={line.unitCost}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPoLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, unitCost: val } : l))
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                  />
                </div>

                <div className="col-span-1 flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    disabled={poLines.length === 1}
                    className="text-rose-400 hover:text-rose-300 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Input
            label="Notes / Supplier Instructions"
            placeholder="e.g. Net 30 payment terms, express air freight"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isCreating} className="font-bold">
              Submit Purchase Order &rarr;
            </Button>
          </div>
        </form>
      </Modal>

      {/* RECEIVE STOCK MODAL */}
      {selectedPO && (
        <Modal
          isOpen={isReceiveModalOpen}
          onClose={() => setIsReceiveModalOpen(false)}
          title={`Receive Stock: ${selectedPO.orderNumber}`}
          description={`Supplier: ${selectedPO.supplierName}. Received units will immediately increment inventory.`}
          size="lg"
        >
          <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
            <div className="space-y-3">
              {selectedPO.items.map((item) => {
                const remaining = Math.max(0, item.quantityOrdered - item.quantityReceived);
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-white">{item.productName}</p>
                      <p className="text-[11px] text-slate-400">
                        Ordered: {item.quantityOrdered} • Already Received: {item.quantityReceived}
                      </p>
                    </div>

                    <div className="w-28">
                      <label className="text-[10px] text-slate-400 block mb-0.5">
                        Units Received Now
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        value={receiveQtys[item.id] || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setReceiveQtys((prev) => ({ ...prev, [item.id]: val }));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold text-center"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="submit"
              variant="success"
              size="lg"
              className="w-full font-bold"
              isLoading={isReceiving}
            >
              Confirm Received Stock & Update Inventory &rarr;
            </Button>
          </form>
        </Modal>
      )}

      {/* SMART REORDER ASSISTANT MODAL */}
      <Modal
        isOpen={isSmartReorderOpen}
        onClose={() => setIsSmartReorderOpen(false)}
        title="Smart Low-Stock Reorder Assistant"
        description="Automatically scanned items with on-hand inventory below minimum safety stock levels."
        size="xl"
      >
        <div className="space-y-4 text-xs">
          {isLoadingSuggestions ? (
            <div className="p-12 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-slate-300 font-bold">Scanning warehouse inventory levels...</p>
            </div>
          ) : !reorderSuggestions || reorderSuggestions.totalLowStockCount === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">All Stock Levels Optimal</h3>
              <p className="text-xs text-slate-400">
                No items are currently below their minimum threshold.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <div>
                    <span className="font-bold text-white text-sm">
                      {reorderSuggestions.totalLowStockCount} items require replenishment
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Grouped across {reorderSuggestions.groupedSuppliers.length} suppliers
                    </p>
                  </div>
                </div>
              </div>

              {/* Grouped by Supplier List */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {reorderSuggestions.groupedSuppliers.map((g: any, gIdx: number) => (
                  <div key={gIdx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-400" />
                        <span className="font-bold text-white text-sm">{g.supplier.name}</span>
                        <Badge variant="outline" size="sm">
                          {g.items.length} items
                        </Badge>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Est. PO Cost</span>
                        <span className="font-bold text-emerald-400">
                          {formatCurrency(g.totalCost, "USD", currencySymbol)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {g.items.map((item: any) => (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-white">{item.product.name}</span>
                            <p className="text-[10px] text-slate-400">
                              Stock: {item.currentStock} / Min: {item.minStockLevel} {item.product.unit}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-indigo-300">
                              Reorder: +{item.suggestedQty} {item.product.unit}
                            </span>
                            <p className="text-[10px] text-slate-400">
                              @{formatCurrency(item.product.costPrice, "USD", currencySymbol)}/unit
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setIsSmartReorderOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="gap-1.5 font-bold shadow-lg shadow-indigo-500/20"
                  isLoading={isAutoGenerating}
                  onClick={handleAutoGeneratePOs}
                >
                  <Sparkles className="w-4 h-4" />
                  Auto-Generate Purchase Orders &rarr;
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
