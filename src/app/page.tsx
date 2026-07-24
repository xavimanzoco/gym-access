import { redirect } from "next/navigation";

/** La pantalla principal del sistema es el kiosco de ingreso. */
export default function Home() {
  redirect("/ingreso");
}
