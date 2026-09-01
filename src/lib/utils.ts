import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "USD", symbol: string = "$"): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

  return `${symbol}${formatted}`;
}

export function formatDate(date: Date | string | number, formatStr: string = "MMM dd, yyyy"): string {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  try {
    return format(d, formatStr);
  } catch {
    return "-";
  }
}

export function formatDateTime(date: Date | string | number): string {
  return formatDate(date, "MMM dd, yyyy HH:mm");
}

export function generateReceiptNumber(prefix: string = "REC"): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timestamp}-${random}`;
}

export function generateOrderNumber(prefix: string = "PO"): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${timestamp}-${random}`;
}

export function generateSKU(categoryName?: string, name?: string): string {
  const catCode = categoryName ? categoryName.substring(0, 3).toUpperCase() : "PRD";
  const nameCode = name ? name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase() : "GEN";
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${catCode}-${nameCode}-${random}`;
}

export function generateBarcode(): string {
  // Generate 12-digit UPC-A style barcode
  let code = "89";
  for (let i = 0; i < 10; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}
