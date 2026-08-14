import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Une clases de Tailwind resolviendo conflictos (patrón shadcn/ui). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Fecha de hoy en formato ISO `YYYY-MM-DD` (hora local). */
export function hoyISO(): string {
  return fechaAISO(new Date());
}

/** Convierte un `Date` a ISO `YYYY-MM-DD` respetando la zona horaria local. */
export function fechaAISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** Suma días a una fecha ISO `YYYY-MM-DD` y devuelve otra fecha ISO. */
export function sumarDias(fechaISO: string, dias: number): string {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  return fechaAISO(fecha);
}

/**
 * Vencimiento de cuota bajo el ciclo mensual del gimnasio: se paga cualquier
 * día del mes y la cuota vale hasta el día 10 del mes siguiente (fecha fija de
 * calendario, no "30 días desde el pago"). `mesesAdelante` permite saltar un
 * ciclo extra (socio nuevo que se anota a fin de mes).
 */
export function proximoVencimientoDiaDiez(
  fechaPagoISO: string,
  mesesAdelante = 1,
): string {
  const fecha = new Date(`${fechaPagoISO}T00:00:00`);
  const siguiente = new Date(fecha.getFullYear(), fecha.getMonth() + mesesAdelante, 10);
  return fechaAISO(siguiente);
}

/**
 * Días entre dos fechas ISO (`hasta - desde`). Positivo si `hasta` es futuro.
 * Solo cuenta días de calendario, ignora horas.
 */
export function diasEntre(desdeISO: string, hastaISO: string): number {
  const desde = new Date(`${desdeISO}T00:00:00`);
  const hasta = new Date(`${hastaISO}T00:00:00`);
  const MS_POR_DIA = 1000 * 60 * 60 * 24;
  return Math.round((hasta.getTime() - desde.getTime()) / MS_POR_DIA);
}

/** Formatea un número como moneda argentina (ej: `$ 15.000`). */
export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(monto);
}

/** Formatea una fecha ISO `YYYY-MM-DD` como `DD/MM/AAAA`. */
export function formatearFecha(fechaISO: string | null): string {
  if (!fechaISO) return "—";
  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** Formatea un timestamp ISO 8601 completo como hora local `HH:MM`. */
export function formatearHora(isoCompleto: string): string {
  const fecha = new Date(isoCompleto);
  const hora = String(fecha.getHours()).padStart(2, "0");
  const min = String(fecha.getMinutes()).padStart(2, "0");
  return `${hora}:${min}`;
}
