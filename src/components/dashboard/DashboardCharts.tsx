"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";

interface ChartDataPoint {
  date: string;
  sales: number;
  profit: number;
}

interface CategoryDataPoint {
  name: string;
  value: number;
  color: string;
}

interface DashboardChartsProps {
  salesProfitData: ChartDataPoint[];
  categoryData: CategoryDataPoint[];
  currencySymbol: string;
}

export function DashboardCharts({
  salesProfitData,
  categoryData,
  currencySymbol,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 7-Day Revenue & Gross Profit Trend */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Sales & Gross Profit Trend</CardTitle>
            <CardDescription>Daily revenue vs estimated profit (Gross)</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesProfitData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `${currencySymbol}${val}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "0.75rem",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
                formatter={(value: any, name: string) => [
                  formatCurrency(Number(value), "USD", currencySymbol),
                  name === "sales" ? "Revenue" : "Gross Profit",
                ]}
              />
              <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" name="sales" />
              <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" name="profit" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sales by Category Donut */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Sales by Category</CardTitle>
          <CardDescription>Month-to-date revenue share</CardDescription>
        </CardHeader>
        <CardContent className="h-72 w-full flex items-center justify-center pt-2">
          {categoryData && categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || "#3b82f6"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => formatCurrency(Number(value), "USD", currencySymbol)}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-xs text-slate-400 py-12">
              No category sales recorded this month yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
