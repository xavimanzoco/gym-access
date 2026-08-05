"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { eliminarSocio } from "@/lib/actions/socioActions";
import { type EstadoSocio, type Socio } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { SocioFormDialog } from "@/components/admin/socios/socio-form-dialog";
import { PagoFormDialog } from "@/components/admin/pagos/pago-form-dialog";

export type SocioRow = {
  socio: Socio;
  planNombre: string | null;
};

type PlanOpcion = { id: number; nombre: string };
type SocioOpcion = { id: number; nombre: string; apellido: string; dni: string };

const estadoVariant: Record<
  EstadoSocio,
  "default" | "secondary" | "destructive" | "outline"
> = {
  activo: "default",
  suspendido: "secondary",
  inactivo: "outline",
};

async function onEliminar(id: number) {
  if (!confirm("¿Eliminar este socio? Esta acción no se puede deshacer.")) {
    return;
  }
  const res = await eliminarSocio(id);
  if (res.ok) toast.success("Socio eliminado");
  else toast.error(res.error);
}

export function SociosTable({
  rows,
  planes,
}: {
  rows: SocioRow[];
  planes: PlanOpcion[];
}) {
  const sociosOpciones: SocioOpcion[] = rows.map((r) => ({
    id: r.socio.id,
    nombre: r.socio.nombre,
    apellido: r.socio.apellido,
    dni: r.socio.dni,
  }));

  const columns: ColumnDef<SocioRow>[] = [
    {
      accessorKey: "socio.dni",
      header: "DNI",
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">
          {row.original.socio.dni}
        </span>
      ),
    },
    {
      id: "nombre",
      header: "Socio",
      accessorFn: (r) => `${r.socio.apellido} ${r.socio.nombre}`,
      cell: ({ row }) => (
        <span>
          {row.original.socio.apellido}, {row.original.socio.nombre}
        </span>
      ),
    },
    {
      id: "plan",
      header: "Plan",
      cell: ({ row }) => row.original.planNombre ?? "—",
    },
    {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={estadoVariant[row.original.socio.estado]}>
          {row.original.socio.estado}
        </Badge>
      ),
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => {
        const socio = row.original.socio;
        return (
          <div className="flex justify-end gap-1">
            <PagoFormDialog
              socios={sociosOpciones}
              socioId={socio.id}
              trigger={
                <Button variant="ghost" size="icon" title="Registrar pago">
                  <CreditCard className="h-4 w-4" />
                </Button>
              }
            />
            <SocioFormDialog
              planes={planes}
              socio={socio}
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
              onClick={() => onEliminar(socio.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchKey="nombre"
      searchPlaceholder="Buscar por nombre o DNI..."
      emptyMessage="Todavía no hay socios cargados"
      emptyAction={
        <SocioFormDialog
          planes={planes}
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Cargar primer socio
            </Button>
          }
        />
      }
    />
  );
}
