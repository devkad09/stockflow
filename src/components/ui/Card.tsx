import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  glow?: "indigo" | "emerald" | "purple" | "none";
}

export function Card({ className, glass = false, glow = "none", ...props }: CardProps) {
  const glowStyles = {
    none: "",
    indigo: "glow-indigo border-indigo-500/30",
    emerald: "glow-emerald border-emerald-500/30",
    purple: "glow-purple border-purple-500/30",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-800/90 bg-slate-900/80 p-5 shadow-xl text-slate-100 backdrop-blur-xl transition-all duration-200 relative overflow-hidden",
        "before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.03] before:to-transparent before:pointer-events-none",
        glass && "glass-card",
        glowStyles[glow],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 pb-4 relative z-10", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-bold leading-none tracking-tight text-white", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-slate-400 mt-1", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-0 relative z-10", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center pt-4 border-t border-slate-800/80 relative z-10", className)} {...props} />;
}
