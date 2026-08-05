import { Plus } from "lucide-react";

import { pagoService } from "@/lib/services/pagoService";
import { socioService } from "@/lib/services/socioService";
import { Button } from "@/components/ui/button";
import { PagoFormDialog } from "@/components/admin/pagos/pago-form-dialog";
import {
  PagosTable,
  type PagoRow,
} from "@/components/admin/pagos/pagos-table";

export const dynamic = "force-dynamic";

export default function PagosPage() {
  const rows = pagoService.getAll().map(
    (r): PagoRow => ({
      pago: r.pago,
      socioNombre: r.socioNombre,
      socioApellido: r.socioApellido,
      socioDni: r.socioDni,
    })
  );

  const socios = socioService.getAll().map((r) => ({
    id: r.socio.id,
    nombre: r.socio.nombre,
    apellido: r.socio.apellido,
    dni: r.socio.dni,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
          <p className="text-sm text-muted-foreground">
            Cuotas registradas y vencimientos
          </p>
        </div>
        <PagoFormDialog
          socios={socios}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              Registrar pago
            </Button>
          }
        />
      </div>
      <PagosTable rows={rows} />
    </div>
  );
}
