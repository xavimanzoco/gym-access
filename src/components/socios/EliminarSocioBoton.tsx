"use client";

import { Trash2 } from "lucide-react";
import { eliminarSocio } from "@/app/socios/actions";
import { ConfirmFormButton } from "@/components/ui/confirm-form-button";

/** Botón de borrado con confirmación previa, dentro de un form server-action. */
export function EliminarSocioBoton({
  id,
  nombre,
}: {
  id: number;
  nombre: string;
}) {
  return (
    <ConfirmFormButton
      action={eliminarSocio}
      campos={{ id }}
      icono={Trash2}
      ariaLabel={`Eliminar ${nombre}`}
      titulo={`¿Eliminar a ${nombre}?`}
      mensaje="Esta acción no se puede deshacer."
      textoConfirmar="Eliminar"
      tone="danger"
      variante="texto"
      etiqueta="Eliminar socio"
    />
  );
}
