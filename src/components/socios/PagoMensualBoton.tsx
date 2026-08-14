"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Landmark, type LucideIcon } from "lucide-react";
import { pagarMensual } from "@/app/socios/actions";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type MetodoRapido = "efectivo" | "transferencia";

const METODOS: { valor: MetodoRapido; etiqueta: string; icono: LucideIcon }[] = [
  { valor: "efectivo", etiqueta: "Efectivo", icono: Banknote },
  { valor: "transferencia", etiqueta: "Transferencia", icono: Landmark },
];

interface PagoMensualBotonProps {
  id: number;
  nombre: string;
  /** "icono" (por defecto, botón chico para la tabla) o "texto" (para el detalle del socio). */
  variante?: "icono" | "texto";
}

/** Pago rápido: elegís el método (Efectivo/Transferencia) y cobra el plan Mensual, extendiendo la cuota. */
export function PagoMensualBoton({
  id,
  nombre,
  variante = "icono",
}: PagoMensualBotonProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [metodo, setMetodo] = useState<MetodoRapido>("efectivo");
  const [pendiente, startTransition] = useTransition();

  function confirmar() {
    const datos = new FormData();
    datos.set("id", String(id));
    datos.set("metodo", metodo);
    startTransition(async () => {
      await pagarMensual(datos);
      router.refresh();
      setAbierto(false);
    });
  }

  return (
    <>
      {variante === "texto" ? (
        <button
          type="button"
          aria-label={`Registrar pago mensual de ${nombre}`}
          onClick={() => setAbierto(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
        >
          <CreditCard className="h-4 w-4" />
          Registrar pago mensual
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Registrar pago mensual de ${nombre}`}
          onClick={() => setAbierto(true)}
          className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950"
        >
          <CreditCard className="h-4 w-4" />
        </button>
      )}

      <Modal abierto={abierto} onClose={() => setAbierto(false)}>
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
          Pago mensual de {nombre}
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Elegí el método de pago.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {METODOS.map(({ valor, etiqueta, icono: Icono }) => (
            <button
              key={valor}
              type="button"
              onClick={() => setMetodo(valor)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 text-sm font-medium transition-colors",
                metodo === valor
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400",
              )}
            >
              <Icono className="h-5 w-5" />
              {etiqueta}
            </button>
          ))}
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
            onClick={confirmar}
            disabled={pendiente}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {pendiente ? "Registrando…" : "Registrar pago"}
          </button>
        </div>
      </Modal>
    </>
  );
}
