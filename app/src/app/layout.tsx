import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--fuente-public-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Memoria El Salado · Plataforma educativa LMS / LCMS",
  description:
    "Plataforma web educativa para la enseñanza interactiva de la memoria histórica del conflicto armado colombiano.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${publicSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
