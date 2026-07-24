import { PageHeader } from "@/components/layout/PageHeader";
import { SocioForm } from "@/components/socios/SocioForm";
import { planService } from "@/lib/services/planService";

export const dynamic = "force-dynamic";

export default function NuevoSocioPage() {
  const planes = planService.listarActivos();

  return (
    <div>
      <PageHeader
        titulo="Nuevo socio"
        descripcion="Cargá los datos del socio. El DNI es la credencial del molinete."
      />
      <div className="p-8">
        <SocioForm planes={planes} />
      </div>
    </div>
  );
}
