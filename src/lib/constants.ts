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
};

/**
 * Umbral (en días) para avisar que la cuota está por vencer.
 * Si faltan estos días o menos, el ingreso se permite pero se muestra aviso.
 */
export const DIAS_AVISO_VENCIMIENTO = 5;
