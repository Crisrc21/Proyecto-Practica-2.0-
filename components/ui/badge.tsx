import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "success" | "warning" | "danger" | "muted";
}

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
        tone === "default" && "bg-primary/10 text-primary ring-primary/20",
        tone === "success" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
        tone === "warning" && "bg-amber-50 text-amber-800 ring-amber-200",
        tone === "danger" && "bg-red-50 text-red-700 ring-red-200",
        tone === "muted" && "bg-muted text-muted-foreground ring-border",
        className
      )}
      {...props}
    />
  );
}
