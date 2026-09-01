"use client";

import * as React from "react";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Printer,
  Calendar,
  Building,
  DollarSign,
  ArrowRight,
  Trash2,
  Share2,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { createQuoteAction, convertQuoteToSaleAction } from "@/actions/invoice-actions";

export interface InvoiceItem {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  status: string;
  createdAt: string | Date;
  notes: string | null;
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export interface AvailableProduct {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
}

export interface AvailableCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface InvoicesViewProps {
  initialInvoices: InvoiceItem[];
  products: AvailableProduct[];
  customers: AvailableCustomer[];
  business: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    taxNumber: string | null;
    currencySymbol: string;
  };
}

export function InvoicesView({
  initialInvoices,
  products,
  customers,
  business,
}: InvoicesViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [invoices, setInvoices] = React.useState<InvoiceItem[]>(initialInvoices);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceItem | null>(null);
  const [isConverting, setIsConverting] = React.useState(false);

  // Quote Form
  const [customerId, setCustomerId] = React.useState(customers[0]?.id || "");
  const [paymentTerms, setPaymentTerms] = React.useState("Net 30 Days");
  const [notes, setNotes] = React.useState("");
  const [discountPercent, setDiscountPercent] = React.useState(0);
  const [lineItems, setLineItems] = React.useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([
    { productId: products[0]?.id || "", quantity: 10, unitPrice: products[0]?.sellingPrice || 50 },
  ]);
  const [isSaving, setIsSaving] = React.useState(false);

  const filteredInvoices = React.useMemo(() => {
    return invoices.filter(
      (inv) =>
        inv.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [invoices, searchQuery]);

  const handleAddLine = () => {
    setLineItems((prev) => [
      ...prev,
      { productId: products[0]?.id || "", quantity: 1, unitPrice: products[0]?.sellingPrice || 10 },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === "productId") {
          const prod = products.find((p) => p.id === value);
          return {
            ...item,
            productId: value,
            unitPrice: prod?.sellingPrice || item.unitPrice,
          };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      toastError("Add at least one product line item");
      return;
    }

    setIsSaving(true);
    try {
      const res = await createQuoteAction({
        customerId,
        locationId: "",
        paymentTerms,
        notes,
        discountPercent,
        items: lineItems,
      });

      if (!res.success) {
        toastError(res.error || "Failed to generate quotation");
        setIsSaving(false);
        return;
      }

      toastSuccess(`Quotation #${res.quote?.receiptNumber} generated!`);
      setIsCreateModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || "Error generating quote");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertToSale = async (quoteId: string) => {
    if (!confirm("Convert this quotation into a completed sale? Stock will be atomically deducted.")) return;

    setIsConverting(true);
    try {
      const res = await convertQuoteToSaleAction(quoteId);
      if (!res.success) {
        toastError(res.error || "Failed to convert quote");
        setIsConverting(false);
        return;
      }

      toastSuccess("Quotation converted to completed POS sale!", "Sale Completed");
      setSelectedInvoice(null);
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || "Conversion error");
    } finally {
      setIsConverting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800 no-print">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Wholesale Quotations & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Create pro-forma commercial quotations for wholesale clients and convert them directly into completed sales.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          className="font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Quotation
        </Button>
      </div>

      {/* Search Bar (Screen Only) */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 no-print">
        <Input
          placeholder="Search by quote # or customer name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />
      </div>

      {/* Invoices Table (Screen Only) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice / Quote #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-400">
                    #{inv.quoteNumber}
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">{inv.customerName}</td>
                  <td className="py-3 px-4 text-slate-400">{formatDate(inv.createdAt)}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-300">
                    {inv.items.length} lines
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-sm text-emerald-400">
                    {formatCurrency(inv.totalAmount, "USD", business.currencySymbol)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={
                        inv.status === "CONVERTED"
                          ? "success"
                          : inv.status === "QUOTE"
                          ? "purple"
                          : "default"
                      }
                      size="sm"
                    >
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedInvoice(inv)}
                      className="text-slate-300 font-semibold"
                    >
                      View Invoice &rarr;
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No quotations or wholesale invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE QUOTE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Wholesale Quotation / Invoice"
        description="Build a pro-forma quote with custom pricing and payment terms."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateQuote} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Wholesale Customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </Select>

            <Input
              label="Payment Terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. Net 30 Days / 50% Advance"
            />
          </div>

          {/* Line Items Builder */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300">Quote Line Items</span>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddLine}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item Line
              </Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {lineItems.map((line, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-6">
                    <Select
                      value={line.productId}
                      onChange={(e) => handleLineChange(idx, "productId", e.target.value)}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={(e) => handleLineChange(idx, "quantity", Number(e.target.value))}
                    />
                  </div>

                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={line.unitPrice}
                      onChange={(e) => handleLineChange(idx, "unitPrice", Number(e.target.value))}
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Input
            label="Special Delivery / Shipment Notes"
            placeholder="e.g. Free pallet delivery to warehouse dock B"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving} className="font-bold">
              Generate Quotation &rarr;
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW / PRINT FORMAL COMMERCIAL INVOICE MODAL */}
      {selectedInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          title={`Commercial Invoice #${selectedInvoice.quoteNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Printable A4 Sheet */}
            <div
              id="printable-invoice"
              className="bg-white text-black p-8 rounded-xl shadow-lg border border-slate-300 font-sans space-y-6"
            >
              {/* Header: Company & Invoice Info */}
              <div className="flex justify-between items-start pb-4 border-b-2 border-gray-900">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">
                    {business.name}
                  </h2>
                  {business.address && <p className="text-gray-600 text-xs">{business.address}</p>}
                  {business.phone && <p className="text-gray-600 text-xs">Tel: {business.phone}</p>}
                  {business.taxNumber && (
                    <p className="text-gray-600 text-xs">VAT/Tax ID: {business.taxNumber}</p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black uppercase text-blue-600 tracking-wider">
                    {selectedInvoice.status === "QUOTE" ? "PRO-FORMA QUOTE" : "TAX INVOICE"}
                  </span>
                  <p className="font-mono font-bold text-sm text-gray-900 mt-1">
                    #{selectedInvoice.quoteNumber}
                  </p>
                  <p className="text-gray-500 text-xs">Date: {formatDate(selectedInvoice.createdAt)}</p>
                </div>
              </div>

              {/* Billed To */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                  Billed To (Client):
                </span>
                <p className="font-bold text-sm text-gray-900">{selectedInvoice.customerName}</p>
                {selectedInvoice.customerPhone && (
                  <p className="text-gray-600 text-xs">Phone: {selectedInvoice.customerPhone}</p>
                )}
                {selectedInvoice.customerAddress && (
                  <p className="text-gray-600 text-xs">Address: {selectedInvoice.customerAddress}</p>
                )}
              </div>

              {/* Table of Line Items */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-900 bg-gray-100 text-gray-800 uppercase text-[10px] font-bold">
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        {item.productName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{item.sku}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">
                        {formatCurrency(item.unitPrice, "USD", business.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                        {formatCurrency(item.total, "USD", business.currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedInvoice.subtotal, "USD", business.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Sales Tax:</span>
                    <span>{formatCurrency(selectedInvoice.taxAmount, "USD", business.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t-2 border-gray-900">
                    <span>TOTAL DUE:</span>
                    <span>{formatCurrency(selectedInvoice.totalAmount, "USD", business.currencySymbol)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="pt-4 border-t border-gray-200 text-xs text-gray-600">
                  <span className="font-bold text-gray-800">Terms & Conditions: </span>
                  {selectedInvoice.notes}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="md" onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </Button>

              {selectedInvoice.status === "QUOTE" && (
                <Button
                  variant="success"
                  size="md"
                  onClick={() => handleConvertToSale(selectedInvoice.id)}
                  isLoading={isConverting}
                  className="font-bold gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Convert to Completed Sale &rarr;
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
