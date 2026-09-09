"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle, Zap } from "lucide-react";
import { medirMolinete, probarApertura } from "@/app/diagnostico/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  Diagnostico,
  ResultadoApertura,
} from "@/lib/services/hardware/molineteDiagnostico";

const ms = (n: number) => `${n < 10 ? n.toFixed(1) : n.toFixed(0)} ms`;

/** Una fila etiqueta/valor. */
function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{etiqueta}</span>
      <span className="text-right text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {children}
      </span>
    </div>
  );
}

export function DiagnosticoPanel({ inicial }: { inicial: Diagnostico }) {
  const [estado, setEstado] = useState(inicial);
  const [apertura, setApertura] = useState<ResultadoApertura | null>(null);
  const [midiendo, iniciarMedicion] = useTransition();
  const [probando, iniciarPrueba] = useTransition();

  const puerto = estado.puertoFijado ?? estado.deteccion?.puerto;

  return (
    <div className="space-y-6 p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conexión con el molinete</CardTitle>
          <Button
            variant="outline"
            onClick={() => iniciarMedicion(async () => setEstado(await medirMolinete()))}
            disabled={midiendo}
          >
            <RefreshCw className={`h-4 w-4 ${midiendo ? "animate-spin" : ""}`} />
            {midiendo ? "Midiendo…" : "Volver a medir"}
          </Button>
        </CardHeader>
        <CardContent>
          <Dato etiqueta="Puerto del Pico">
            {puerto ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                {puerto} {estado.puertoFijado ? "(fijado a mano)" : "(detectado solo)"}
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400">no se encontró</span>
            )}
          </Dato>
          <Dato etiqueta="Modo rápido">
            {estado.canalVivoHabilitado ? "activado" : "desactivado"}
          </Dato>
          <Dato etiqueta="Canal con el molinete">{estado.estadoCanal}</Dato>
          <Dato etiqueta="Sistema">{estado.plataforma}</Dato>
        </CardContent>
      </Card>

      {estado.deteccion && (
        <Card>
          <CardHeader>
            <CardTitle>Búsqueda del Pico</CardTitle>
          </CardHeader>
          <CardContent>
            <Dato etiqueta="Como busca la app ahora">{ms(estado.deteccion.acotadaMs)}</Dato>
            <Dato etiqueta="Como buscaba la versión anterior">
              {ms(estado.deteccion.ampliaMs)}
            </Dato>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              La app busca el puerto una sola vez y se lo guarda, así que este
              costo ya no se paga en cada ingreso: son{" "}
              <strong className="text-zinc-900 dark:text-zinc-50">
                {ms(estado.deteccion.acotadaMs)}
              </strong>{" "}
              menos por cada persona que pasa.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Probar una apertura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              El molinete se va a liberar de verdad. Asegurate de que no haya
              nadie pasando.
            </span>
          </div>

          <Button
            onClick={() => iniciarPrueba(async () => setApertura(await probarApertura()))}
            disabled={probando}
          >
            <Zap className="h-4 w-4" />
            {probando ? "Abriendo…" : "Abrir el molinete ahora"}
          </Button>

          {apertura && (
            <div className="mt-4 space-y-1 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                {apertura.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {apertura.ok ? "La orden salió" : "No se pudo abrir"} —{" "}
                  {ms(apertura.ms)}
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Método: {apertura.metodo}
              </p>
              {apertura.error && (
                <p className="text-sm text-red-600 dark:text-red-400">{apertura.error}</p>
              )}
              {apertura.ok && (
                <p className="pt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Si el molinete NO giró, la orden salió pero el hardware no
                  respondió: revisá el cableado del relé.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
