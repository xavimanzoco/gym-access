/**
 * Tipos del dominio del sistema de control de acceso del gimnasio.
 * Se comparten entre repositorios, servicios y la UI.
 */

/** Método con el que el socio abonó la cuota. */
export type MetodoPago = "efectivo" | "tarjeta" | "transferencia" | "debito";

/** Plan/abono al que puede estar suscripto un socio. */
export interface Plan {
  id: number;
  nombre: string;
  /** Precio de referencia del plan, en la moneda local. */
  precio: number;
  /** Cantidad de días que agrega al vencimiento cada vez que se paga. */
  diasDuracion: number;
  activo: boolean;
}

/** Socio del gimnasio. */
export interface Socio {
  id: number;
  /** Documento. Es la credencial que se teclea en el molinete. Único. */
  dni: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
  /** Fecha de nacimiento en formato ISO `YYYY-MM-DD`. */
  fechaNacimiento: string | null;
  planId: number | null;
  /**
   * Fecha hasta la que la cuota está paga, en ISO `YYYY-MM-DD`.
   * `null` si el socio nunca abonó. Es el dato que define si puede ingresar.
   */
  vencimiento: string | null;
  /** Si está en `false`, el socio no puede ingresar aunque tenga la cuota al día. */
  activo: boolean;
  fechaAlta: string;
  creadoEn: string;
  actualizadoEn: string;
}

/** Pago de cuota registrado para un socio. */
export interface Pago {
  id: number;
  socioId: number;
  monto: number;
  metodo: MetodoPago;
  planId: number | null;
  /** Fecha en que se cobró, ISO `YYYY-MM-DD`. */
  fechaPago: string;
  /** Inicio del período cubierto, ISO `YYYY-MM-DD`. */
  periodoDesde: string;
  /** Fin del período cubierto (nuevo vencimiento), ISO `YYYY-MM-DD`. */
  periodoHasta: string;
  creadoEn: string;
}

/** Motivo por el que se permitió o rechazó un ingreso. */
export type MotivoAcceso =
  | "OK"
  | "CUOTA_VENCIDA"
  | "SOCIO_INEXISTENTE"
  | "SOCIO_INACTIVO"
  | "MANUAL";

/** Registro de un intento de ingreso por el molinete. */
export interface Acceso {
  id: number;
  /** `null` cuando el DNI tecleado no corresponde a ningún socio. */
  socioId: number | null;
  /** DNI exactamente como llegó del molinete. */
  dniIngresado: string;
  permitido: boolean;
  motivo: MotivoAcceso;
  /** Momento del intento, ISO 8601 completo. */
  fechaHora: string;
}

/**
 * Resultado de evaluar un ingreso. Es lo que la pantalla del kiosco muestra
 * (verde/rojo) y lo que decide si se le da la orden de abrir al molinete.
 */
export interface ResultadoAcceso {
  permitido: boolean;
  motivo: MotivoAcceso;
  /** Mensaje listo para mostrar en pantalla. */
  mensaje: string;
  /** Datos del socio si fue encontrado. */
  socio: Socio | null;
  /** Días restantes hasta el vencimiento (negativo si está vencido). */
  diasParaVencer: number | null;
}
