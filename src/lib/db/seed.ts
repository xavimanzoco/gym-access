/**
 * Carga datos de ejemplo. Ejecutar con: npm run db:seed
 * Idempotente-ish: limpia las tablas antes de insertar.
 */
import { db } from "@/lib/db";
import { accesos, pagos, planes, socios } from "@/lib/db/schema";
import { accesoService } from "@/lib/services/accesoService";
import { pagoService } from "@/lib/services/pagoService";
import { sumarDias } from "@/lib/dates";

function limpiar() {
  db.delete(accesos).run();
  db.delete(pagos).run();
  db.delete(socios).run();
  db.delete(planes).run();
}

function main() {
  limpiar();

  const planFull = db
    .insert(planes)
    .values({
      nombre: "Full",
      precio: 18000,
      diasAcceso: [1, 2, 3, 4, 5, 6, 7],
      horaDesde: null,
      horaHasta: null,
    })
    .returning()
    .get();

  const planManana = db
    .insert(planes)
    .values({
      nombre: "Mañana (Lun-Vie)",
      precio: 12000,
      diasAcceso: [1, 2, 3, 4, 5],
      horaDesde: "06:00",
      horaHasta: "14:00",
    })
    .returning()
    .get();

  const socioAlDia = db
    .insert(socios)
    .values({
      dni: "30111222",
      nombre: "Lucía",
      apellido: "Gómez",
      telefono: "1144556677",
      email: "lucia@example.com",
      planId: planFull.id,
      estado: "activo",
    })
    .returning()
    .get();

  const socioVencido = db
    .insert(socios)
    .values({
      dni: "28999888",
      nombre: "Martín",
      apellido: "Pérez",
      planId: planManana.id,
      estado: "activo",
    })
    .returning()
    .get();

  db.insert(socios)
    .values({
      dni: "33444555",
      nombre: "Sofía",
      apellido: "Díaz",
      planId: planFull.id,
      estado: "suspendido",
    })
    .run();

  // Socia al día: pago vigente.
  pagoService.registrar({
    socioId: socioAlDia.id,
    monto: 18000,
    metodo: "efectivo",
    diasCobertura: 30,
  });

  // Socio con cuota vencida hace 5 días.
  const hoy = new Date();
  db.insert(pagos)
    .values({
      socioId: socioVencido.id,
      monto: 12000,
      metodo: "transferencia",
      periodoDesde: sumarDias(hoy, -35),
      periodoHasta: sumarDias(hoy, -5),
    })
    .run();

  // Algunos intentos de acceso de hoy (quedan registrados en la bitácora).
  accesoService.validarPorDni("30111222"); // permitido
  accesoService.validarPorDni("28999888"); // denegado: cuota vencida
  accesoService.validarPorDni("99999999"); // denegado: no registrado

  console.log("✓ Seed completado:");
  console.log("  - 2 planes, 3 socios, pagos y accesos de ejemplo");
  console.log("  - Socia al día: DNI 30111222 (Lucía Gómez)");
  console.log("  - Socio vencido: DNI 28999888 (Martín Pérez)");
}

main();
