import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  helper?: string;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "warning" | "success";
  className?: string;
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-card text-foreground",
  primary: "bg-primary text-primary-foreground",
  warning: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  success: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
};

export function StatCard({ label, value, helper, icon: Icon, tone = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border p-4",
        toneStyles[tone],
        tone === "primary" && "border-transparent",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {label}
        </span>
        {Icon && <Icon className={cn("size-4", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")} />}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {helper && (
        <div className={cn("mt-1 text-xs", tone === "primary" ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {helper}
        </div>
      )}
    </div>
  );
}
