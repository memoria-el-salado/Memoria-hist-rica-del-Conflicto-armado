import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

export default async function EstudianteLayout({ children }: { children: React.ReactNode }) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ESTUDIANTE") redirect("/login");

  const progresos = await prisma.progresoEje.findMany({
    where: { userId: sesion.user.id },
    select: { porcentaje: true },
  });
  const promedio = progresos.length
    ? Math.round(progresos.reduce((s, p) => s + p.porcentaje, 0) / progresos.length)
    : 0;

  return (
    <AppShell
      rol="ESTUDIANTE"
      nombre={sesion.user.name ?? ""}
      iniciales={sesion.user.iniciales}
      indicador={`Progreso ${promedio}%`}
    >
      {children}
    </AppShell>
  );
}
