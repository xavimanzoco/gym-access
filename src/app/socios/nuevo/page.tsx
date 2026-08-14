import { PageHeader } from "@/components/layout/PageHeader";
import { SocioForm } from "@/components/socios/SocioForm";

export const dynamic = "force-dynamic";

export default function NuevoSocioPage() {
  return (
    <div>
      <PageHeader
        titulo="Nuevo socio"
        descripcion="Cargá los datos del socio. El DNI es la credencial del molinete."
      />
      <div className="p-8">
        <SocioForm />
      </div>
    </div>
  );
}
