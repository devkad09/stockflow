"use client";

import * as React from "react";
import { History, Search, User, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  userName: string;
  createdAt: string | Date;
}

interface AuditLogsViewProps {
  initialLogs: AuditLogItem[];
}

export function AuditLogsView({ initialLogs }: AuditLogsViewProps) {
  const [logs, setLogs] = React.useState<AuditLogItem[]>(initialLogs);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("ALL");

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
        log.userName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchAction = actionFilter === "ALL" || log.action === actionFilter;

      return matchSearch && matchAction;
    });
  }, [logs, searchQuery, actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Activity & Security Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Immutable chronicle of all product creations, stock adjustments, POS sales, refunds, and settings updates.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <Input
          placeholder="Search by action, user, or details..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700/80 text-slate-100 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Audit Actions</option>
          <option value="USER_LOGIN">User Logins</option>
          <option value="SALE_COMPLETE">Sales Completed</option>
          <option value="REFUND_PROCESS">Refunds Processed</option>
          <option value="STOCK_ADJUST">Stock Adjustments</option>
          <option value="PO_RECEIVE">Purchase Receiving</option>
          <option value="PRODUCT_CREATE">Product Creations</option>
          <option value="PRODUCT_UPDATE">Product Updates</option>
          <option value="EXPENSE_CREATE">Expenses Logged</option>
          <option value="MEMBER_INVITE">Member Invitations</option>
          <option value="SETTINGS_UPDATE">Settings Updates</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Event Details & Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        log.action.includes("SALE") || log.action.includes("RECEIVE")
                          ? "success"
                          : log.action.includes("REFUND")
                          ? "warning"
                          : log.action.includes("SETTINGS")
                          ? "purple"
                          : "default"
                      }
                      size="sm"
                    >
                      {log.action}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">{log.userName}</td>
                  <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                    {log.entityType || "-"}
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono text-[11px] max-w-md truncate">
                    {log.details || "-"}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No activity logs match the search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
