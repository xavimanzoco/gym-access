import { Badge } from "@/components/ui/badge";
import { EliminarSocioBoton } from "@/components/socios/EliminarSocioBoton";
import { formatearFecha, hoyISO } from "@/lib/utils";
import type { Socio } from "@/types";

/** Estado visible de la cuota de un socio a la fecha. */
function estadoCuota(socio: Socio, hoy: string) {
  if (!socio.activo) return { texto: "Inactivo", tone: "neutral" as const };
  if (!socio.vencimiento || socio.vencimiento < hoy) {
    return { texto: "Cuota vencida", tone: "danger" as const };
  }
  return { texto: "Al día", tone: "success" as const };
}

interface SociosTableProps {
  socios: Socio[];
  /** Mapa id de plan → nombre, para mostrar el plan de cada socio. */
  planesById: Record<number, string>;
}

export function SociosTable({ socios, planesById }: SociosTableProps) {
  if (socios.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 py-16 text-center text-sm text-zinc-400 dark:border-zinc-800">
        No hay socios que coincidan.
      </div>
    );
  }

  const hoy = hoyISO();

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 font-medium">DNI</th>
            <th className="px-4 py-3 font-medium">Socio</th>
            <th className="px-4 py-3 font-medium">Plan</th>
            <th className="px-4 py-3 font-medium">Vencimiento</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {socios.map((socio) => {
            const estado = estadoCuota(socio, hoy);
            return (
              <tr
                key={socio.id}
                className="text-zinc-700 dark:text-zinc-300"
              >
                <td className="px-4 py-3 font-mono">{socio.dni}</td>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  {socio.nombre} {socio.apellido}
                </td>
                <td className="px-4 py-3">
                  {socio.planId ? (planesById[socio.planId] ?? "—") : "—"}
                </td>
                <td className="px-4 py-3">{formatearFecha(socio.vencimiento)}</td>
                <td className="px-4 py-3">
                  <Badge tone={estado.tone}>{estado.texto}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <EliminarSocioBoton
                    id={socio.id}
                    nombre={`${socio.nombre} ${socio.apellido}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
