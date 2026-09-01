"use client";

import * as React from "react";
import {
  Building,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Truck,
  Edit2,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createSupplierAction, updateSupplierAction } from "@/actions/supplier-actions";

export interface SupplierItem {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  poCount: number;
}

interface SuppliersViewProps {
  initialSuppliers: SupplierItem[];
}

export function SuppliersView({ initialSuppliers }: SuppliersViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [suppliers, setSuppliers] = React.useState<SupplierItem[]>(initialSuppliers);
  const [searchQuery, setSearchQuery] = React.useState("");

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<SupplierItem | null>(null);
  const [formData, setFormData] = React.useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const filteredSuppliers = React.useMemo(() => {
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [suppliers, searchQuery]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({ name: "", contactPerson: "", phone: "", email: "", address: "", notes: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: SupplierItem) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      contactPerson: s.contactPerson || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      notes: s.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toastError("Supplier name is required");
      return;
    }

    setIsSaving(true);
    try {
      if (editingSupplier) {
        const res = await updateSupplierAction(editingSupplier.id, formData);
        if (!res.success) {
          toastError(res.error || "Failed to update supplier");
          setIsSaving(false);
          return;
        }
        setSuppliers((prev) =>
          prev.map((s) => (s.id === editingSupplier.id ? { ...s, ...res.supplier } : s))
        );
        toastSuccess(`Updated "${res.supplier?.name}"!`);
      } else {
        const res = await createSupplierAction(formData);
        if (!res.success) {
          toastError(res.error || "Failed to create supplier");
          setIsSaving(false);
          return;
        }
        if (res.supplier) {
          setSuppliers((prev) => [{ ...res.supplier, poCount: 0 } as SupplierItem, ...prev]);
        }
        toastSuccess(`Created supplier "${res.supplier?.name}"!`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toastError(err.message || "Error saving supplier");
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
            Supplier Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage wholesale distributors, payment terms, contact reps, and restock purchase orders.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={handleOpenAdd} className="font-bold">
          <Plus className="w-4 h-4" />
          Add Supplier
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <Input
          placeholder="Search by company name, contact rep, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />
      </div>

      {/* Suppliers Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Supplier Company</th>
                <th className="py-3 px-4">Contact Rep</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4 text-center">Purchase Orders</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-white text-sm flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-400" />
                    {s.name}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-200">{s.contactPerson || "-"}</td>
                  <td className="py-3 px-4">
                    <div className="space-y-0.5 text-[11px] text-slate-400">
                      {s.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{s.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-300">
                    <Badge variant="outline" size="sm">
                      {s.poCount} POs
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{s.notes || "-"}</td>
                  <td className="py-3 px-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(s)}
                      title="Edit Supplier"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-300" />
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No suppliers found matching "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : "Add Supplier"}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <Input
            label="Company Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />

          <Input
            label="Contact Person / Rep"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
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
            label="Address / Warehouse City"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <Input
            label="Payment Terms / Notes"
            placeholder="e.g. Net 30 days terms, express air shipment"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving} className="font-bold">
              {editingSupplier ? "Save Changes" : "Save Supplier"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
