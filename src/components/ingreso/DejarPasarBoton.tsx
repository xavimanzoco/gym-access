"use client";

import { LockOpen } from "lucide-react";
import { useAcceso } from "@/components/acceso/AccesoProvider";
import { Button } from "@/components/ui/button";

/** Abre el molinete a mano, sin DNI, para cuando recepción tiene que dejar pasar a alguien. */
export function DejarPasarBoton() {
  const { abrirManual, pendiente } = useAcceso();

  return (
    <Button
      type="button"
      size="lg"
      onClick={abrirManual}
      disabled={pendiente}
      className="w-full bg-emerald-600 hover:bg-emerald-700"
    >
      <LockOpen className="h-5 w-5" />
      Dejar pasar
    </Button>
  );
}
