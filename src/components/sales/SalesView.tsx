"use client";

import * as React from "react";
import {
  Search,
  Receipt,
  RotateCcw,
  Printer,
  Calendar,
  User,
  CreditCard,
  Eye,
  Filter,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { refundSaleAction } from "@/actions/sales-actions";

export interface SaleRecord {
  id: string;
  receiptNumber: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string | Date;
  notes: string | null;
  customer: { id: string; name: string; phone: string | null; email: string | null } | null;
  cashier: { id: string; name: string } | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    subtotal: number;
    total: number;
    product: { id: string; name: string; sku: string };
  }>;
  refunds: Array<{
    id: string;
    refundNumber: string;
    totalRefundAmount: number;
    reason: string | null;
    createdAt: string | Date;
    items: Array<{ id: string; saleItemId: string; quantity: number; refundAmount: number; restocked: boolean }>;
  }>;
}

interface SalesViewProps {
  initialSales: SaleRecord[];
  currencySymbol: string;
  businessName: string;
  canProcessRefunds: boolean;
}

export function SalesView({
  initialSales,
  currencySymbol,
  businessName,
  canProcessRefunds,
}: SalesViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [sales, setSales] = React.useState<SaleRecord[]>(initialSales);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = React.useState<string>("ALL");

  // Selected sale for detail drawer / receipt reprint
  const [selectedSale, setSelectedSale] = React.useState<SaleRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);

  // Refund modal state
  const [isRefundOpen, setIsRefundOpen] = React.useState(false);
  const [refundReason, setRefundReason] = React.useState("Customer return / Defective item");
  const [refundItemsState, setRefundItemsState] = React.useState<
    Array<{
      saleItemId: string;
      productId: string;
      name: string;
      maxQty: number;
      quantity: number;
      unitPrice: number;
      restock: boolean;
    }>
  >([]);
  const [isProcessingRefund, setIsProcessingRefund] = React.useState(false);

  // Filtered sales list
  const filteredSales = React.useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.customer && s.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.cashier && s.cashier.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
      const matchPayment = paymentFilter === "ALL" || s.paymentMethod === paymentFilter;

      return matchSearch && matchStatus && matchPayment;
    });
  }, [sales, searchQuery, statusFilter, paymentFilter]);

  const handleOpenDetail = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setIsDetailOpen(true);
  };

  const handleOpenReceipt = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setIsReceiptOpen(true);
  };

  const handleOpenRefund = (sale: SaleRecord) => {
    if (!canProcessRefunds) {
      toastError("You do not have permission to process refunds", "Unauthorized");
      return;
    }

    setSelectedSale(sale);

    // Calculate remaining refundable quantity per line item
    const itemsInit = sale.items.map((item) => {
      const alreadyRefunded = sale.refunds
        .flatMap((r) => r.items)
        .filter((ri) => ri.saleItemId === item.id)
        .reduce((sum, ri) => sum + ri.quantity, 0);

      const maxRefundable = Math.max(0, item.quantity - alreadyRefunded);

      return {
        saleItemId: item.id,
        productId: item.productId,
        name: item.product.name,
        maxQty: maxRefundable,
        quantity: maxRefundable > 0 ? 1 : 0,
        unitPrice: item.unitPrice,
        restock: true,
      };
    });

    setRefundItemsState(itemsInit);
    setIsRefundOpen(true);
  };

  const handleProcessRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    const itemsToRefund = refundItemsState
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        saleItemId: item.saleItemId,
        productId: item.productId,
        quantity: item.quantity,
        refundAmount: item.quantity * item.unitPrice,
        restocked: item.restock,
      }));

    if (itemsToRefund.length === 0) {
      toastError("Select at least one item quantity to refund", "No items selected");
      return;
    }

    setIsProcessingRefund(true);

    try {
      const res = await refundSaleAction({
        saleId: selectedSale.id,
        reason: refundReason,
        items: itemsToRefund,
      });

      if (!res.success) {
        toastError(res.error || "Failed to process refund", "Refund Error");
        setIsProcessingRefund(false);
        return;
      }

      toastSuccess("Refund processed and inventory updated!", "Refund Complete");
      setIsRefundOpen(false);
      setIsDetailOpen(false);

      // Update local state
      setSales((prev) =>
        prev.map((s) =>
          s.id === selectedSale.id
            ? { ...s, status: s.status === "COMPLETED" ? "PARTIALLY_REFUNDED" : s.status }
            : s
        )
      );
    } catch (err: any) {
      toastError(err.message || "An unexpected error occurred", "Error");
    } finally {
      setIsProcessingRefund(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Sales & Transactions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Full ledger of customer purchases, payment methods, receipts, and refund processing.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <Input
          placeholder="Search by receipt #, customer, cashier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700/80 text-slate-100 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
          <option value="REFUNDED">Fully Refunded</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700/80 text-slate-100 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Payment Methods</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="MOBILE_MONEY">Mobile Money</option>
        </select>
      </div>

      {/* Sales Data Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-blue-400" />
                    {sale.receiptNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{formatDateTime(sale.createdAt)}</td>
                  <td className="py-3 px-4 font-medium text-slate-200">
                    {sale.customer?.name || <span className="text-slate-500">Walk-in</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-300">{sale.cashier?.name || "System"}</td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" size="sm">
                      {sale.paymentMethod}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        sale.status === "COMPLETED"
                          ? "success"
                          : sale.status === "PARTIALLY_REFUNDED"
                          ? "warning"
                          : "destructive"
                      }
                      size="sm"
                    >
                      {sale.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-sm text-emerald-400">
                    {formatCurrency(sale.totalAmount, "USD", currencySymbol)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDetail(sale)}
                        title="View Sale Breakdown"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenReceipt(sale)}
                        title="Print / View Receipt"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-400" />
                      </Button>
                      {canProcessRefunds && sale.status !== "REFUNDED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenRefund(sale)}
                          title="Process Itemized Refund"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No sales transactions match your current search and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedSale && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Sale Details: ${selectedSale.receiptNumber}`}
          description={`Created on ${formatDateTime(selectedSale.createdAt)}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Meta info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Cashier</span>
                <span className="font-semibold text-white">{selectedSale.cashier?.name || "System"}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Customer</span>
                <span className="font-semibold text-white">{selectedSale.customer?.name || "Walk-in"}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Payment Method</span>
                <span className="font-semibold text-white">{selectedSale.paymentMethod}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Status</span>
                <Badge variant={selectedSale.status === "COMPLETED" ? "success" : "warning"} size="sm">
                  {selectedSale.status}
                </Badge>
              </div>
            </div>

            {/* Items table */}
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-800/80 text-slate-400">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedSale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5">
                        <p className="font-bold text-white">{item.product.name}</p>
                        <p className="text-[10px] text-slate-500">SKU: {item.product.sku}</p>
                      </td>
                      <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                      <td className="p-2.5 text-right">
                        {formatCurrency(item.unitPrice, "USD", currencySymbol)}
                      </td>
                      <td className="p-2.5 text-right font-bold text-emerald-400">
                        {formatCurrency(item.total, "USD", currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals breakdown */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedSale.subtotal, "USD", currencySymbol)}</span>
              </div>
              {selectedSale.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount:</span>
                  <span>-{formatCurrency(selectedSale.discountAmount, "USD", currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Tax:</span>
                <span>{formatCurrency(selectedSale.taxAmount, "USD", currencySymbol)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-white pt-1 border-t border-slate-800">
                <span>Total:</span>
                <span className="text-emerald-400">
                  {formatCurrency(selectedSale.totalAmount, "USD", currencySymbol)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsDetailOpen(false);
                  setIsReceiptOpen(true);
                }}
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Reprint Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* RECEIPT PREVIEW & PRINT MODAL */}
      {selectedSale && (
        <Modal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          title="Printable Receipt"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div
              id="printable-receipt"
              className="bg-white text-black p-6 rounded-lg font-mono text-xs space-y-3 border border-slate-300"
            >
              <div className="text-center space-y-1 pb-2 border-b border-dashed border-gray-400">
                <h2 className="font-bold text-base tracking-tight">{businessName}</h2>
                <p className="text-[10px] text-gray-700 font-bold mt-1">
                  RECEIPT: #{selectedSale.receiptNumber}
                </p>
                <p className="text-[9px] text-gray-500">{formatDateTime(selectedSale.createdAt)}</p>
                <p className="text-[9px] text-gray-500">Cashier: {selectedSale.cashier?.name || "Staff"}</p>
                {selectedSale.customer && (
                  <p className="text-[9px] text-gray-600">Customer: {selectedSale.customer.name}</p>
                )}
              </div>

              <div className="space-y-1.5 py-2 border-b border-dashed border-gray-400 text-[11px]">
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate max-w-[160px]">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="font-semibold">{formatCurrency(item.total, "USD", currencySymbol)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedSale.subtotal, "USD", currencySymbol)}</span>
                </div>
                {selectedSale.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedSale.discountAmount, "USD", currencySymbol)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(selectedSale.taxAmount, "USD", currencySymbol)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-400">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(selectedSale.totalAmount, "USD", currencySymbol)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-gray-400 text-[10px] text-gray-600">
                <p>Thank you for shopping with us!</p>
              </div>
            </div>

            <Button variant="primary" size="md" onClick={() => window.print()} className="w-full font-bold">
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </Modal>
      )}

      {/* REFUND MODAL */}
      {selectedSale && (
        <Modal
          isOpen={isRefundOpen}
          onClose={() => setIsRefundOpen(false)}
          title={`Process Refund: ${selectedSale.receiptNumber}`}
          description="Select return items, restock status, and reason"
          maxWidth="lg"
        >
          <form onSubmit={handleProcessRefundSubmit} className="space-y-4 text-xs">
            <Input
              label="Refund Reason / Notes"
              required
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Defective item, customer changed mind"
            />

            <div className="space-y-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Select Items to Refund
              </span>

              {refundItemsState.map((item, idx) => (
                <div
                  key={item.saleItemId}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <p className="font-bold text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-400">
                      Unit Price: {formatCurrency(item.unitPrice, "USD", currencySymbol)} • Max Refundable:{" "}
                      {item.maxQty}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-20">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Refund Qty</label>
                      <input
                        type="number"
                        min="0"
                        max={item.maxQty}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRefundItemsState((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                          );
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-center font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-1 pt-3">
                      <input
                        type="checkbox"
                        id={`restock-${idx}`}
                        checked={item.restock}
                        onChange={(e) => {
                          const chk = e.target.checked;
                          setRefundItemsState((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, restock: chk } : it))
                          );
                        }}
                        className="rounded bg-slate-900 border-slate-700"
                      />
                      <label htmlFor={`restock-${idx}`} className="text-[11px] text-slate-300">
                        Restock
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="submit"
              variant="destructive"
              size="md"
              className="w-full font-bold mt-2"
              isLoading={isProcessingRefund}
            >
              Confirm Refund & Restock Inventory &rarr;
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
