"use client";

import * as React from "react";
import {
  Banknote,
  DollarSign,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  History,
  Lock,
  Unlock,
  CreditCard,
  Layers,
  Sparkles,
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
  openShiftAction,
  recordCashMovementAction,
  closeShiftAction,
} from "@/actions/shift-actions";

export interface ShiftItem {
  id: string;
  shiftNumber: string;
  openedAt: string | Date;
  closedAt: string | Date | null;
  openingFloat: number;
  cashSales: number;
  cardSales: number;
  otherSales: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCash: number | null;
  difference: number | null;
  status: string;
  notes: string | null;
  cashier: { id: string; name: string; email: string };
  location: { id: string; name: string };
  cashMovements: Array<{
    id: string;
    type: string;
    amount: number;
    reason: string;
    createdAt: string | Date;
  }>;
  sales: Array<{ id: string; totalAmount: number; paymentMethod: string }>;
}

interface ShiftsViewProps {
  initialShifts: ShiftItem[];
  activeShift: ShiftItem | null;
  locationId: string;
  locationName: string;
  currencySymbol: string;
}

export function ShiftsView({
  initialShifts,
  activeShift: initialActiveShift,
  locationId,
  locationName,
  currencySymbol,
}: ShiftsViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [shifts, setShifts] = React.useState<ShiftItem[]>(initialShifts);
  const [activeShift, setActiveShift] = React.useState<ShiftItem | null>(initialActiveShift);
  const [selectedShiftForSummary, setSelectedShiftForSummary] = React.useState<ShiftItem | null>(null);

  // Modals
  const [isOpenShiftModal, setIsOpenShiftModal] = React.useState(false);
  const [isCashMovementModal, setIsCashMovementModal] = React.useState(false);
  const [isCloseShiftModal, setIsCloseShiftModal] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Form states
  const [openingFloat, setOpeningFloat] = React.useState("100.00");
  const [openNotes, setOpenNotes] = React.useState("");

  const [movementType, setMovementType] = React.useState<"CASH_IN" | "CASH_OUT">("CASH_IN");
  const [movementAmount, setMovementAmount] = React.useState("");
  const [movementReason, setMovementReason] = React.useState("");

  const [actualCashInput, setActualCashInput] = React.useState("");
  const [closeNotes, setCloseNotes] = React.useState("");

  // Handlers
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const float = parseFloat(openingFloat) || 0;
    setIsProcessing(true);

    try {
      const res = await openShiftAction(locationId, float, openNotes || undefined);
      if (!res.success || !res.shift) {
        toastError(res.error || "Failed to open shift");
        setIsProcessing(false);
        return;
      }

      toastSuccess(`Register Shift ${res.shift.shiftNumber} opened successfully!`, "Shift Opened");
      setActiveShift(res.shift as any);
      setShifts([res.shift as any, ...shifts]);
      setIsOpenShiftModal(false);
      setOpenNotes("");
    } catch (err: any) {
      toastError(err.message || "Error opening shift");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    const amount = parseFloat(movementAmount) || 0;
    if (amount <= 0) {
      toastError("Amount must be greater than 0");
      return;
    }
    if (!movementReason.trim()) {
      toastError("Reason is required");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await recordCashMovementAction(activeShift.id, movementType, amount, movementReason);
      if (!res.success) {
        toastError(res.error || "Failed to record cash movement");
        setIsProcessing(false);
        return;
      }

      toastSuccess(`${movementType === "CASH_IN" ? "Cash In" : "Cash Out"} of ${formatCurrency(amount, "USD", currencySymbol)} recorded`, "Drawer Updated");
      setIsCashMovementModal(false);
      setMovementAmount("");
      setMovementReason("");
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || "Error recording movement");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    const actual = parseFloat(actualCashInput) || 0;
    setIsProcessing(true);

    try {
      const res = await closeShiftAction(activeShift.id, actual, closeNotes || undefined);
      if (!res.success || !res.shift) {
        toastError(res.error || "Failed to close shift");
        setIsProcessing(false);
        return;
      }

      toastSuccess(`Shift ${res.shift.shiftNumber} closed and reconciled!`, "Z-Report Generated");
      setSelectedShiftForSummary(res.shift as any);
      setActiveShift(null);
      setShifts(shifts.map((s) => (s.id === res.shift!.id ? (res.shift as any) : s)));
      setIsCloseShiftModal(false);
      setActualCashInput("");
      setCloseNotes("");
    } catch (err: any) {
      toastError(err.message || "Error closing shift");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Cash Register & Shift Management
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Banknote className="w-3 h-3 text-emerald-400" />
              Cash Drawer
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track opening float, mid-shift payouts, and execute End-of-Shift Z-Report cash reconciliations for {locationName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!activeShift ? (
            <Button
              variant="success"
              size="md"
              className="gap-2 font-bold shadow-lg shadow-emerald-500/20"
              onClick={() => setIsOpenShiftModal(true)}
            >
              <Unlock className="w-4 h-4" />
              Open New Shift
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="md"
                className="gap-1.5 font-bold"
                onClick={() => setIsCashMovementModal(true)}
              >
                <DollarSign className="w-4 h-4" />
                Cash In / Out
              </Button>
              <Button
                variant="destructive"
                size="md"
                className="gap-1.5 font-bold shadow-lg shadow-rose-500/20"
                onClick={() => {
                  setActualCashInput(activeShift.expectedCash.toFixed(2));
                  setIsCloseShiftModal(true);
                }}
              >
                <Lock className="w-4 h-4" />
                Close Shift (Z-Report)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Active Shift Banner Card */}
      {activeShift ? (
        <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 shadow-xl shadow-emerald-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                  <Unlock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base text-white">Active Register Shift: {activeShift.shiftNumber}</CardTitle>
                    <Badge variant="success" size="sm">OPEN</Badge>
                  </div>
                  <CardDescription>
                    Cashier: <span className="text-slate-200 font-semibold">{activeShift.cashier.name}</span> • Opened: {formatDateTime(activeShift.openedAt)}
                  </CardDescription>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Expected Drawer Cash</span>
                <span className="text-2xl font-black text-emerald-400">
                  {formatCurrency(activeShift.expectedCash, "USD", currencySymbol)}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Opening Float</span>
                <span className="font-bold text-white text-sm">
                  {formatCurrency(activeShift.openingFloat, "USD", currencySymbol)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Cash Sales</span>
                <span className="font-bold text-emerald-400 text-sm">
                  +{formatCurrency(activeShift.cashSales, "USD", currencySymbol)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Card & Other Sales</span>
                <span className="font-bold text-blue-400 text-sm">
                  {formatCurrency(activeShift.cardSales + activeShift.otherSales, "USD", currencySymbol)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Cash In (Added)</span>
                <span className="font-bold text-teal-400 text-sm">
                  +{formatCurrency(activeShift.cashIn, "USD", currencySymbol)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Cash Out (Payouts)</span>
                <span className="font-bold text-rose-400 text-sm">
                  -{formatCurrency(activeShift.cashOut, "USD", currencySymbol)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-8 text-center border-dashed border-slate-800 bg-slate-950/40">
          <Lock className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white">No Register Shift Currently Open</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Open a shift by counting your starting cash float. All sales, cash transactions, and drawer movements will be ledgered in real time.
          </p>
          <Button
            variant="success"
            size="sm"
            className="mt-4 gap-1.5 font-bold"
            onClick={() => setIsOpenShiftModal(true)}
          >
            <Unlock className="w-4 h-4" />
            Open Register Shift
          </Button>
        </Card>
      )}

      {/* Shifts History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Historical Register Shifts & Z-Reports</CardTitle>
            <CardDescription>Audited ledger of past drawer reconciliations</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {shifts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No register shifts recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-y border-slate-800 bg-slate-900/40 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Shift #</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Opened / Closed</th>
                    <th className="py-3 px-4 text-right">Float</th>
                    <th className="py-3 px-4 text-right">Cash Sales</th>
                    <th className="py-3 px-4 text-right">Expected</th>
                    <th className="py-3 px-4 text-right">Actual Count</th>
                    <th className="py-3 px-4 text-right">Difference</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {shifts.map((s) => {
                    const hasDiff = s.difference !== null && Math.abs(s.difference) > 0.01;
                    const isShort = s.difference !== null && s.difference < -0.01;
                    const isOver = s.difference !== null && s.difference > 0.01;

                    return (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {s.shiftNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {s.cashier?.name || "Cashier"}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          <div>{formatDateTime(s.openedAt)}</div>
                          {s.closedAt && (
                            <div className="text-[11px] text-slate-400">to {formatDateTime(s.closedAt)}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-300">
                          {formatCurrency(s.openingFloat, "USD", currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          +{formatCurrency(s.cashSales, "USD", currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-white">
                          {formatCurrency(s.expectedCash, "USD", currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-200">
                          {s.actualCash !== null
                            ? formatCurrency(s.actualCash, "USD", currencySymbol)
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          {s.difference === null ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            <span
                              className={
                                isShort
                                  ? "text-rose-400 font-bold"
                                  : isOver
                                  ? "text-amber-400 font-bold"
                                  : "text-emerald-400 font-bold"
                              }
                            >
                              {s.difference > 0 ? `+${formatCurrency(s.difference, "USD", currencySymbol)} (Over)` : s.difference < 0 ? `${formatCurrency(s.difference, "USD", currencySymbol)} (Short)` : "$0.00 (Exact)"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={s.status === "OPEN" ? "success" : "outline"} size="sm">
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs text-blue-400 hover:text-blue-300"
                            onClick={() => setSelectedShiftForSummary(s)}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Summary
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Shift Modal */}
      <Modal
        isOpen={isOpenShiftModal}
        onClose={() => setIsOpenShiftModal(false)}
        title="Open Register Shift"
        description="Verify and enter your starting cash float in the register drawer."
        size="md"
      >
        <form onSubmit={handleOpenShift} className="space-y-4">
          <Input
            label="Starting Cash Float ($) *"
            type="number"
            min="0"
            step="any"
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            placeholder="100.00"
            required
            autoFocus
          />

          <div className="flex gap-2">
            {[50, 100, 150, 200, 300].map((preset) => (
              <button
                key={preset}
                type="button"
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 border border-slate-700"
                onClick={() => setOpeningFloat(preset.toFixed(2))}
              >
                ${preset}
              </button>
            ))}
          </div>

          <Input
            label="Opening Notes (optional)"
            placeholder="e.g. Morning Shift - Drawer #1"
            value={openNotes}
            onChange={(e) => setOpenNotes(e.target.value)}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsOpenShiftModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              size="md"
              isLoading={isProcessing}
              className="gap-1.5 font-bold"
            >
              <Unlock className="w-4 h-4" />
              Confirm & Open Shift
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cash In / Cash Out Modal */}
      <Modal
        isOpen={isCashMovementModal}
        onClose={() => setIsCashMovementModal(false)}
        title="Cash Drawer In / Out (Payout)"
        description="Record mid-shift petty cash payouts or change replenishment."
        size="md"
      >
        <form onSubmit={handleCashMovement} className="space-y-4">
          <Select
            label="Movement Type *"
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as any)}
            options={[
              { value: "CASH_IN", label: "Cash In (Add float/change)" },
              { value: "CASH_OUT", label: "Cash Out (Petty Cash / Payout / Bank Drop)" },
            ]}
          />

          <Input
            label="Amount ($) *"
            type="number"
            min="0.01"
            step="any"
            placeholder="0.00"
            value={movementAmount}
            onChange={(e) => setMovementAmount(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Reason / Reference *"
            placeholder="e.g. Coffee & tea supplies, change replenishment, lunch payout"
            value={movementReason}
            onChange={(e) => setMovementReason(e.target.value)}
            required
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsCashMovementModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isProcessing}
              className="gap-1.5 font-bold"
            >
              <DollarSign className="w-4 h-4" />
              Save Drawer Movement
            </Button>
          </div>
        </form>
      </Modal>

      {/* Close Shift Modal */}
      <Modal
        isOpen={isCloseShiftModal}
        onClose={() => setIsCloseShiftModal(false)}
        title="Close Register Shift & Z-Report"
        description="Perform final physical cash count and reconcile drawer variance."
        size="md"
      >
        <form onSubmit={handleCloseShift} className="space-y-4">
          {activeShift && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Opening Float:</span>
                <span className="font-bold text-white">
                  {formatCurrency(activeShift.openingFloat, "USD", currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Cash Sales:</span>
                <span className="font-bold text-emerald-400">
                  +{formatCurrency(activeShift.cashSales, "USD", currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Net Cash Movements (In - Out):</span>
                <span className="font-bold text-blue-400">
                  {formatCurrency(activeShift.cashIn - activeShift.cashOut, "USD", currencySymbol)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                <span className="text-white">Expected Drawer Cash:</span>
                <span className="text-emerald-400">
                  {formatCurrency(activeShift.expectedCash, "USD", currencySymbol)}
                </span>
              </div>
            </div>
          )}

          <Input
            label="Actual Counted Cash ($) *"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={actualCashInput}
            onChange={(e) => setActualCashInput(e.target.value)}
            required
            autoFocus
          />

          {activeShift && actualCashInput !== "" && (
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
              <span className="text-slate-300">Drawer Difference:</span>
              <span
                className={
                  parseFloat(actualCashInput) - activeShift.expectedCash < 0
                    ? "text-rose-400 font-bold"
                    : parseFloat(actualCashInput) - activeShift.expectedCash > 0
                    ? "text-amber-400 font-bold"
                    : "text-emerald-400 font-bold"
                }
              >
                {parseFloat(actualCashInput) - activeShift.expectedCash > 0
                  ? `+${formatCurrency(parseFloat(actualCashInput) - activeShift.expectedCash, "USD", currencySymbol)} (Overage)`
                  : parseFloat(actualCashInput) - activeShift.expectedCash < 0
                  ? `${formatCurrency(parseFloat(actualCashInput) - activeShift.expectedCash, "USD", currencySymbol)} (Shortage)`
                  : "Balanced ($0.00)"}
              </span>
            </div>
          )}

          <Input
            label="Closing Notes (optional)"
            placeholder="e.g. Shift ended normally, counted with manager"
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.target.value)}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsCloseShiftModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="md"
              isLoading={isProcessing}
              className="gap-1.5 font-bold"
            >
              <Lock className="w-4 h-4" />
              Reconcile & Close Shift
            </Button>
          </div>
        </form>
      </Modal>

      {/* Shift Summary / Z-Report Printable Modal */}
      {selectedShiftForSummary && (
        <Modal
          isOpen={!!selectedShiftForSummary}
          onClose={() => setSelectedShiftForSummary(null)}
          title={`Shift Summary Report (${selectedShiftForSummary.shiftNumber})`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="text-center pb-3 border-b border-dashed border-slate-800 space-y-1">
              <p className="font-black text-base text-white">StockFlow Z-Report</p>
              <p className="text-[11px] text-slate-400">{locationName} • Shift #{selectedShiftForSummary.shiftNumber}</p>
              <p className="text-[10px] text-slate-400">
                Cashier: {selectedShiftForSummary.cashier.name}
              </p>
            </div>

            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span>Opened:</span>
                <span className="text-white font-medium">{formatDateTime(selectedShiftForSummary.openedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Closed:</span>
                <span className="text-white font-medium">
                  {selectedShiftForSummary.closedAt ? formatDateTime(selectedShiftForSummary.closedAt) : "Active"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Starting Float:</span>
                <span className="text-white font-bold">{formatCurrency(selectedShiftForSummary.openingFloat, "USD", currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Sales:</span>
                <span className="text-emerald-400 font-bold">+{formatCurrency(selectedShiftForSummary.cashSales, "USD", currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>Card Sales:</span>
                <span className="text-blue-400 font-bold">+{formatCurrency(selectedShiftForSummary.cardSales, "USD", currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>Other Sales:</span>
                <span className="text-purple-400 font-bold">+{formatCurrency(selectedShiftForSummary.otherSales, "USD", currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Shift Revenue:</span>
                <span className="text-white font-black">
                  {formatCurrency(
                    selectedShiftForSummary.cashSales + selectedShiftForSummary.cardSales + selectedShiftForSummary.otherSales,
                    "USD",
                    currencySymbol
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cash In / Additions:</span>
                <span className="text-teal-400 font-bold">+{formatCurrency(selectedShiftForSummary.cashIn, "USD", currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Out / Payouts:</span>
                <span className="text-rose-400 font-bold">-{formatCurrency(selectedShiftForSummary.cashOut, "USD", currencySymbol)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex justify-between font-bold">
                <span className="text-slate-300">Expected Cash:</span>
                <span className="text-white">{formatCurrency(selectedShiftForSummary.expectedCash, "USD", currencySymbol)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-300">Actual Counted:</span>
                <span className="text-emerald-400">
                  {selectedShiftForSummary.actualCash !== null
                    ? formatCurrency(selectedShiftForSummary.actualCash, "USD", currencySymbol)
                    : "In Progress"}
                </span>
              </div>
              <div className="flex justify-between font-black pt-1 border-t border-slate-800">
                <span className="text-slate-200">Reconciliation Variance:</span>
                <span
                  className={
                    selectedShiftForSummary.difference && selectedShiftForSummary.difference < 0
                      ? "text-rose-400"
                      : selectedShiftForSummary.difference && selectedShiftForSummary.difference > 0
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }
                >
                  {selectedShiftForSummary.difference !== null
                    ? formatCurrency(selectedShiftForSummary.difference, "USD", currencySymbol)
                    : "$0.00"}
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-between border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedShiftForSummary(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5 font-bold"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4" />
                Print Z-Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
