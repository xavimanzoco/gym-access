import { DiagnosticoPanel } from "@/app/diagnostico/DiagnosticoPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { molineteDiagnostico } from "@/lib/services/hardware/molineteDiagnostico";

/**
 * Pantalla de diagnóstico del molinete.
 *
 * No está en el menú a propósito: se entra escribiendo `/diagnostico`. Sirve
 * para verificar una instalación —qué puerto encontró, cuánto tarda, si el
 * molinete responde— sin necesidad de consola.
 */
export const dynamic = "force-dynamic";

export default function DiagnosticoPage() {
  const estado = molineteDiagnostico.estado();

  return (
    <div>
      <PageHeader
        titulo="Diagnóstico"
        descripcion="Estado y velocidad de la conexión con el molinete"
      />
      <DiagnosticoPanel inicial={estado} />
    </div>
  );
}
