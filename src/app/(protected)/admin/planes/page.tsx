import { Plus } from "lucide-react";

import { planService } from "@/lib/services/planService";
import { Button } from "@/components/ui/button";
import { PlanFormDialog } from "@/components/admin/planes/plan-form-dialog";
import { PlanesTable } from "@/components/admin/planes/planes-table";

export const dynamic = "force-dynamic";

export default function PlanesPage() {
  const planes = planService.getAll();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planes</h1>
          <p className="text-sm text-muted-foreground">
            Membresías con días y horarios habilitados
          </p>
        </div>
        <PlanFormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo plan
            </Button>
          }
        />
      </div>
      <PlanesTable planes={planes} />
    </div>
  );
}
