import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MENSAJE_POR_MOTIVO } from "@/lib/constants";
import { formatearHora } from "@/lib/utils";
import type { AccesoConSocio } from "@/lib/repositories/accesoRepository";

/** Lista de los últimos intentos de ingreso (permitidos y rechazados). */
export function AccesosRecientes({ accesos }: { accesos: AccesoConSocio[] }) {
  if (accesos.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm text-zinc-400">
        Todavía no hubo ingresos hoy.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {accesos.map((acceso) => {
        const nombre = acceso.socioNombre
          ? `${acceso.socioNombre} ${acceso.socioApellido}`
          : `DNI ${acceso.dniIngresado}`;

        return (
          <li key={acceso.id} className="flex items-center gap-3 py-3">
            {acceso.permitido ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-red-500" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {nombre}
              </p>
              <p className="text-xs text-zinc-400">
                {formatearHora(acceso.fechaHora)}
              </p>
            </div>
            <Badge tone={acceso.permitido ? "success" : "danger"}>
              {MENSAJE_POR_MOTIVO[acceso.motivo]}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
