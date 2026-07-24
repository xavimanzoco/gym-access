import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  etiqueta: string;
  valor: string | number;
  icono: LucideIcon;
  /** Color del ícono según el tipo de métrica. */
  tono?: "indigo" | "emerald" | "amber" | "red";
}

const TONOS = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
  emerald:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  red: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
} as const;

export function StatCard({
  etiqueta,
  valor,
  icono: Icono,
  tono = "indigo",
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            TONOS[tono],
          )}
        >
          <Icono className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{etiqueta}</p>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {valor}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
