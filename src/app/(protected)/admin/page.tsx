import {
  CheckCircle2,
  DollarSign,
  Users,
  XCircle,
} from "lucide-react";

import { dashboardService } from "@/lib/services/dashboardService";
import { formatMoneda } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AccesosTable,
  type AccesoRow,
} from "@/components/admin/dashboard/accesos-table";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const r = dashboardService.resumen();

  const accesos = r.accesosDelDia.map(
    (a): AccesoRow => ({
      acceso: a.acceso,
      socioNombre: a.socioNombre,
      socioApellido: a.socioApellido,
    })
  );

  const kpis = [
    {
      label: "Socios activos",
      value: `${r.sociosActivos}`,
      hint: `de ${r.sociosTotal} totales`,
      icon: Users,
    },
    {
      label: "Accesos permitidos hoy",
      value: `${r.accesosPermitidos}`,
      hint: `${r.accesosHoy} intentos`,
      icon: CheckCircle2,
    },
    {
      label: "Accesos denegados hoy",
      value: `${r.accesosDenegados}`,
      hint: "rechazados",
      icon: XCircle,
    },
    {
      label: "Ingresos del mes",
      value: formatMoneda(r.ingresosMes),
      hint: "cuotas cobradas",
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
        <p className="text-sm text-muted-foreground">
          Actividad de hoy en el molinete
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{value}</div>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Accesos de hoy</h2>
        <AccesosTable rows={accesos} />
      </div>
    </div>
  );
}
