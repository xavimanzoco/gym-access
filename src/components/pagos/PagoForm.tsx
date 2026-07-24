"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { registrarPago, type PagoFormState } from "@/app/pagos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { METODOS_PAGO } from "@/lib/constants";
import type { Plan, Socio } from "@/types";

const ESTADO_INICIAL: PagoFormState = {};

interface PagoFormProps {
  socios: Socio[];
  planes: Plan[];
}

export function PagoForm({ socios, planes }: PagoFormProps) {
  const [estado, accion, pendiente] = useActionState(
    registrarPago,
    ESTADO_INICIAL,
  );
  const [socioId, setSocioId] = useState("");
  const [planId, setPlanId] = useState("");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("efectivo");

  // La acción devuelve un objeto nuevo en cada envío: al registrarse OK,
  // limpiamos el formulario para cargar el próximo pago.
  useEffect(() => {
    if (estado.ok) {
      setSocioId("");
      setPlanId("");
      setMonto("");
      setMetodo("efectivo");
    }
  }, [estado]);

  function elegirPlan(id: string) {
    setPlanId(id);
    const plan = planes.find((p) => String(p.id) === id);
    if (plan) setMonto(String(plan.precio));
  }

  return (
    <form action={accion} className="space-y-5">
      <div>
        <Label htmlFor="socioId">Socio *</Label>
        <Select
          id="socioId"
          name="socioId"
          required
          value={socioId}
          onChange={(e) => setSocioId(e.target.value)}
        >
          <option value="">Elegí un socio…</option>
          {socios.map((socio) => (
            <option key={socio.id} value={socio.id}>
              {socio.apellido} {socio.nombre} — DNI {socio.dni}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="planId">Plan *</Label>
          <Select
            id="planId"
            name="planId"
            required
            value={planId}
            onChange={(e) => elegirPlan(e.target.value)}
          >
            <option value="">Elegí un plan…</option>
            {planes.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.nombre} ({plan.diasDuracion} días)
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="monto">Monto *</Label>
          <Input
            id="monto"
            name="monto"
            type="number"
            min="0"
            step="1"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="metodo">Método</Label>
          <Select
            id="metodo"
            name="metodo"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
          >
            {METODOS_PAGO.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {estado.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Pago registrado y cuota actualizada.
        </p>
      )}

      <Button type="submit" disabled={pendiente}>
        {pendiente ? "Registrando…" : "Registrar pago"}
      </Button>
    </form>
  );
}
