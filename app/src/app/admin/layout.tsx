import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ADMIN") redirect("/login");

  const [casos, docentes] = await Promise.all([
    prisma.caso.count(),
    prisma.user.count({ where: { rol: "DOCENTE" } }),
  ]);

  return (
    <AppShell
      rol="ADMIN"
      nombre={sesion.user.name ?? ""}
      iniciales={sesion.user.iniciales}
      indicador={`${docentes} docentes · ${casos} módulos`}
    >
      {children}
    </AppShell>
  );
}
