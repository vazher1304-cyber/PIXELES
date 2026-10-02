import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pixeles · Oficina virtual",
  description: "Oficina virtual en pixel art con audio por proximidad.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
