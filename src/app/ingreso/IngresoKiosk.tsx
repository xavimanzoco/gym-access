"use client";

import { useState, type FormEvent } from "react";
import { ScanLine } from "lucide-react";
import { useAcceso } from "@/components/acceso/AccesoProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Panel del kiosco de ingreso.
 *
 * El molinete se procesa de forma global (ver `MolineteListener`): no hace falta
 * tener este campo enfocado. El campo de acá es para que recepción cargue un DNI
 * a mano cuando lo necesite. En ambos casos el resultado se muestra en el
 * cartelón grande a pantalla completa.
 */
export function IngresoKiosk() {
  const { procesar, pendiente } = useAcceso();
  const [dni, setDni] = useState("");

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!dni.trim()) return;
    procesar(dni);
    setDni("");
  }

  return (
    <div className="flex flex-col items-center">
      <form onSubmit={enviar} className="flex w-full max-w-md gap-2">
        <Input
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ingresar DNI a mano"
          className="h-12 text-center text-lg tracking-widest"
        />
        <Button type="submit" size="lg" disabled={pendiente}>
          {pendiente ? "..." : "Ingresar"}
        </Button>
      </form>

      <div className="mt-6 flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 py-12 text-zinc-400 dark:border-zinc-800">
        <ScanLine className="h-10 w-10" />
        <p className="text-sm font-medium">Esperando DNI del molinete…</p>
      </div>
    </div>
  );
}
