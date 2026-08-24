import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` empaqueta un servidor Node mínimo en `.next/standalone`.
  // Es lo que después vamos a envolver en un instalador de escritorio (.exe)
  // para que corra 100% offline en la PC del gimnasio.
  output: "standalone",

  experimental: {
    serverActions: {
      // La importación de socios manda la planilla completa por Server Action.
      // El tope por defecto (1 MB) se queda corto con un Excel de varios miles
      // de filas; 10 MB cubre de sobra el padrón de un gimnasio.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
