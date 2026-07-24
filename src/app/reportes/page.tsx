import { AlertTriangle, DollarSign, DoorOpen, Users } from "lucide-react";
import { AccesosRecientes } from "@/components/ingreso/AccesosRecientes";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/reportes/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reporteService } from "@/lib/services/reporteService";
import { formatearFecha, formatearMoneda } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function ReportesPage() {
  const resumen = reporteService.resumenDelDia();

  return (
    <div>
      <PageHeader
        titulo="Reportes"
        descripcion={`Resumen del ${formatearFecha(resumen.fecha)}`}
      />

      <div className="space-y-6 p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            etiqueta="Recaudación de hoy"
            valor={formatearMoneda(resumen.recaudacion)}
            icono={DollarSign}
            tono="emerald"
          />
          <StatCard
            etiqueta="Ingresos de hoy"
            valor={resumen.ingresosPermitidos}
            icono={DoorOpen}
            tono="indigo"
          />
          <StatCard
            etiqueta="Socios activos"
            valor={resumen.sociosActivos}
            icono={Users}
            tono="indigo"
          />
          <StatCard
            etiqueta="Cuotas vencidas"
            valor={resumen.sociosVencidos}
            icono={AlertTriangle}
            tono="amber"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Últimos accesos</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <AccesosRecientes accesos={resumen.accesosRecientes} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cobros de hoy</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {resumen.pagos.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">
                  Sin cobros registrados hoy.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {resumen.pagos.map((pago) => (
                    <li
                      key={pago.id}
                      className="flex items-center justify-between gap-2 py-3"
                    >
                      <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {pago.socioApellido} {pago.socioNombre}
                      </span>
                      <span className="text-sm font-medium">
                        {formatearMoneda(pago.monto)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
