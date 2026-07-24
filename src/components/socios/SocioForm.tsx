"use client";

import Link from "next/link";
import { useActionState } from "react";
import { crearSocio, type SocioFormState } from "@/app/socios/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Plan } from "@/types";

const ESTADO_INICIAL: SocioFormState = {};

/** Formulario de alta de socio. Recibe los planes para el selector. */
export function SocioForm({ planes }: { planes: Plan[] }) {
  const [estado, accion, pendiente] = useActionState(crearSocio, ESTADO_INICIAL);

  return (
    <form action={accion} className="max-w-2xl space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="dni">DNI *</Label>
          <Input id="dni" name="dni" inputMode="numeric" required />
        </div>
        <div>
          <Label htmlFor="planId">Plan</Label>
          <Select id="planId" name="planId" defaultValue="">
            <option value="">Sin plan</option>
            {planes.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="nombre">Nombre *</Label>
          <Input id="nombre" name="nombre" required />
        </div>
        <div>
          <Label htmlFor="apellido">Apellido *</Label>
          <Input id="apellido" name="apellido" required />
        </div>
        <div>
          <Label htmlFor="telefono">Teléfono</Label>
          <Input id="telefono" name="telefono" inputMode="tel" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div>
          <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
          <Input id="fechaNacimiento" name="fechaNacimiento" type="date" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="activo"
          defaultChecked
          className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
        />
        Socio activo
      </label>

      {estado.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {estado.error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar socio"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/socios">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
