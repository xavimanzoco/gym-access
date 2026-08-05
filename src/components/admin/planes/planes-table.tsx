"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { eliminarPlan } from "@/lib/actions/planActions";
import { type Plan } from "@/lib/db/schema";
import { formatDias, formatMoneda } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PlanFormDialog } from "@/components/admin/planes/plan-form-dialog";

async function onEliminar(id: number) {
  if (!confirm("¿Eliminar este plan?")) return;
  const res = await eliminarPlan(id);
  if (res.ok) toast.success("Plan eliminado");
  else toast.error(res.error);
}

export function PlanesTable({ planes }: { planes: Plan[] }) {
  const columns: ColumnDef<Plan>[] = [
    { accessorKey: "nombre", header: "Nombre" },
    {
      id: "precio",
      header: "Precio",
      cell: ({ row }) => formatMoneda(row.original.precio),
    },
    {
      id: "dias",
      header: "Días",
      cell: ({ row }) => formatDias(row.original.diasAcceso),
    },
    {
      id: "horario",
      header: "Horario",
      cell: ({ row }) => {
        const { horaDesde, horaHasta } = row.original;
        if (!horaDesde && !horaHasta) return "Sin restricción";
        return `${horaDesde ?? "00:00"} - ${horaHasta ?? "23:59"}`;
      },
    },
    {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={row.original.activo ? "default" : "outline"}>
          {row.original.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <PlanFormDialog
            plan={row.original}
            trigger={
              <Button variant="ghost" size="icon" title="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            title="Eliminar"
            onClick={() => onEliminar(row.original.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={planes}
      emptyMessage="Todavía no hay planes"
    />
  );
}
