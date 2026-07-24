import { z } from "zod";

/** Texto opcional: string vacío se normaliza a `null`. */
const textoOpcional = z
  .string()
  .trim()
  .transform((v) => (v ? v : null));

/** Email opcional: vacío → `null`; si hay valor, debe ser válido. */
const emailOpcional = textoOpcional.pipe(
  z.string().email("Email inválido").nullable(),
);

/** Id de plan opcional que llega como string desde el formulario. */
const planIdOpcional = z
  .string()
  .trim()
  .transform((v) => (v ? Number(v) : null))
  .pipe(z.number().int().positive("Plan inválido").nullable());

/** Campos comunes de alta y edición de socio. */
const camposSocio = {
  nombre: z.string().trim().min(1, "Ingresá el nombre"),
  apellido: z.string().trim().min(1, "Ingresá el apellido"),
  telefono: textoOpcional,
  email: emailOpcional,
  fechaNacimiento: textoOpcional,
  planId: planIdOpcional,
  activo: z.boolean(),
};

export const crearSocioSchema = z.object({
  dni: z
    .string()
    .trim()
    .regex(/^\d{6,}$/, "El DNI debe tener al menos 6 dígitos"),
  ...camposSocio,
});

export const actualizarSocioSchema = z.object(camposSocio);

export type CrearSocioInput = z.infer<typeof crearSocioSchema>;
export type ActualizarSocioInput = z.infer<typeof actualizarSocioSchema>;
