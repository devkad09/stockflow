import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "glass";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-xl active:scale-[0.98]";

    const variants = {
      primary:
        "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border border-white/10 hover:shadow-indigo-500/40 hover:-translate-y-0.5",
      secondary:
        "bg-slate-800/90 hover:bg-slate-700/90 text-slate-100 focus:ring-slate-500 border border-slate-700/80 shadow-sm hover:border-slate-600",
      outline:
        "bg-slate-900/40 hover:bg-slate-800/80 text-slate-200 border border-slate-700/80 focus:ring-slate-500 backdrop-blur-sm",
      ghost:
        "bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white focus:ring-slate-500",
      destructive:
        "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-600/25 border border-rose-400/20 focus:ring-rose-500 hover:-translate-y-0.5",
      success:
        "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 border border-emerald-400/20 focus:ring-emerald-500 hover:-translate-y-0.5",
      glass:
        "glass-card hover:bg-slate-800/80 text-white shadow-sm border border-white/10 hover:border-white/20",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5 rounded-lg",
      md: "text-xs px-4 py-2.5 gap-2",
      lg: "text-sm px-5 py-3 gap-2.5 rounded-2xl",
      icon: "p-2 w-9 h-9 rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
