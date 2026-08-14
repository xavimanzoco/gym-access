"use client";

import type { ReactNode } from "react";

interface ModalProps {
  abierto: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Overlay + tarjeta centrada, base de los carteles de confirmación/selección. */
export function Modal({ abierto, onClose, children }: ModalProps) {
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
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
      >
        {children}
      </div>
    </div>
  );
}
