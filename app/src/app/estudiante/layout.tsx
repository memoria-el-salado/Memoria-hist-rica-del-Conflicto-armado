import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { avanceDeEstudiante } from "@/lib/avance";
import { AppShell } from "@/components/app-shell";
import { avisosPara } from "@/lib/avisos-datos";

export default async function EstudianteLayout({ children }: { children: React.ReactNode }) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ESTUDIANTE") redirect("/login");

  // El indicador de la cabecera es el avance ponderado del curso, con el peso
  // que el docente le dio a cada eje.
  const avance = await avanceDeEstudiante(sesion.user.id);

  return (
    <AppShell
      rol="ESTUDIANTE"
      avisos={await avisosPara(sesion.user.id, "ESTUDIANTE")}
      nombre={sesion.user.name ?? ""}
      iniciales={sesion.user.iniciales}
      indicador={`Progreso ${avance.total}%`}
    >
      {children}
    </AppShell>
  );
}
