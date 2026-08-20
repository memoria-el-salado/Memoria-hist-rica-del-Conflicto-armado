import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

export default async function DocenteLayout({ children }: { children: React.ReactNode }) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "DOCENTE") redirect("/login");

  const estudiantes = await prisma.user.count({
    where: { rol: "ESTUDIANTE", creadoPorId: sesion.user.id },
  });

  return (
    <AppShell
      rol="DOCENTE"
      nombre={sesion.user.name ?? ""}
      iniciales={sesion.user.iniciales}
      indicador={estudiantes === 1 ? "1 estudiante" : `${estudiantes} estudiantes`}
    >
      {children}
    </AppShell>
  );
}
