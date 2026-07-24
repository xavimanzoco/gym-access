import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tono = "success" | "danger" | "warning" | "neutral";

const TONOS: Record<Tono, string> = {
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tono;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONOS[tone],
        className,
      )}
      {...props}
    />
  );
}
