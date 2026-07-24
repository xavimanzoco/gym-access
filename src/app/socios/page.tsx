import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SociosTable } from "@/components/socios/SociosTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { planService } from "@/lib/services/planService";
import { socioService } from "@/lib/services/socioService";

export const dynamic = "force-dynamic";

export default async function SociosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const socios = socioService.buscar(q);
  const planes = planService.listar();
  const planesById = Object.fromEntries(planes.map((p) => [p.id, p.nombre]));

  return (
    <div>
      <PageHeader
        titulo="Socios"
        descripcion={`${socios.length} socio(s)`}
        acciones={
          <Button asChild>
            <Link href="/socios/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo socio
            </Link>
          </Button>
        }
      />

      <div className="space-y-4 p-8">
        <form className="flex max-w-sm gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Buscar por DNI, nombre o apellido"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>

        <SociosTable socios={socios} planesById={planesById} />
      </div>
    </div>
  );
}
