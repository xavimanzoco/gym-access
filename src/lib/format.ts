const monedaFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const fechaFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const fechaHoraFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const horaFmt = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

export const formatMoneda = (n: number) => monedaFmt.format(n);
export const formatFecha = (d: Date) => fechaFmt.format(d);
export const formatFechaHora = (d: Date) => fechaHoraFmt.format(d);
export const formatHora = (d: Date) => horaFmt.format(d);

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Convierte [1,2,3] -> "Lun, Mar, Mié". */
export function formatDias(dias: number[]): string {
  return dias
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DIAS[d - 1])
    .join(", ");
}
