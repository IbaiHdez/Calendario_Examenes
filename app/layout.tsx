import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calendario de exámenes",
  description: "Consulta los exámenes de tu clase por asignatura y fecha.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}


