"use client";

import * as React from "react";
import {
  MapPin,
  Building2,
  Plus,
  ArrowRightLeft,
  Boxes,
  CheckCircle2,
  Warehouse,
  Store,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createLocationAction, transferStockAction } from "@/actions/location-actions";

export interface LocationItem {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  isDefault: boolean;
  itemCount: number;
  totalUnits: number;
}

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

interface LocationsViewProps {
  initialLocations: LocationItem[];
  products: ProductOption[];
}

export function LocationsView({ initialLocations, products }: LocationsViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [locations, setLocations] = React.useState<LocationItem[]>(initialLocations);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);

  // New location form
  const [locationForm, setLocationForm] = React.useState({
    name: "",
    code: "",
    address: "",
    isDefault: false,
  });
  const [isCreatingLoc, setIsCreatingLoc] = React.useState(false);

  // Transfer form
  const [transferForm, setTransferForm] = React.useState({
    fromLocationId: locations[0]?.id || "",
    toLocationId: locations[1]?.id || "",
    productId: products[0]?.id || "",
    quantity: 5,
    notes: "",
  });
  const [isTransferring, setIsTransferring] = React.useState(false);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationForm.name.trim()) return;

    setIsCreatingLoc(true);
    try {
      const res = await createLocationAction(locationForm);
      if (!res.success) {
        toastError(res.error || "Failed to create location");
        setIsCreatingLoc(false);
        return;
      }

      toastSuccess(`Location "${locationForm.name}" created!`);
      setIsAddModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || "Error creating location");
    } finally {
      setIsCreatingLoc(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.fromLocationId === transferForm.toLocationId) {
      toastError("Origin and destination stores cannot be the same");
      return;
    }

    setIsTransferring(true);
    try {
      const res = await transferStockAction(transferForm);
      if (!res.success) {
        toastError(res.error || "Transfer failed");
        setIsTransferring(false);
        return;
      }

      toastSuccess("Stock transferred and recorded in inventory ledger!", "Transfer Completed");
      setIsTransferModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || "Error during transfer");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Store Locations & Stock Transfers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage multi-store branches, regional warehouses, and execute inter-store inventory transfers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsTransferModalOpen(true)}
            className="font-bold"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-400" />
            Transfer Stock
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            className="font-bold"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Locations Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  {loc.name.toLowerCase().includes("warehouse") ? (
                    <Warehouse className="w-5 h-5" />
                  ) : (
                    <Store className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{loc.name}</h3>
                  <span className="font-mono text-xs text-blue-400">{loc.code}</span>
                </div>
              </div>

              {loc.isDefault && (
                <Badge variant="success" size="sm">
                  Primary Store
                </Badge>
              )}
            </div>

            {loc.address && (
              <div className="flex items-start gap-1.5 text-xs text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{loc.address}</span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Unique SKUs</span>
                <span className="font-bold text-white text-sm">{loc.itemCount} items</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Total Stock Units</span>
                <span className="font-bold text-emerald-400 text-sm">{loc.totalUnits} pcs</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE LOCATION MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Store / Warehouse Location"
        description="Register a new retail branch or central logistics depot."
      >
        <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
          <Input
            label="Location Name"
            required
            placeholder="e.g. Uptown Branch / Outlet #2"
            value={locationForm.name}
            onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
            autoFocus
          />

          <Input
            label="Location Code"
            placeholder="e.g. LOC-UP02"
            value={locationForm.code}
            onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
          />

          <Input
            label="Physical Street Address"
            placeholder="e.g. 500 Uptown Mall, 2nd Floor"
            value={locationForm.address}
            onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isDefaultLoc"
              checked={locationForm.isDefault}
              onChange={(e) => setLocationForm({ ...locationForm, isDefault: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700"
            />
            <label htmlFor="isDefaultLoc" className="text-slate-300">
              Set as primary / default store for POS
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreatingLoc} className="font-bold">
              Save Location &rarr;
            </Button>
          </div>
        </form>
      </Modal>

      {/* TRANSFER STOCK MODAL */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Inter-Store Stock Transfer"
        description="Move inventory from one store/warehouse to another with atomic ledger records."
        maxWidth="lg"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Source Location (Deduct)"
              value={transferForm.fromLocationId}
              onChange={(e) => setTransferForm({ ...transferForm, fromLocationId: e.target.value })}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>

            <Select
              label="Destination Location (Add)"
              value={transferForm.toLocationId}
              onChange={(e) => setTransferForm({ ...transferForm, toLocationId: e.target.value })}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Select
                label="Product to Transfer"
                value={transferForm.productId}
                onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </Select>
            </div>

            <Input
              label="Transfer Quantity"
              type="number"
              min="1"
              required
              value={transferForm.quantity}
              onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Transfer Reason / Reference"
            placeholder="e.g. Replenishing retail branch weekend stock"
            value={transferForm.notes}
            onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isTransferring} className="font-bold">
              Execute Transfer &rarr;
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
