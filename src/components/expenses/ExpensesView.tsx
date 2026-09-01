"use client";

import * as React from "react";
import {
  DollarSign,
  Plus,
  Search,
  Calendar,
  CreditCard,
  Building,
  Tag,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createExpenseAction, deleteExpenseAction } from "@/actions/expense-actions";

export interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  date: string | Date;
  description: string;
  paymentMethod: string;
  reference: string | null;
  creatorName: string;
}

interface ExpensesViewProps {
  initialExpenses: ExpenseItem[];
  currencySymbol: string;
}

export function ExpensesView({ initialExpenses, currencySymbol }: ExpensesViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [expenses, setExpenses] = React.useState<ExpenseItem[]>(initialExpenses);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    category: "RENT" as any,
    amount: 100,
    date: new Date().toISOString().split("T")[0],
    description: "",
    paymentMethod: "BANK_TRANSFER",
    reference: "",
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.reference && e.reference.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCategory = categoryFilter === "ALL" || e.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [expenses, searchQuery, categoryFilter]);

  const totalExpenseSum = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toastError("Description is required");
      return;
    }
    if (formData.amount <= 0) {
      toastError("Amount must be greater than 0");
      return;
    }

    setIsSaving(true);
    try {
      const res = await createExpenseAction(formData);
      if (!res.success) {
        toastError(res.error || "Failed to record expense");
        setIsSaving(false);
        return;
      }

      if (res.expense) {
        const newE: ExpenseItem = {
          id: res.expense.id,
          category: res.expense.category,
          amount: res.expense.amount,
          date: res.expense.date.toString(),
          description: res.expense.description,
          paymentMethod: res.expense.paymentMethod,
          reference: res.expense.reference,
          creatorName: "You",
        };
        setExpenses((prev) => [newE, ...prev]);
      }

      toastSuccess("Expense logged successfully!");
      setIsModalOpen(false);
    } catch (err: any) {
      toastError(err.message || "Error logging expense");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this expense?")) return;
    try {
      const res = await deleteExpenseAction(id);
      if (res.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        toastSuccess("Expense removed");
      }
    } catch (err: any) {
      toastError(err.message || "Delete error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Operating Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Record rent, utilities, salaries, marketing, and freight overhead costs to calculate net profitability.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsModalOpen(true)}
          className="font-bold"
        >
          <Plus className="w-4 h-4" />
          Log Expense
        </Button>
      </div>

      {/* Summary KPI */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 font-semibold uppercase">Total Operating Expenses Logged</span>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {formatCurrency(totalExpenseSum, "USD", currencySymbol)}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <TrendingDown className="w-6 h-6" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <Input
          placeholder="Search by description or receipt reference..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700/80 text-slate-100 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Categories</option>
          <option value="RENT">Rent & Lease</option>
          <option value="SALARIES">Staff Salaries</option>
          <option value="UTILITIES">Electricity & Internet</option>
          <option value="MARKETING">Marketing & Advertising</option>
          <option value="PACKAGING">Packaging Supplies</option>
          <option value="TRANSPORT">Courier & Transport</option>
          <option value="MAINTENANCE">Repairs & Maintenance</option>
          <option value="OTHER">Other Expenses</option>
        </select>
      </div>

      {/* Expenses Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 text-slate-400">{formatDate(exp.date)}</td>
                  <td className="py-3 px-4">
                    <Badge variant="purple" size="sm">
                      {exp.category}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-medium text-white">{exp.description}</td>
                  <td className="py-3 px-4 text-slate-300">{exp.paymentMethod}</td>
                  <td className="py-3 px-4 text-right font-bold text-sm text-rose-400">
                    -{formatCurrency(exp.amount, "USD", currencySymbol)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(exp.id)}
                      title="Delete Expense"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No expenses match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Operating Expense"
        description="Enter expense details for accurate profit & loss reports."
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Expense Category"
              value={formData.category}
              onChange={(e: any) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="RENT">Rent & Store Lease</option>
              <option value="SALARIES">Staff Salaries & Payroll</option>
              <option value="UTILITIES">Electricity & Internet</option>
              <option value="MARKETING">Marketing & Social Ads</option>
              <option value="PACKAGING">Packaging & Thermal Rolls</option>
              <option value="TRANSPORT">Courier Freight Delivery</option>
              <option value="MAINTENANCE">Repairs & Maintenance</option>
              <option value="OTHER">Other Overhead</option>
            </Select>

            <Input
              label={`Amount (${currencySymbol})`}
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Expense Description"
            required
            placeholder="e.g. Monthly downtown store rent invoice"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Expense Date"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />

            <Select
              label="Payment Method"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
              <option value="BANK_TRANSFER">Bank Wire Transfer</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="CASH">Cash Register / Petty Cash</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </Select>
          </div>

          <Input
            label="Receipt Reference / Invoice #"
            placeholder="e.g. INV-89231"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving} className="font-bold">
              Save Expense &rarr;
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
