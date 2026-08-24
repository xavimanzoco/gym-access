"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import {
  analizarPlanillaSocios,
  importarSocios,
  type ImportFormState,
} from "@/app/socios/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { FilaDescartada } from "@/lib/services/import/socioMapper";

/**
 * Importación de socios desde un Excel.
 *
 * El flujo tiene un paso intermedio: si la planilla trae socios repetidos, se
 * avisa primero con la lista enfrentada (qué fila choca con qué fila) para que
 * se pueda cancelar y arreglar el Excel antes de cargar nada. Recién después
 * aparece la vista previa con lo que se va a dar de alta.
 */

type Paso = "archivo" | "repetidos" | "previa" | "listo";

/** Cuántas filas de la vista previa se muestran antes de resumir el resto. */
const FILAS_VISIBLES = 8;

export function ImportarExcelBoton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState<Paso>("archivo");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<ImportFormState>({});
  const [pendiente, startTransition] = useTransition();

  function cerrar() {
    setAbierto(false);
    setPaso("archivo");
    setArchivo(null);
    setEstado({});
    if (inputRef.current) inputRef.current.value = "";
  }

  function elegirArchivo(elegido: File | null) {
    setArchivo(elegido);
    setEstado({});
    setPaso("archivo");
    if (!elegido) return;

    const datos = new FormData();
    datos.set("archivo", elegido);
    startTransition(async () => {
      const resultado = await analizarPlanillaSocios({}, datos);
      setEstado(resultado);
      if (!resultado.vistaPrevia) return;
      // El aviso de repetidos se salta si no hay ninguno.
      setPaso(resultado.vistaPrevia.repetidas.length > 0 ? "repetidos" : "previa");
    });
  }

  function confirmar() {
    if (!archivo) return;
    const datos = new FormData();
    datos.set("archivo", archivo);
    startTransition(async () => {
      const resultado = await importarSocios({}, datos);
      setEstado(resultado);
      if (resultado.resultado) {
        setPaso("listo");
        router.refresh();
      }
    });
  }

  const { vistaPrevia, resultado, error } = estado;

  return (
    <>
      <Button variant="outline" onClick={() => setAbierto(true)}>
        <FileSpreadsheet className="h-4 w-4" />
        Importar Excel
      </Button>

      <Modal abierto={abierto} onClose={cerrar} ancho="lg">
        {paso === "repetidos" && vistaPrevia ? (
          <AvisoRepetidos
            repetidas={vistaPrevia.repetidas}
            aImportar={vistaPrevia.aImportar.length}
            onCancelar={cerrar}
            onContinuar={() => setPaso("previa")}
          />
        ) : paso === "listo" && resultado ? (
          <>
            <Encabezado />
            <div className="mt-6 flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {resultado.importados} socio(s) importado(s)
              </p>
              {resultado.repetidos > 0 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {resultado.repetidos} repetido(s) no se cargaron.
                </p>
              )}
              {resultado.descartados > 0 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {resultado.descartados} fila(s) sin nombre se saltearon.
                </p>
              )}
            </div>
            <Pie>
              <BotonSecundario onClick={cerrar}>Listo</BotonSecundario>
            </Pie>
          </>
        ) : (
          <>
            <Encabezado />
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              La planilla tiene que tener una columna con el nombre. Si además
              trae teléfono, DNI, email o fecha de nacimiento, se cargan solos.
            </p>

            <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 py-8 text-zinc-500 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-400">
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">
                {archivo ? archivo.name : "Elegir archivo .xlsx"}
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xlsm"
                className="hidden"
                onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
              />
            </label>

            {pendiente && !vistaPrevia && (
              <p className="mt-4 text-center text-sm text-zinc-500">
                Leyendo la planilla…
              </p>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {vistaPrevia && <VistaPrevia datos={vistaPrevia} />}

            <Pie>
              <BotonSecundario onClick={cerrar}>Cancelar</BotonSecundario>
              <BotonPrincipal
                onClick={confirmar}
                disabled={pendiente || !vistaPrevia?.aImportar.length}
              >
                {pendiente
                  ? "Importando…"
                  : vistaPrevia
                    ? `Importar ${vistaPrevia.aImportar.length} socio(s)`
                    : "Importar"}
              </BotonPrincipal>
            </Pie>
          </>
        )}
      </Modal>
    </>
  );
}

