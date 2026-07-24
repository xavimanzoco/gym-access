import { AccesosRecientes } from "@/components/ingreso/AccesosRecientes";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accesoService } from "@/lib/services/accesoService";
import { IngresoKiosk } from "@/app/ingreso/IngresoKiosk";

// Datos siempre frescos: es una pantalla en vivo.
export const dynamic = "force-dynamic";

export default function IngresoPage() {
  const recientes = accesoService.recientes(12);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        titulo="Ingreso"
        descripcion="El socio ingresa su DNI en el molinete para registrar el acceso."
      />

      <div className="grid flex-1 gap-6 p-8 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="flex h-full flex-col justify-center py-12">
            <IngresoKiosk />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Accesos recientes</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pt-2">
            <AccesosRecientes accesos={recientes} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
