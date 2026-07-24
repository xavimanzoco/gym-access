import type { ReactNode } from "react";

interface PageHeaderProps {
  titulo: string;
  descripcion?: string;
  /** Acciones a la derecha (ej: botón "Nuevo socio"). */
  acciones?: ReactNode;
}

export function PageHeader({ titulo, descripcion, acciones }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-8 py-6 dark:border-zinc-800">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {titulo}
        </h1>
        {descripcion && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {descripcion}
          </p>
        )}
      </div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </div>
  );
}
