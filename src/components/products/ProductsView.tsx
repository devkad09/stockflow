"use client";

import * as React from "react";
import Papa from "papaparse";
import {
  Search,
  Plus,
  Boxes,
  Upload,
  Download,
  Edit2,
  Archive,
  Trash2,
  Layers,
  Filter,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Barcode,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, generateSKU, generateBarcode } from "@/lib/utils";
import {
  createProductAction,
  updateProductAction,
  archiveProductAction,
  deleteProductAction,
  importProductsCsvAction,
} from "@/actions/product-actions";
import { createCategoryAction, deleteCategoryAction } from "@/actions/category-actions";

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  costPrice: number;
  sellingPrice: number;
  minStockLevel: number;
  unit: string;
  taxRate: number;
  isArchived: boolean;
  isActive: boolean;
  categoryId: string | null;
  supplierId: string | null;
  category: { id: string; name: string; color: string | null } | null;
  supplier: { id: string; name: string } | null;
  currentStock: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  color: string | null;
  productCount?: number;
}

export interface SupplierOption {
  id: string;
  name: string;
}

interface ProductsViewProps {
  initialProducts: ProductItem[];
  categories: CategoryItem[];
  suppliers: SupplierOption[];
  currencySymbol: string;
}

export function ProductsView({
  initialProducts,
  categories: initialCategories,
  suppliers,
  currencySymbol,
}: ProductsViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [products, setProducts] = React.useState<ProductItem[]>(initialProducts);
  const [categories, setCategories] = React.useState<CategoryItem[]>(initialCategories);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [stockStatusFilter, setStockStatusFilter] = React.useState<string>("ALL");

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<ProductItem | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Product Form State
  const [productForm, setProductForm] = React.useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    categoryId: "",
    supplierId: "",
    costPrice: 0,
    sellingPrice: 0,
    minStockLevel: 5,
    unit: "pcs",
    taxRate: 0,
    initialQuantity: 0,
    isActive: true,
  });

  // Category Form State
  const [newCatName, setNewCatName] = React.useState("");
  const [newCatColor, setNewCatColor] = React.useState("#3b82f6");

  // CSV Import State
  const [csvRows, setCsvRows] = React.useState<any[]>([]);
  const [csvErrors, setCsvErrors] = React.useState<string[]>([]);
  const [isImporting, setIsImporting] = React.useState(false);

  // Filter products
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));

      const matchCategory = selectedCategory === "ALL" || p.categoryId === selectedCategory;

      let matchStock = true;
      if (stockStatusFilter === "LOW") {
        matchStock = p.currentStock <= p.minStockLevel && p.currentStock > 0 && !p.isArchived;
      } else if (stockStatusFilter === "OUT") {
        matchStock = p.currentStock <= 0 && !p.isArchived;
      } else if (stockStatusFilter === "IN") {
        matchStock = p.currentStock > p.minStockLevel && !p.isArchived;
      } else if (stockStatusFilter === "ARCHIVED") {
        matchStock = p.isArchived;
      } else if (stockStatusFilter === "ACTIVE") {
        matchStock = !p.isArchived;
      }

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, searchQuery, selectedCategory, stockStatusFilter]);

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      sku: generateSKU("PRD", "ITEM"),
      barcode: generateBarcode(),
      description: "",
      categoryId: categories[0]?.id || "",
      supplierId: suppliers[0]?.id || "",
      costPrice: 0,
      sellingPrice: 0,
      minStockLevel: 5,
      unit: "pcs",
      taxRate: 0,
      initialQuantity: 0,
      isActive: true,
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: ProductItem) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || "",
      description: p.description || "",
      categoryId: p.categoryId || "",
      supplierId: p.supplierId || "",
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      minStockLevel: p.minStockLevel,
      unit: p.unit,
      taxRate: p.taxRate,
      initialQuantity: 0,
      isActive: p.isActive,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingProduct) {
        const res = await updateProductAction(editingProduct.id, productForm);
        if (!res.success) {
          toastError(res.error || "Failed to update product");
          setIsSaving(false);
          return;
        }
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? { ...p, ...res.product } : p))
        );
        toastSuccess(`Updated "${res.product?.name}"!`);
      } else {
        const res = await createProductAction(productForm);
        if (!res.success) {
          toastError(res.error || "Failed to create product");
          setIsSaving(false);
          return;
        }
        if (res.product) {
          const newP: ProductItem = {
            ...res.product,
            currentStock: productForm.initialQuantity || 0,
            category: categories.find((c) => c.id === res.product?.categoryId) || null,
            supplier: suppliers.find((s) => s.id === res.product?.supplierId) || null,
          };
          setProducts((prev) => [newP, ...prev]);
        }
        toastSuccess(`Created product "${res.product?.name}"!`);
      }

      setIsProductModalOpen(false);
    } catch (err: any) {
      toastError(err.message || "Error saving product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await archiveProductAction(id);
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isArchived: !p.isArchived } : p))
        );
        toastSuccess("Product archive status toggled");
      }
    } catch (err: any) {
      toastError(err.message || "Failed to archive");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? If this product has transactions, it will be safely archived."))
      return;

    try {
      const res = await deleteProductAction(id);
      if (res.success) {
        if (res.archivedInstead) {
          setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, isArchived: true, isActive: false } : p))
          );
          toastSuccess(res.message);
        } else {
          setProducts((prev) => prev.filter((p) => p.id !== id));
          toastSuccess("Product deleted");
        }
      } else {
        toastError(res.error || "Failed to delete product");
      }
    } catch (err: any) {
      toastError(err.message || "Delete error");
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await createCategoryAction({ name: newCatName, color: newCatColor });
      if (res.success && res.category) {
        setCategories((prev) => [...prev, res.category]);
        setNewCatName("");
        toastSuccess(`Category "${res.category.name}" created!`);
      } else {
        toastError(res.error || "Failed to create category");
      }
    } catch (err: any) {
      toastError(err.message || "Category error");
    }
  };

  // CSV File Parse
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((r: any) => ({
          name: r["Name"] || r["name"] || r["Product Name"] || "",
          sku: r["SKU"] || r["sku"] || "",
          barcode: r["Barcode"] || r["barcode"] || "",
          category: r["Category"] || r["category"] || "",
          costPrice: Number(r["Cost Price"] || r["costPrice"] || 0),
          sellingPrice: Number(r["Selling Price"] || r["sellingPrice"] || 0),
          quantity: Number(r["Quantity"] || r["quantity"] || r["Stock"] || 0),
          minStock: Number(r["Minimum Stock"] || r["minStock"] || 5),
        }));

        setCsvRows(rows);
        setCsvErrors([]);
      },
      error: (err) => {
        toastError(`CSV parsing error: ${err.message}`);
      },
    });
  };

  const handleExecuteCsvImport = async () => {
    if (csvRows.length === 0) return;
    setIsImporting(true);

    try {
      const res = await importProductsCsvAction(csvRows);
      if (res.success) {
        toastSuccess(`Successfully imported ${res.importedCount} products!`);
        if (res.errors && res.errors.length > 0) {
          setCsvErrors(res.errors);
        } else {
          setIsCsvModalOpen(false);
          setCsvRows([]);
        }
        window.location.reload();
      } else {
        toastError(res.error || "Failed to import CSV");
      }
    } catch (err: any) {
      toastError(err.message || "Import error");
    } finally {
      setIsImporting(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const exportData = filteredProducts.map((p) => ({
      "Product Name": p.name,
      SKU: p.sku,
      Barcode: p.barcode || "",
      Category: p.category?.name || "Uncategorized",
      "Cost Price": p.costPrice,
      "Selling Price": p.sellingPrice,
      "Current Stock": p.currentStock,
      "Min Stock Level": p.minStockLevel,
      Unit: p.unit,
      Status: p.isArchived ? "Archived" : "Active",
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `StockFlow_Products_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess("Product catalog exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Product Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage SKUs, barcodes, categories, selling prices, and minimum stock alert thresholds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" size="md" onClick={() => setIsCategoryModalOpen(true)}>
            <Tag className="w-4 h-4 text-purple-400" />
            Categories
          </Button>

          <Button variant="secondary" size="md" onClick={() => setIsCsvModalOpen(true)}>
            <Upload className="w-4 h-4 text-blue-400" />
            Import CSV
          </Button>

          <Button variant="outline" size="md" onClick={handleExportCsv}>
            <Download className="w-4 h-4 text-slate-400" />
            Export
          </Button>

          <Button variant="primary" size="md" onClick={handleOpenAddProduct} className="font-bold">
            <Plus className="w-4 h-4" />
            New Product
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <Input
          placeholder="Search by name, SKU, or barcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700/80 text-slate-100 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={stockStatusFilter}
          onChange={(e) => setStockStatusFilter(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700/80 text-slate-100 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Stock Levels</option>
          <option value="ACTIVE">Active Only</option>
          <option value="IN">In Stock</option>
          <option value="LOW">Low Stock Alert</option>
          <option value="OUT">Out of Stock (0)</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.map((p) => {
                const isOut = p.currentStock <= 0;
                const isLow = p.currentStock <= p.minStockLevel && !isOut;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      p.isArchived ? "opacity-60 bg-slate-950/40" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-sm">{p.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="font-mono text-blue-400">{p.sku}</span>
                          {p.barcode && <span>• Barcode: {p.barcode}</span>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {p.category ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border"
                          style={{
                            backgroundColor: `${p.category.color}15`,
                            color: p.category.color || "#3b82f6",
                            borderColor: `${p.category.color}30`,
                          }}
                        >
                          {p.category.name}
                        </span>
                      ) : (
                        <span className="text-slate-500">Uncategorized</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-slate-400">
                      {formatCurrency(p.costPrice, "USD", currencySymbol)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-sm text-white">
                      {formatCurrency(p.sellingPrice, "USD", currencySymbol)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <Badge
                          variant={isOut ? "destructive" : isLow ? "warning" : "success"}
                          size="sm"
                        >
                          {p.currentStock} {p.unit}
                        </Badge>
                        <span className="text-[10px] text-slate-500 mt-0.5">Min: {p.minStockLevel}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Badge variant={p.isArchived ? "secondary" : "outline"} size="sm">
                        {p.isArchived ? "Archived" : "Active"}
                      </Badge>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditProduct(p)}
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(p.id)}
                          title={p.isArchived ? "Unarchive" : "Archive"}
                        >
                          <Archive className="w-3.5 h-3.5 text-amber-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(p.id)}
                          title="Delete / Safe Archive"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No products found matching your search and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT PRODUCT MODAL */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : "Create New Product"}
        description="Fill in product specs, pricing, barcodes, and inventory thresholds."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              required
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              autoFocus
            />

            <Input
              label="SKU Code"
              required
              value={productForm.sku}
              onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Barcode (UPC/EAN)"
              value={productForm.barcode}
              onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
            />

            <Select
              label="Category"
              value={productForm.categoryId}
              onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              label="Supplier"
              value={productForm.supplierId}
              onChange={(e) => setProductForm({ ...productForm, supplierId: e.target.value })}
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input
              label={`Cost Price (${currencySymbol})`}
              type="number"
              step="0.01"
              required
              value={productForm.costPrice}
              onChange={(e) => setProductForm({ ...productForm, costPrice: Number(e.target.value) })}
            />

            <Input
              label={`Selling Price (${currencySymbol})`}
              type="number"
              step="0.01"
              required
              value={productForm.sellingPrice}
              onChange={(e) => setProductForm({ ...productForm, sellingPrice: Number(e.target.value) })}
            />

            <Input
              label="Low-Stock Alert Level"
              type="number"
              value={productForm.minStockLevel}
              onChange={(e) => setProductForm({ ...productForm, minStockLevel: Number(e.target.value) })}
            />

            <Input
              label="Unit (pcs/pack/bottle)"
              value={productForm.unit}
              onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
            />
          </div>

          {!editingProduct && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold uppercase text-blue-400">Opening Stock Setup</span>
              <Input
                label="Initial Quantity on Hand"
                type="number"
                value={productForm.initialQuantity}
                onChange={(e) =>
                  setProductForm({ ...productForm, initialQuantity: Number(e.target.value) })
                }
                helperText="Will create an immutable Opening Stock movement in the inventory ledger."
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsProductModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              {editingProduct ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CATEGORY MANAGER MODAL */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Product Categories"
        description="Organize your products and sales reports with custom color tags."
        maxWidth="lg"
      >
        <div className="space-y-5">
          <form onSubmit={handleCreateCategory} className="flex gap-2 items-end">
            <Input
              label="New Category Name"
              placeholder="e.g. Footwear & Boots"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1"
            />
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Badge Color</label>
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="h-9 w-12 rounded cursor-pointer bg-slate-900 border border-slate-700 p-1"
              />
            </div>
            <Button type="submit" variant="primary" size="md">
              Add
            </Button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: c.color || "#3b82f6" }}
                  />
                  <span className="font-bold text-white">{c.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* CSV IMPORT MODAL */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Import Products via CSV"
        description="Upload a CSV spreadsheet with Name, SKU, Barcode, Category, Cost Price, Selling Price, and Quantity."
        maxWidth="3xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 border-2 border-dashed border-slate-700 rounded-xl text-center bg-slate-950/60">
            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-slate-300 font-semibold mb-1">Select CSV spreadsheet</p>
            <p className="text-[11px] text-slate-500 mb-3">
              Required headers: Name, SKU, Barcode, Category, Cost Price, Selling Price, Quantity
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFileUpload}
              className="text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
            />
          </div>

          {/* Validation Errors */}
          {csvErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Validation Errors Encountered:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 max-h-32 overflow-y-auto">
                {csvErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* CSV Preview Table */}
          {csvRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200">
                  Preview ({csvRows.length} rows ready to import)
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-950 text-slate-400 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Cost</th>
                      <th className="p-2">Price</th>
                      <th className="p-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {csvRows.slice(0, 10).map((r, i) => (
                      <tr key={i}>
                        <td className="p-2 font-semibold text-white">{r.name}</td>
                        <td className="p-2 font-mono text-blue-400">{r.sku || "Auto"}</td>
                        <td className="p-2">{r.category || "General"}</td>
                        <td className="p-2">${r.costPrice}</td>
                        <td className="p-2">${r.sellingPrice}</td>
                        <td className="p-2">{r.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                variant="success"
                size="lg"
                onClick={handleExecuteCsvImport}
                isLoading={isImporting}
                className="w-full font-bold mt-2"
              >
                Import {csvRows.length} Products & Initialize Inventory &rarr;
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
