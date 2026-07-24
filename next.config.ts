import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` empaqueta un servidor Node mínimo en `.next/standalone`.
  // Es lo que después vamos a envolver en un instalador de escritorio (.exe)
  // para que corra 100% offline en la PC del gimnasio.
  output: "standalone",
};

export default nextConfig;
