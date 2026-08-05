"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { type Pago } from "@/lib/db/schema";
import { formatFecha, formatMoneda } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";

export type PagoRow = {
  pago: Pago;
  socioNombre: string;
  socioApellido: string;
  socioDni: string;
};

export function PagosTable({ rows }: { rows: PagoRow[] }) {
  const columns: ColumnDef<PagoRow>[] = [
    {
      id: "fecha",
      header: "Fecha",
      cell: ({ row }) => formatFecha(row.original.pago.creadoEn),
    },
    {
      id: "socio",
      header: "Socio",
      accessorFn: (r) => `${r.socioApellido} ${r.socioNombre} ${r.socioDni}`,
      cell: ({ row }) => (
        <span>
          {row.original.socioApellido}, {row.original.socioNombre}{" "}
          <span className="font-mono tabular-nums text-muted-foreground">
            ({row.original.socioDni})
          </span>
        </span>
      ),
    },
    {
      id: "monto",
      header: "Monto",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatMoneda(row.original.pago.monto)}
        </span>
      ),
    },
    {
      id: "metodo",
      header: "Método",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.pago.metodo}</Badge>
      ),
    },
    {
      id: "periodo",
      header: "Vence",
      cell: ({ row }) => formatFecha(row.original.pago.periodoHasta),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchKey="socio"
      searchPlaceholder="Buscar por socio o DNI..."
      emptyMessage="Todavía no hay pagos registrados"
    />
  );
}
