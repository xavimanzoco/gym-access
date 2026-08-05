/**
 * Helpers de fecha/hora para las reglas de acceso.
 * El día de la semana se modela 1 = lunes ... 7 = domingo (ISO).
 */

/** Día de la semana ISO (1 = lunes ... 7 = domingo). */
export function diaSemanaIso(fecha: Date): number {
  const dia = fecha.getDay(); // 0 = domingo ... 6 = sábado
  return dia === 0 ? 7 : dia;
}

/** Hora local en formato "HH:MM" (24h). */
export function horaHHMM(fecha: Date): string {
  const hh = String(fecha.getHours()).padStart(2, "0");
  const mm = String(fecha.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Indica si `hora` ("HH:MM") cae dentro de [desde, hasta]. Si alguno es null
 * no hay restricción de ese lado. Soporta franjas que cruzan medianoche.
 */
export function dentroDeFranja(
  hora: string,
  desde: string | null,
  hasta: string | null
): boolean {
  if (!desde && !hasta) return true;
  if (desde && !hasta) return hora >= desde;
  if (!desde && hasta) return hora <= hasta;
  // Ambos definidos.
  if (desde! <= hasta!) {
    return hora >= desde! && hora <= hasta!;
  }
  // Franja que cruza medianoche (ej. 22:00 -> 06:00).
  return hora >= desde! || hora <= hasta!;
}

/** Suma `dias` días a una fecha y devuelve una nueva instancia. */
export function sumarDias(fecha: Date, dias: number): Date {
  const r = new Date(fecha);
  r.setDate(r.getDate() + dias);
  return r;
}

/** Inicio del día (00:00:00.000) en hora local. */
export function inicioDelDia(fecha: Date): Date {
  const r = new Date(fecha);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Fin del día (23:59:59.999) en hora local. */
export function finDelDia(fecha: Date): Date {
  const r = new Date(fecha);
  r.setHours(23, 59, 59, 999);
  return r;
}
