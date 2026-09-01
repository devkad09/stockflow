"use client";

import * as React from "react";
import {
  UserCheck,
  Plus,
  Shield,
  Mail,
  Trash2,
  Lock,
  User,
  Crown,
  Key,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import {
  inviteMemberAction,
  updateMemberRoleAction,
  removeMemberAction,
} from "@/actions/team-actions";

export interface TeamMemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string | Date;
}

interface TeamViewProps {
  initialMembers: TeamMemberItem[];
  currentUserRole: string;
  currentUserId: string;
}

export function TeamView({ initialMembers, currentUserRole, currentUserId }: TeamViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [members, setMembers] = React.useState<TeamMemberItem[]>(initialMembers);

  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    role: "CASHIER" as "ADMIN" | "MANAGER" | "CASHIER" | "INVENTORY_STAFF",
    password: "password123",
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await inviteMemberAction(formData);
      if (!res.success) {
        toastError(res.error || "Failed to invite member");
        setIsSaving(false);
        return;
      }

      toastSuccess(`Team member "${formData.name}" added as ${formData.role}!`);
      setIsInviteModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      toastError(err.message || "Error inviting member");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await updateMemberRoleAction(memberId, newRole);
      if (res.success) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
        toastSuccess("Role updated successfully!");
      } else {
        toastError(res.error || "Failed to update role");
      }
    } catch (err: any) {
      toastError(err.message || "Error updating role");
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this staff member from your business?")) return;

    try {
      const res = await removeMemberAction(memberId);
      if (res.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        toastSuccess("Team member removed");
      } else {
        toastError(res.error || "Failed to remove member");
      }
    } catch (err: any) {
      toastError(err.message || "Error removing member");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Employees & Role Permissions (RBAC)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Granular role-based access control for cashiers, managers, inventory staff, and administrators.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsInviteModalOpen(true)}
          className="font-bold"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </Button>
      </div>

      {/* Permissions Matrix Reference Card */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-blue-400" />
          Server-Side Role Permissions Matrix
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-amber-400 block">👑 Owner</span>
            <p className="text-slate-400">Full workspace access & SaaS billing</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-blue-400 block">🛡️ Admin</span>
            <p className="text-slate-400">All business operations & settings</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-purple-400 block">📊 Manager</span>
            <p className="text-slate-400">Sales, Inventory, POs & Reports</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400 block">💳 Cashier</span>
            <p className="text-slate-400">POS checkout & customer lookup</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-cyan-400 block">📦 Inventory Staff</span>
            <p className="text-slate-400">Stock adjustments & purchase receiving</p>
          </div>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Work Email</th>
                <th className="py-3 px-4">Role Permission</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-white text-sm flex items-center gap-2">
                    {m.role === "OWNER" ? (
                      <Crown className="w-4 h-4 text-amber-400" />
                    ) : (
                      <User className="w-4 h-4 text-slate-400" />
                    )}
                    {m.name}
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{m.email}</td>
                  <td className="py-3 px-4">
                    {m.role === "OWNER" ? (
                      <Badge variant="warning" size="sm">
                        OWNER
                      </Badge>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="CASHIER">CASHIER</option>
                        <option value="INVENTORY_STAFF">INVENTORY_STAFF</option>
                      </select>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="success" size="sm">
                      {m.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{formatDate(m.createdAt)}</td>
                  <td className="py-3 px-4 text-center">
                    {m.role !== "OWNER" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(m.id)}
                        title="Remove Employee"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INVITE MODAL */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Add Team Member"
        description="Create employee login credentials and assign role permissions."
      >
        <form onSubmit={handleInvite} className="space-y-4 text-xs">
          <Input
            label="Employee Full Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />

          <Input
            label="Work Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Select
            label="Assigned RBAC Role"
            value={formData.role}
            onChange={(e: any) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="CASHIER">Cashier (POS & Sales)</option>
            <option value="INVENTORY_STAFF">Inventory Staff (Products & Stock)</option>
            <option value="MANAGER">Manager (Sales, Stock & Reports)</option>
            <option value="ADMIN">Administrator (Full Access)</option>
          </Select>

          <Input
            label="Temporary Password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            helperText="The employee can sign in with this temporary password."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving} className="font-bold">
              Add Staff Member &rarr;
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
