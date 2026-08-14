"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { abrirManual, procesarIngreso } from "@/app/ingreso/actions";
import { AccesoOverlay } from "@/components/acceso/AccesoOverlay";
import type { ResultadoAcceso } from "@/types";

/** Cuánto se muestra el cartelón de resultado antes de cerrarse solo (ms). */
const DURACION_RESULTADO_MS = 4500;

interface AccesoContextValue {
  /** Valida un DNI, registra el ingreso y muestra el resultado en pantalla. */
  procesar: (dni: string) => void;
  /** Abre el molinete a mano, sin DNI, y muestra el resultado en pantalla. */
  abrirManual: () => void;
  pendiente: boolean;
}

const AccesoContext = createContext<AccesoContextValue | null>(null);

/** Acceso al control de ingreso desde cualquier componente cliente. */
export function useAcceso(): AccesoContextValue {
  const ctx = useContext(AccesoContext);
  if (!ctx) throw new Error("useAcceso debe usarse dentro de <AccesoProvider>");
  return ctx;
}

/**
 * Coordina el control de ingreso a nivel de toda la app: expone `procesar(dni)`
 * y muestra el cartelón de resultado, sin importar en qué pantalla esté recepción.
 */
export function AccesoProvider({ children }: { children: ReactNode }) {
  const [resultado, setResultado] = useState<ResultadoAcceso | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  const procesar = useCallback(
    (dni: string) => {
      const valor = dni.trim();
      if (!valor) return;
      startTransition(async () => {
        const res = await procesarIngreso(valor);
        setResultado(res);
        router.refresh(); // refresca el listado de accesos recientes si está visible
      });
    },
    [router],
  );

  const abrirManualCb = useCallback(() => {
    startTransition(async () => {
      const res = await abrirManual();
      setResultado(res);
      router.refresh(); // refresca el listado de accesos recientes si está visible
    });
  }, [router]);

  useEffect(() => {
    if (!resultado) return;
    const timer = setTimeout(() => setResultado(null), DURACION_RESULTADO_MS);
    return () => clearTimeout(timer);
  }, [resultado]);

  return (
    <AccesoContext.Provider
      value={{ procesar, abrirManual: abrirManualCb, pendiente }}
    >
      {children}
      {resultado && (
        <AccesoOverlay
          resultado={resultado}
          onClose={() => setResultado(null)}
        />
      )}
    </AccesoContext.Provider>
  );
}
