"use client";

import * as React from "react";
import {
  Barcode,
  Printer,
  Search,
  CheckSquare,
  Square,
  Tag,
  Sparkles,
  Sliders,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";

export interface BarcodeProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  sellingPrice: number;
  categoryName: string;
}

interface BarcodeGeneratorViewProps {
  products: BarcodeProduct[];
  businessName: string;
  currencySymbol: string;
}

export function BarcodeGeneratorView({
  products,
  businessName,
  currencySymbol,
}: BarcodeGeneratorViewProps) {
  const { success: toastSuccess } = useToast();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>(
    products.slice(0, 6).map((p) => p.id)
  );

  // Label configuration
  const [copiesPerProduct, setCopiesPerProduct] = React.useState<number>(2);
  const [labelFormat, setLabelFormat] = React.useState<"shelf" | "sheet30" | "compact">("sheet30");
  const [includePrice, setIncludePrice] = React.useState(true);
  const [includeSku, setIncludeSku] = React.useState(true);
  const [includeBusinessName, setIncludeBusinessName] = React.useState(true);

  const filteredProducts = React.useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery)
    );
  }, [products, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedProductIds(filteredProducts.map((p) => p.id));
  };

  const clearAll = () => {
    setSelectedProductIds([]);
  };

  // Generate label items array based on copies
  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));
  const printItems = React.useMemo(() => {
    const items: BarcodeProduct[] = [];
    selectedProducts.forEach((p) => {
      for (let i = 0; i < copiesPerProduct; i++) {
        items.push(p);
      }
    });
    return items;
  }, [selectedProducts, copiesPerProduct]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800 no-print">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Barcode & Price Tag Print Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Generate printable retail barcode labels, shelf tags, and 30-up Avery sheets for label thermal printers.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={handlePrint} className="font-bold gap-2">
          <Printer className="w-4 h-4" />
          Print {printItems.length} Labels
        </Button>
      </div>

      {/* Control Studio Pane (Screen Only) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        {/* Left: Product Selector */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Select Products for Label Generation</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-blue-400 hover:underline font-semibold"
              >
                Select All
              </button>
              <span className="text-slate-600">•</span>
              <button onClick={clearAll} className="text-xs text-slate-400 hover:underline">
                Clear
              </button>
            </div>
          </div>

          <Input
            placeholder="Search by name, SKU, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />

          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800 divide-y divide-slate-800/60">
            {filteredProducts.map((p) => {
              const isSelected = selectedProductIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  className={`p-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-600/10" : "hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-white">{p.name}</p>
                      <p className="text-[11px] text-slate-400">
                        SKU: {p.sku} • Barcode: {p.barcode}
                      </p>
                    </div>
                  </div>

                  <span className="font-bold text-emerald-400">
                    {formatCurrency(p.sellingPrice, "USD", currencySymbol)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right: Label Settings */}
        <Card className="space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            Label Layout & Options
          </h3>

          <div className="space-y-3 text-xs">
            <Select
              label="Sheet / Printer Format"
              value={labelFormat}
              onChange={(e: any) => setLabelFormat(e.target.value)}
            >
              <option value="sheet30">Avery 30-up Label Sheet (Standard)</option>
              <option value="shelf">Large Retail Shelf Edge Tag</option>
              <option value="compact">Compact Barcode Sticker</option>
            </Select>

            <Input
              label="Copies Per Product"
              type="number"
              min="1"
              max="100"
              value={copiesPerProduct}
              onChange={(e) => setCopiesPerProduct(Number(e.target.value))}
            />

            <div className="pt-2 space-y-2">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePrice}
                  onChange={(e) => setIncludePrice(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700"
                />
                <span>Include Selling Price</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSku}
                  onChange={(e) => setIncludeSku(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700"
                />
                <span>Include SKU Code</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBusinessName}
                  onChange={(e) => setIncludeBusinessName(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700"
                />
                <span>Include Store Name ({businessName})</span>
              </label>
            </div>
          </div>
        </Card>
      </div>

      {/* PRINTABLE PREVIEW SHEET */}
      <div className="p-6 rounded-2xl bg-white text-black border border-slate-300 shadow-xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-gray-300 no-print">
          <span className="font-bold text-xs uppercase text-gray-700">
            Print Preview ({printItems.length} Labels Generated)
          </span>
          <Button variant="primary" size="sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1" />
            Send to Printer
          </Button>
        </div>

        {/* Labels Grid */}
        <div
          id="printable-barcodes"
          className={`grid gap-3 ${
            labelFormat === "shelf"
              ? "grid-cols-2 md:grid-cols-3"
              : labelFormat === "compact"
              ? "grid-cols-3 md:grid-cols-4"
              : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          {printItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3 border border-gray-300 rounded-lg flex flex-col justify-between bg-white text-black font-sans text-center space-y-1 shadow-sm"
            >
              {includeBusinessName && (
                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider truncate">
                  {businessName}
                </span>
              )}

              <p className="font-bold text-xs text-gray-900 line-clamp-1 leading-tight">
                {item.name}
              </p>

              {/* Barcode Visual Bars Simulator */}
              <div className="py-1 flex flex-col items-center">
                <div className="h-9 w-full max-w-[140px] flex items-stretch justify-center gap-[2px] bg-white px-2 py-0.5">
                  {item.barcode
                    .split("")
                    .slice(0, 24)
                    .map((digit, bIdx) => (
                      <div
                        key={bIdx}
                        className={`h-full ${
                          Number(digit) % 2 === 0 ? "w-[2px] bg-black" : "w-[1px] bg-black"
                        }`}
                      />
                    ))}
                </div>
                <span className="font-mono text-[10px] font-bold tracking-widest text-gray-800">
                  {item.barcode}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-[10px]">
                {includeSku && <span className="font-mono text-gray-600">{item.sku}</span>}
                {includePrice && (
                  <span className="font-extrabold text-xs text-black">
                    {formatCurrency(item.sellingPrice, "USD", currencySymbol)}
                  </span>
                )}
              </div>
            </div>
          ))}

          {printItems.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400 text-xs">
              No products selected. Select products above to preview and print labels.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
