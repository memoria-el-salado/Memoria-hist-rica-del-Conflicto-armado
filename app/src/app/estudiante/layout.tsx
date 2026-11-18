import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { avanceDeEstudiante } from "@/lib/avance";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { esExplorador } from "@/lib/exploradores";
import { avisosPara } from "@/lib/avisos-datos";
import { tieneAula } from "@/lib/aulas";

export default async function EstudianteLayout({ children }: { children: React.ReactNode }) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ESTUDIANTE") redirect("/login");

  // El indicador de la cabecera es el avance ponderado del curso, con el peso
  // que el docente le dio a cada eje.
  const [avance, yo, avisos] = await Promise.all([
    avanceDeEstudiante(sesion.user.id),
    prisma.user.findUnique({ where: { id: sesion.user.id }, select: { explorador: true, creadoPor: { select: { rol: true } } } }),
    avisosPara(sesion.user.id, "ESTUDIANTE"),
  ]);
  // Como en un aula de Canvas: sin docente, la cuenta entra pero no ve contenidos.
  const conAula = tieneAula(yo?.creadoPor);

  return (
    <AppShell
      rol="ESTUDIANTE"
      avisos={avisos}
      nombre={sesion.user.name ?? ""}
      iniciales={sesion.user.iniciales}
      explorador={esExplorador(yo?.explorador) ? yo.explorador : null}
      indicador={`Progreso ${avance.total}%`}
    >
      {conAula ? children : <SinAula />}
    </AppShell>
  );
}

/** Lo que ve un estudiante que todavía no está en el aula de ningún docente. */
function SinAula() {
  return (
    <section aria-labelledby="titulo-sin-aula" className="animar-aparecer max-w-[620px] rounded-xl border border-terciario-borde bg-terciario-tinte px-6 py-6">
      <h1 id="titulo-sin-aula" className="text-[1.25rem] font-extrabold text-tinta-media">Todavía no estás en un aula</h1>
      <p className="mt-2 text-[0.84375rem] leading-[1.65] text-apagado">
        Tu cuenta ya funciona, pero aún no está conectada con un docente. Cuando la administración te asigne a su aula,
        aquí verás el mapa del viaje, las sesiones y los debates de tu curso.
      </p>
      <p className="mt-2 text-[0.84375rem] leading-[1.65] text-apagado">Si crees que es un error, avísale a tu docente.</p>
    </section>
  );
}
