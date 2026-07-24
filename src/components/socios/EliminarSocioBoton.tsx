"use client";

import { Trash2 } from "lucide-react";
import { eliminarSocio } from "@/app/socios/actions";

/** Botón de borrado con confirmación previa, dentro de un form server-action. */
export function EliminarSocioBoton({
  id,
  nombre,
}: {
  id: number;
  nombre: string;
}) {
  return (
    <form
      action={eliminarSocio}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Eliminar ${nombre}`}
        className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
