import type { MetodoPago, MotivoAcceso } from "@/types";

/** Nombre de la app, usado en títulos y encabezados. */
export const APP_NOMBRE = "Gym Access";

/** Métodos de pago disponibles para el selector de la pantalla de pagos. */
export const METODOS_PAGO: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "tarjeta", etiqueta: "Tarjeta" },
  { valor: "debito", etiqueta: "Débito" },
  { valor: "transferencia", etiqueta: "Transferencia" },
];

/** Mensaje que ve el socio/recepción para cada resultado de ingreso. */
export const MENSAJE_POR_MOTIVO: Record<MotivoAcceso, string> = {
  OK: "Acceso permitido",
  CUOTA_VENCIDA: "Cuota vencida",
  SOCIO_INEXISTENTE: "DNI no registrado",
  SOCIO_INACTIVO: "Socio inactivo",
  MANUAL: "Apertura manual",
};

/** Nombre del plan mensual, usado para el pago rápido de un click desde Socios. */
export const PLAN_MENSUAL_NOMBRE = "Mensual";

/**
 * Día del mes desde el cual un socio NUEVO que se anota recibe un ciclo extra
 * de gracia (le tocaría muy poco tiempo hasta el vencimiento del 10 si no).
 */
export const DIA_LIMITE_FIN_DE_MES = 25;

/**
 * Umbral (en días) para avisar que la cuota está por vencer.
 * Si faltan estos días o menos, el ingreso se permite pero se muestra aviso.
 */
export const DIAS_AVISO_VENCIMIENTO = 5;
