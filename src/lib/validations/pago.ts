import { z } from "zod";

export const registrarPagoSchema = z.object({
  socioId: z.coerce.number().int().positive("Socio inválido"),
  planId: z.coerce.number().int().positive("Elegí un plan"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
  metodo: z.enum(["efectivo", "tarjeta", "debito", "transferencia"], {
    message: "Elegí un método de pago",
  }),
});

export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;
