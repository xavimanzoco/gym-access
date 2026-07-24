import { PageHeader } from "@/components/layout/PageHeader";
import { PagoForm } from "@/components/pagos/PagoForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pagoService } from "@/lib/services/pagoService";
import { planService } from "@/lib/services/planService";
import { socioService } from "@/lib/services/socioService";
import { formatearMoneda, formatearHora } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function PagosPage() {
  const socios = socioService.listar();
  const planes = planService.listarActivos();
  const pagosHoy = pagoService.pagosDeHoy();
  const totalHoy = pagosHoy.reduce((suma, p) => suma + p.monto, 0);

  return (
    <div>
      <PageHeader
        titulo="Pagos"
        descripcion="Registrá el cobro de una cuota. Se actualiza el vencimiento del socio."
      />

      <div className="grid gap-6 p-8 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Nuevo pago</CardTitle>
          </CardHeader>
          <CardContent>
            {socios.length === 0 ? (
              <p className="py-6 text-sm text-zinc-400">
                Primero cargá socios en la sección Socios.
              </p>
            ) : (
              <PagoForm socios={socios} planes={planes} />
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cobros de hoy</CardTitle>
            <span className="text-sm font-semibold text-emerald-600">
              {formatearMoneda(totalHoy)}
            </span>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pt-2">
            {pagosHoy.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">
                Sin cobros registrados hoy.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pagosHoy.map((pago) => (
                  <li
                    key={pago.id}
                    className="flex items-center justify-between gap-2 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {pago.socioApellido} {pago.socioNombre}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {formatearHora(pago.creadoEn)} · {pago.metodo}
                      </p>
                    </div>
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
  );
}
