"use client";

import * as React from "react";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  DollarSign,
  History,
  Edit2,
  Award,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  createCustomerAction,
  updateCustomerAction,
  adjustLoyaltyPointsAction,
} from "@/actions/customer-actions";

export interface CustomerItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  totalSpent: number;
  totalPurchases: number;
  outstandingBalance: number;
  loyaltyPoints: number;
  loyaltyTier: string;
  createdAt: string | Date;
  sales: Array<{
    id: string;
    receiptNumber: string;
    totalAmount: number;
    paymentMethod: string;
    createdAt: string | Date;
  }>;
}

interface CustomersViewProps {
  initialCustomers: CustomerItem[];
  currencySymbol: string;
}

export function CustomersView({ initialCustomers, currencySymbol }: CustomersViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [customers, setCustomers] = React.useState<CustomerItem[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<CustomerItem | null>(null);
  const [formData, setFormData] = React.useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [isSaving, setIsSaving] = React.useState(false);

  // Loyalty Adjust Modal
  const [selectedPointsCustomer, setSelectedPointsCustomer] = React.useState<CustomerItem | null>(null);
  const [pointsDeltaInput, setPointsDeltaInput] = React.useState("50");
  const [pointsNotes, setPointsNotes] = React.useState("");
  const [isAdjustingPoints, setIsAdjustingPoints] = React.useState(false);

  // History Drawer Modal
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = React.useState<CustomerItem | null>(null);

  const filteredCustomers = React.useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [customers, searchQuery]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({ name: "", phone: "", email: "", address: "", notes: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: CustomerItem) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      notes: c.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toastError("Customer name is required");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCustomer) {
        const res = await updateCustomerAction(editingCustomer.id, formData);
        if (!res.success) {
          toastError(res.error || "Failed to update customer");
          setIsSaving(false);
          return;
        }
        setCustomers((prev) =>
          prev.map((c) => (c.id === editingCustomer.id ? { ...c, ...res.customer } : c))
        );
        toastSuccess(`Updated "${res.customer?.name}"!`);
      } else {
        const res = await createCustomerAction(formData);
        if (!res.success) {
          toastError(res.error || "Failed to create customer");
          setIsSaving(false);
          return;
        }
        if (res.customer) {
          const newC: CustomerItem = {
            ...res.customer,
            totalSpent: 0,
            totalPurchases: 0,
            outstandingBalance: 0,
            loyaltyPoints: 0,
            loyaltyTier: "BRONZE",
            createdAt: new Date().toISOString(),
            sales: [],
          };
          setCustomers((prev) => [newC, ...prev]);
        }
        toastSuccess(`Created customer "${res.customer?.name}"!`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toastError(err.message || "Error saving customer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPointsCustomer) return;
    const delta = parseInt(pointsDeltaInput) || 0;
    if (delta === 0) {
      toastError("Points change cannot be zero");
      return;
    }

    setIsAdjustingPoints(true);
    try {
      const res = await adjustLoyaltyPointsAction(selectedPointsCustomer.id, delta, pointsNotes || undefined);
      if (!res.success || !res.customer) {
        toastError(res.error || "Failed to adjust points");
        setIsAdjustingPoints(false);
        return;
      }

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedPointsCustomer.id ? { ...c, loyaltyPoints: res.customer!.loyaltyPoints } : c
        )
      );
      toastSuccess(`Adjusted loyalty points for ${selectedPointsCustomer.name} to ${res.customer.loyaltyPoints} pts`);
      setSelectedPointsCustomer(null);
      setPointsNotes("");
    } catch (err: any) {
      toastError(err.message || "Error adjusting points");
    } finally {
      setIsAdjustingPoints(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Customer Directory & Loyalty Program
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              VIP Rewards
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track customer contact profiles, reward point balances, lifetime order history, and VIP tier statuses.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={handleOpenAdd} className="font-bold gap-1.5 shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <Input
          placeholder="Search by customer name, phone number, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">VIP Tier</th>
                <th className="py-3 px-4 text-right">Loyalty Points</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-center">Orders Count</th>
                <th className="py-3 px-4 text-right">Lifetime Spent</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-white text-sm">{c.name}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        c.loyaltyTier === "PLATINUM"
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                          : c.loyaltyTier === "GOLD"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          : c.loyaltyTier === "SILVER"
                          ? "bg-slate-500/20 text-slate-300 border-slate-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {c.loyaltyTier || "BRONZE"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedPointsCustomer(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 transition-all text-xs"
                      title="Click to adjust points"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{c.loyaltyPoints || 0} pts</span>
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-0.5 text-[11px] text-slate-400">
                      {c.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-300">
                    {c.totalPurchases} orders
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-400 text-sm">
                    {formatCurrency(c.totalSpent, "USD", currencySymbol)}
                  </td>
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{c.notes || "-"}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedHistoryCustomer(c)}
                        title="View Purchase History"
                      >
                        <History className="w-3.5 h-3.5 text-blue-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Customer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-300" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No customers found matching "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.name}` : "Create Customer"}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <Input
            label="Full Name *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <Input
            label="Physical / Delivery Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <Input
            label="Customer Notes / VIP Tags"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving} className="font-bold">
              {editingCustomer ? "Save Changes" : "Create Customer"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ADJUST LOYALTY POINTS MODAL */}
      {selectedPointsCustomer && (
        <Modal
          isOpen={!!selectedPointsCustomer}
          onClose={() => setSelectedPointsCustomer(null)}
          title={`Adjust Loyalty Points: ${selectedPointsCustomer.name}`}
          description={`Current balance: ${selectedPointsCustomer.loyaltyPoints || 0} points`}
          size="sm"
        >
          <form onSubmit={handleAdjustPointsSubmit} className="space-y-4 text-xs">
            <Input
              label="Points Change (+/-) *"
              type="number"
              value={pointsDeltaInput}
              onChange={(e) => setPointsDeltaInput(e.target.value)}
              placeholder="+50 or -50"
              required
              autoFocus
            />

            <div className="flex gap-2">
              {[+20, +50, +100, -50, -100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPointsDeltaInput(preset.toString())}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 border border-slate-700"
                >
                  {preset > 0 ? `+${preset}` : preset}
                </button>
              ))}
            </div>

            <Input
              label="Adjustment Reason / Note"
              placeholder="e.g. Birthday bonus, manual reward compensation"
              value={pointsNotes}
              onChange={(e) => setPointsNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedPointsCustomer(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isAdjustingPoints}
                className="font-bold"
              >
                Update Points
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* PURCHASE HISTORY MODAL */}
      {selectedHistoryCustomer && (
        <Modal
          isOpen={!!selectedHistoryCustomer}
          onClose={() => setSelectedHistoryCustomer(null)}
          title={`Purchase History: ${selectedHistoryCustomer.name}`}
          description={`Lifetime spent: ${formatCurrency(
            selectedHistoryCustomer.totalSpent,
            "USD",
            currencySymbol
          )} across ${selectedHistoryCustomer.totalPurchases} orders.`}
          size="xl"
        >
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {selectedHistoryCustomer.sales.length === 0 ? (
              <p className="text-center py-8 text-slate-500 text-xs">
                No recorded sales for this customer yet.
              </p>
            ) : (
              selectedHistoryCustomer.sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{sale.receiptNumber}</span>
                    <p className="text-[11px] text-slate-400">{formatDateTime(sale.createdAt)}</p>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-emerald-400">
                      {formatCurrency(sale.totalAmount, "USD", currencySymbol)}
                    </span>
                    <p className="text-[10px] text-slate-400 uppercase">{sale.paymentMethod}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
