import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActivoToggleBoton } from "@/components/socios/ActivoToggleBoton";
import { EliminarSocioBoton } from "@/components/socios/EliminarSocioBoton";
import { PagoMensualBoton } from "@/components/socios/PagoMensualBoton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotFoundError } from "@/lib/errors/AppError";
import { pagoService } from "@/lib/services/pagoService";
import { socioService } from "@/lib/services/socioService";
import { formatearFecha, formatearMoneda, hoyISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Estado visible de la cuota de un socio a la fecha. */
function estadoCuota(activo: boolean, vencimiento: string | null, hoy: string) {
  if (!activo) return { texto: "Inactivo", tone: "neutral" as const };
  if (!vencimiento || vencimiento < hoy) {
    return { texto: "Cuota vencida", tone: "danger" as const };
  }
  return { texto: "Al día", tone: "success" as const };
}

export default async function SocioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const socioId = Number(id);
  if (!Number.isInteger(socioId)) notFound();

  let socio;
  try {
    socio = socioService.obtener(socioId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const nombre = `${socio.nombre} ${socio.apellido}`;
  const estado = estadoCuota(socio.activo, socio.vencimiento, hoyISO());
  const pagos = pagoService.historialDeSocio(socioId);

  return (
    <div>
      <PageHeader
        titulo={nombre}
        descripcion={socio.dni ? `DNI ${socio.dni}` : "Sin DNI cargado"}
        acciones={
          <Link
            href="/socios"
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        }
      />

      <div className="grid gap-6 p-8 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Datos del socio</CardTitle>
            <Badge tone={estado.tone}>{estado.texto}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-zinc-400">Teléfono</p>
                <p className="text-zinc-800 dark:text-zinc-200">
                  {socio.telefono ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Email</p>
                <p className="text-zinc-800 dark:text-zinc-200">
                  {socio.email ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Fecha de nacimiento</p>
                <p className="text-zinc-800 dark:text-zinc-200">
                  {formatearFecha(socio.fechaNacimiento)}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Vencimiento de cuota</p>
                <p className="text-zinc-800 dark:text-zinc-200">
                  {formatearFecha(socio.vencimiento)}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Socio desde</p>
                <p className="text-zinc-800 dark:text-zinc-200">
                  {formatearFecha(socio.fechaAlta)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4">
              <PagoMensualBoton id={socio.id} nombre={nombre} variante="texto" />
              <ActivoToggleBoton
                id={socio.id}
                nombre={nombre}
                activo={socio.activo}
              />
              <EliminarSocioBoton id={socio.id} nombre={nombre} />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Historial de pagos</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pt-2">
            {pagos.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">
                Sin pagos registrados.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pagos.map((pago) => (
                  <li key={pago.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {formatearFecha(pago.fechaPago)} · {pago.metodo}
                      </p>
                      <span className="text-sm font-medium">
                        {formatearMoneda(pago.monto)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Cubre hasta {formatearFecha(pago.periodoHasta)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
