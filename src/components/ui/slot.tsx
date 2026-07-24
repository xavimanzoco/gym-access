import { cloneElement, isValidElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SlotProps {
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
}

/**
 * Versión mínima de `Slot` (patrón Radix): fusiona las props recibidas sobre su
 * único hijo, combinando las clases. Permite `asChild` sin dependencias extra.
 */
export function Slot({ children, className, ...props }: SlotProps) {
  if (!isValidElement(children)) return null;

  const hijo = children as React.ReactElement<{ className?: string }>;
  return cloneElement(hijo, {
    ...props,
    ...hijo.props,
    className: cn(className, hijo.props.className),
  } as Record<string, unknown>);
}
