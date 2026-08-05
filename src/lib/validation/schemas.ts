import { z } from "zod";

import { ESTADOS_SOCIO, METODOS_PAGO } from "@/lib/db/schema";

const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const planSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  precio: z.number().min(0, "No puede ser negativo"),
  diasAcceso: z
    .array(z.number().int().min(1).max(7))
    .min(1, "Elegí al menos un día"),
  horaDesde: z
    .string()
    .regex(horaRegex, "Formato HH:MM")
    .nullable()
    .or(z.literal("").transform(() => null)),
  horaHasta: z
    .string()
    .regex(horaRegex, "Formato HH:MM")
    .nullable()
    .or(z.literal("").transform(() => null)),
  activo: z.boolean().default(true),
});

export type PlanInput = z.infer<typeof planSchema>;

export const socioSchema = z.object({
  dni: z
    .string()
    .regex(/^\d{7,9}$/, "DNI inválido (7 a 9 dígitos)"),
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  apellido: z.string().min(2, "Mínimo 2 caracteres"),
  telefono: z.string().optional().nullable(),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  planId: z.number().int().positive().nullable().optional(),
  estado: z.enum(ESTADOS_SOCIO).default("activo"),
});

export type SocioInput = z.infer<typeof socioSchema>;

export const pagoSchema = z.object({
  socioId: z.number().int().positive(),
  monto: z.number().min(0, "No puede ser negativo"),
  metodo: z.enum(METODOS_PAGO).default("efectivo"),
  // Cantidad de días que cubre el pago (default 30 = un mes).
  diasCobertura: z.number().int().positive().default(30),
});

export type PagoInput = z.infer<typeof pagoSchema>;

export const validarAccesoSchema = z.object({
  dni: z.string().regex(/^\d{6,9}$/, "DNI inválido"),
  direccion: z.enum(["entrada", "salida"]).default("entrada"),
});

export type ValidarAccesoInput = z.infer<typeof validarAccesoSchema>;
