"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { DIAS_AVISO_VENCIMIENTO } from "@/lib/constants";
import { cn, formatearFecha } from "@/lib/utils";
import type { ResultadoAcceso } from "@/types";

/**
 * Cartelón de resultado a pantalla completa (verde/rojo). Se muestra ante cada
 * ingreso —venga del molinete o de la carga manual— en cualquier pantalla, para
 * que recepción lo vea aunque esté en otra sección. Se cierra solo o al hacer clic.
 */
export function AccesoOverlay({
  resultado,
  onClose,
}: {
  resultado: ResultadoAcceso;
  onClose: () => void;
}) {
  const { permitido, mensaje, socio, diasParaVencer } = resultado;
  const porVencer =
    permitido &&
    diasParaVencer !== null &&
    diasParaVencer <= DIAS_AVISO_VENCIMIENTO;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
    >
      <div
        className={cn(
          "flex w-full max-w-lg flex-col items-center gap-4 rounded-3xl px-10 py-16 text-center shadow-2xl",
          permitido
            ? "bg-emerald-500 text-white"
            : "bg-red-500 text-white",
        )}
      >
        {permitido ? (
          <CheckCircle2 className="h-28 w-28" />
        ) : (
          <XCircle className="h-28 w-28" />
        )}
        <p className="text-4xl font-bold">{mensaje}</p>

        {socio && (
          <p className="text-2xl font-medium">
            {socio.nombre} {socio.apellido}
          </p>
        )}

        {socio?.vencimiento && (
          <p className="text-base opacity-90">
            Cuota hasta el {formatearFecha(socio.vencimiento)}
          </p>
        )}

        {porVencer && (
          <p className="text-lg font-semibold">
            {diasParaVencer === 0
              ? "¡La cuota vence hoy!"
              : `La cuota vence en ${diasParaVencer} día(s)`}
          </p>
        )}
      </div>
    </div>
  );
}
