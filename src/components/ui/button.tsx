import { Slot } from "@/components/ui/slot";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variante = "primary" | "outline" | "ghost" | "destructive";
type Tamano = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm",
  outline:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  ghost:
    "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
  destructive: "bg-red-600 text-white hover:bg-red-500 shadow-sm",
};

const TAMANOS: Record<Tamano, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variante;
  size?: Tamano;
  /** Renderiza el hijo (ej: un `<Link>`) con los estilos del botón. */
  asChild?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50",
        VARIANTES[variant],
        TAMANOS[size],
        className,
      )}
      {...props}
    />
  );
}
