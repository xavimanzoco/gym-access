import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 es un módulo nativo: no debe empaquetarse, se carga
  // directamente desde node_modules en el servidor.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
