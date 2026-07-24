"use client";

import { useEffect, useRef } from "react";
import { useAcceso } from "@/components/acceso/AccesoProvider";

/**
 * Oyente global del teclado para identificar al socio.
 *
 * Dos dispositivos escriben el DNI como si fueran un teclado USB:
 *   - El teclado del molinete (una persona teclea los dígitos, ritmo humano).
 *   - El lector de huella (al reconocer, "teclea" el número de golpe).
 *
 * Este componente escucha en toda la app: acumula los dígitos (a cualquier
 * velocidad) y, al llegar Enter, dispara la validación. No necesita ningún
 * campo enfocado, así funciona esté recepción en la pantalla que esté.
 *
 * PARÁMETROS A CALIBRAR con el hardware real:
 * - `MIN_LARGO`: dígitos mínimos para aceptar un DNI.
 * - `IDLE_RESET_MS`: si pasa este tiempo sin teclas, se descarta lo tecleado a
 *   medias y empieza una lectura nueva.
 * - Tecla de fin: hoy `Enter`. Si el molinete/huella mandan Tab u otro sufijo, se ajusta acá.
 */
const MIN_LARGO = 6;
const IDLE_RESET_MS = 5000;

/** ¿El evento ocurrió mientras se escribía en un campo editable? */
function enCampoEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

export function MolineteListener() {
  const { procesar } = useAcceso();
  const buffer = useRef("");
  const ultimaTecla = useRef(0);

  useEffect(() => {
    function onKeyDown(evento: KeyboardEvent) {
      // Si recepción está tipeando en un campo (alta de socio, pago, búsqueda),
      // no interceptamos: ese texto es para el campo, no para el molinete.
      if (enCampoEditable(evento.target)) return;

      const ahora = Date.now();

      if (evento.key === "Enter") {
        if (buffer.current.length >= MIN_LARGO) {
          procesar(buffer.current);
        }
        buffer.current = "";
        return;
      }

      if (/^[0-9]$/.test(evento.key)) {
        // Si pasó mucho desde la última tecla, lo anterior era basura: reiniciamos.
        if (ahora - ultimaTecla.current > IDLE_RESET_MS) buffer.current = "";
        buffer.current += evento.key;
        ultimaTecla.current = ahora;
        return;
      }

      // Cualquier otra tecla corta la lectura en curso.
      buffer.current = "";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [procesar]);

  return null;
}
