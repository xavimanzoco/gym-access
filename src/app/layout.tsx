import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AccesoProvider } from "@/components/acceso/AccesoProvider";
import { MolineteListener } from "@/components/acceso/MolineteListener";
import { Sidebar } from "@/components/layout/Sidebar";
import { APP_NOMBRE } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_NOMBRE} — Control de acceso`,
  description: "Sistema de control de acceso y socios del gimnasio (offline).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <AccesoProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
          <MolineteListener />
        </AccesoProvider>
      </body>
    </html>
  );
}
