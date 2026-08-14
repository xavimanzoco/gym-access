"use client";

import { UserCheck, UserX } from "lucide-react";
import { alternarActivoSocio } from "@/app/socios/actions";
import { ConfirmFormButton } from "@/components/ui/confirm-form-button";

/** Activa/desactiva un socio. El texto y color cambian según el estado actual. */
export function ActivoToggleBoton({
  id,
  nombre,
  activo,
}: {
  id: number;
  nombre: string;
  activo: boolean;
}) {
  return activo ? (
    <ConfirmFormButton
      action={alternarActivoSocio}
      campos={{ id }}
      icono={UserX}
      ariaLabel={`Desactivar a ${nombre}`}
      titulo={`¿Desactivar a ${nombre}?`}
      mensaje="No va a poder ingresar por el molinete hasta que lo reactives."
      textoConfirmar="Desactivar"
      tone="danger"
      variante="texto"
      etiqueta="Desactivar usuario"
    />
  ) : (
    <ConfirmFormButton
      action={alternarActivoSocio}
      campos={{ id }}
      icono={UserCheck}
      ariaLabel={`Activar a ${nombre}`}
      titulo={`¿Activar a ${nombre}?`}
      mensaje="Vuelve a poder ingresar por el molinete."
      textoConfirmar="Activar"
      tone="success"
      variante="texto"
      etiqueta="Activar usuario"
    />
  );
}
