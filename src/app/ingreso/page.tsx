import { AccesosRecientes } from "@/components/ingreso/AccesosRecientes";
import { DejarPasarBoton } from "@/components/ingreso/DejarPasarBoton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accesoService } from "@/lib/services/accesoService";
import { IngresoKiosk } from "@/app/ingreso/IngresoKiosk";

/** Cuántos accesos recientes se muestran en el panel del kiosco. */
const CANTIDAD_RECIENTES = 5;

// Datos siempre frescos: es una pantalla en vivo.
export const dynamic = "force-dynamic";

export default function IngresoPage() {
  const recientes = accesoService.recientes(CANTIDAD_RECIENTES);

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

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Últimos ingresos</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <AccesosRecientes accesos={recientes} />
            </CardContent>
          </Card>

          <DejarPasarBoton />
        </div>
      </div>
    </div>
  );
}
