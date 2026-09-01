import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  change,
  trend = "neutral",
  icon: Icon,
  iconColor = "text-blue-400",
  iconBg = "bg-blue-500/10 border-blue-500/20",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-800/90 bg-slate-900/80 p-5 shadow-xl hover:border-slate-700/80 transition-all duration-300 backdrop-blur-xl hover:-translate-y-1 relative overflow-hidden group",
        "before:absolute before:inset-0 before:bg-gradient-to-tr before:from-white/[0.02] before:to-transparent before:pointer-events-none",
        className
      )}
    >
      <div className="flex items-center justify-between relative z-10">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</span>
        <div
          className={cn(
            "p-3 rounded-xl border flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110",
            iconBg
          )}
        >
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
      </div>
      <div className="mt-4 relative z-10">
        <div className="text-3xl font-extrabold tracking-tight text-white">{value}</div>
        {(subtitle || change) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {change && (
              <span
                className={cn(
                  "font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]",
                  trend === "up" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                  trend === "down" && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                  trend === "neutral" && "bg-slate-800 text-slate-400"
                )}
              >
                {trend === "up" && <TrendingUp className="w-3 h-3" />}
                {trend === "down" && <TrendingDown className="w-3 h-3" />}
                {change}
              </span>
            )}
            {subtitle && <span className="text-slate-400 text-[11px]">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
