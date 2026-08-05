"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { type Acceso } from "@/lib/db/schema";
import { formatHora } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";

export type AccesoRow = {
  acceso: Acceso;
  socioNombre: string | null;
  socioApellido: string | null;
};

export function AccesosTable({ rows }: { rows: AccesoRow[] }) {
  const columns: ColumnDef<AccesoRow>[] = [
    {
      id: "hora",
      header: "Hora",
      cell: ({ row }) => formatHora(row.original.acceso.fechaHora),
    },
    {
      id: "socio",
      header: "Socio",
      accessorFn: (r) =>
        r.socioApellido ? `${r.socioApellido} ${r.socioNombre}` : r.acceso.dni,
      cell: ({ row }) =>
        row.original.socioApellido
          ? `${row.original.socioApellido}, ${row.original.socioNombre}`
          : "—",
    },
    {
      accessorKey: "acceso.dni",
      header: "DNI",
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">
          {row.original.acceso.dni}
        </span>
      ),
    },
    {
      id: "resultado",
      header: "Resultado",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.acceso.resultado === "permitido"
              ? "default"
              : "destructive"
          }
        >
          {row.original.acceso.resultado}
        </Badge>
      ),
    },
    {
      id: "motivo",
      header: "Motivo",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.acceso.motivo}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchKey="socio"
      searchPlaceholder="Buscar por socio o DNI..."
      emptyMessage="Sin accesos hoy"
    />
  );
}
