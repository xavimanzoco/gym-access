"use client";

import { useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface ConfirmFormButtonProps {
  /** Server action a la que se envía el form al confirmar. */
  action: (formData: FormData) => void | Promise<void>;
  /** Campos ocultos que viajan en el form (ej. `{ id: socio.id }`). */
  campos: Record<string, string | number>;
  icono: LucideIcon;
  ariaLabel: string;
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  tone?: "danger" | "success";
  /** "icono" (por defecto, botón chico solo con ícono) o "texto" (botón con etiqueta visible). */
  variante?: "icono" | "texto";
  /** Texto del botón cuando `variante="texto"`. */
  etiqueta?: string;
}

const TONE = {
  danger: {
    icono: "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950",
    texto:
      "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900",
    confirmar: "bg-red-600 hover:bg-red-700",
  },
  success: {
    icono: "hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950",
    texto:
      "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900",
    confirmar: "bg-emerald-600 hover:bg-emerald-700",
  },
};

/** Botón de ícono que pide confirmación en un cartel propio antes de disparar una server action. */
export function ConfirmFormButton({
  action,
  campos,
  icono: Icono,
  ariaLabel,
  titulo,
  mensaje,
  textoConfirmar,
  tone = "danger",
  variante = "icono",
  etiqueta,
}: ConfirmFormButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <form ref={formRef} action={action}>
        {Object.entries(campos).map(([nombre, valor]) => (
          <input key={nombre} type="hidden" name={nombre} value={valor} />
        ))}
        {variante === "texto" ? (
          <button
            type="button"
            aria-label={ariaLabel}
            onClick={() => setAbierto(true)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              TONE[tone].texto,
            )}
          >
            <Icono className="h-4 w-4" />
            {etiqueta}
          </button>
        ) : (
          <button
            type="button"
            aria-label={ariaLabel}
            onClick={() => setAbierto(true)}
            className={cn(
              "rounded-md p-2 text-zinc-400 transition-colors",
              TONE[tone].icono,
            )}
          >
            <Icono className="h-4 w-4" />
          </button>
        )}
      </form>

      <Modal abierto={abierto} onClose={() => setAbierto(false)}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              tone === "danger"
                ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
            )}
          >
            <Icono className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              {titulo}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {mensaje}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              formRef.current?.requestSubmit();
            }}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
              TONE[tone].confirmar,
            )}
          >
            {textoConfirmar}
          </button>
        </div>
      </Modal>
    </>
  );
}
