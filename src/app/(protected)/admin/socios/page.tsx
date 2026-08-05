import { Plus } from "lucide-react";

import { planService } from "@/lib/services/planService";
import { socioService } from "@/lib/services/socioService";
import { Button } from "@/components/ui/button";
import { SocioFormDialog } from "@/components/admin/socios/socio-form-dialog";
import {
  SociosTable,
  type SocioRow,
} from "@/components/admin/socios/socios-table";

export const dynamic = "force-dynamic";

export default function SociosPage() {
  const rows = socioService.getAll().map(
    (r): SocioRow => ({ socio: r.socio, planNombre: r.planNombre })
  );
  const planes = planService.getAll().map((p) => ({
    id: p.id,
    nombre: p.nombre,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Socios</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} socio{rows.length === 1 ? "" : "s"} registrado
            {rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <SocioFormDialog
          planes={planes}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo socio
            </Button>
          }
        />
      </div>
      <SociosTable rows={rows} planes={planes} />
    </div>
  );
}
