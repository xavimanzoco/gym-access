"use server";

import {
  molineteDiagnostico,
  type Diagnostico,
  type ResultadoApertura,
} from "@/lib/services/hardware/molineteDiagnostico";

/** Vuelve a medir la detección del puerto y devuelve el estado del molinete. */
export async function medirMolinete(): Promise<Diagnostico> {
  return molineteDiagnostico.estado();
}

/** Abre el molinete de verdad para medir cuánto tarda. El molinete gira. */
export async function probarApertura(): Promise<ResultadoApertura> {
  return molineteDiagnostico.probarApertura();
}
