"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Ancho de la tarjeta: `sm` para confirmaciones, `lg` para listados. */
type Ancho = "sm" | "lg";

const ANCHOS: Record<Ancho, string> = {
  sm: "max-w-sm",
  lg: "max-w-3xl",
};

interface ModalProps {
  abierto: boolean;
  onClose: () => void;
  ancho?: Ancho;
  children: ReactNode;
}

/** Overlay + tarjeta centrada, base de los carteles de confirmación/selección. */
export function Modal({
  abierto,
  onClose,
  ancho = "sm",
  children,
}: ModalProps) {
  if (!abierto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex max-h-[85vh] w-full flex-col rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900",
          ANCHOS[ancho],
        )}
      >
        {children}
      </div>
    </div>
  );
}