function Encabezado() {
  return (
    <div className="flex items-center gap-3">
      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Importar socios desde Excel
      </p>
    </div>
  );
}

function Pie({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}

function BotonSecundario({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}

function BotonPrincipal({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/**
 * Aviso de socios repetidos, antes de la vista previa.
 *
 * Enfrenta las dos filas que chocan porque casi siempre una de las dos tiene el
 * nombre mal escrito, y conviene arreglar el Excel antes que corregir 10 socios
 * a mano después de importar.
 */
function AvisoRepetidos({
  repetidas,
  aImportar,
  onCancelar,
  onContinuar,
}: {
  repetidas: FilaDescartada[];
  aImportar: number;
  onCancelar: () => void;
  onContinuar: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <Copy className="h-5 w-5 text-amber-600" />
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Repetidos: {repetidas.length}
        </p>
      </div>

      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Estos socios tienen el mismo DNI que otro. Se carga uno solo de cada
        par: el que aparece primero en la planilla.
      </p>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <ul className="space-y-2 text-sm">
          {repetidas.map((fila) => (
            <li
              key={fila.fila}
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40"
            >
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {fila.nombre}
                </span>
                <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  DNI {fila.dni ?? "—"} · fila {fila.fila}
                </span>
              </div>

              {fila.duplicadoDe ? (
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Se queda{" "}
                  <span className="font-medium">{fila.duplicadoDe.nombre}</span>{" "}
                  (fila {fila.duplicadoDe.fila}). Si el nombre correcto es el de
                  arriba, corregilo en el Excel y volvé a importar.
                </p>
              ) : (
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Ya está cargado en el sistema.
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <Pie>
        <BotonSecundario onClick={onCancelar}>
          Cancelar y arreglar el Excel
        </BotonSecundario>
        <BotonPrincipal onClick={onContinuar} disabled={aImportar === 0}>
          Seguir igual
        </BotonPrincipal>
      </Pie>
    </>
  );
}

function VistaPrevia({
  datos,
}: {
  datos: NonNullable<ImportFormState["vistaPrevia"]>;
}) {
  const { aImportar, repetidas, descartadas, sinDni } = datos;
  const visibles = aImportar.slice(0, FILAS_VISIBLES);
  const restantes = aImportar.length - visibles.length;

  if (aImportar.length === 0) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          No quedó ninguna fila para importar
          {repetidas.length > 0 && ` (${repetidas.length} repetida(s))`}
          {descartadas.length > 0 && ` (${descartadas.length} sin nombre)`}.
        </span>
      </div>
    );
  }

  return (
    <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {aImportar.length} para importar
        </span>
        {sinDni > 0 && (
          <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {sinDni} sin DNI
          </span>
        )}
        {repetidas.length > 0 && (
          <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {repetidas.length} repetido(s)
          </span>
        )}
        {descartadas.length > 0 && (
          <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {descartadas.length} sin nombre
          </span>
        )}
      </div>

      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-zinc-400">
          <tr>
            <th className="py-2 pr-3 font-medium">Socio</th>
            <th className="py-2 pr-3 font-medium">DNI</th>
            <th className="py-2 font-medium">Teléfono</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {visibles.map((fila) => (
            <tr key={fila.fila}>
              <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-100">
                {fila.apellido ? `${fila.nombre} ${fila.apellido}` : fila.nombre}
              </td>
              <td className="py-2 pr-3 font-mono text-zinc-600 dark:text-zinc-300">
                {fila.dni ?? "—"}
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-300">
                {fila.telefono ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {restantes > 0 && (
        <p className="mt-2 text-xs text-zinc-400">…y {restantes} fila(s) más.</p>
      )}

      {sinDni > 0 && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Los socios sin DNI se cargan igual, pero no van a poder identificarse
          en el molinete hasta que se les complete el documento.
        </p>
      )}

      {descartadas.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            Ver las {descartadas.length} fila(s) sin nombre
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            {descartadas.map((fila) => (
              <li key={fila.fila}>
                <span className="font-mono">Fila {fila.fila}</span>
                {fila.dni && ` · DNI ${fila.dni}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
