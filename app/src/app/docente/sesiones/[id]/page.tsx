import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { esGuiada, leerDatosGuiada, leerDilema, leerInvestigacion, repartoDeOpciones, SE_PLANTEA } from "@/lib/actividades";
import { prisma } from "@/lib/prisma";
import { FormularioPlanteamiento } from "./formulario-planteamiento";

export default async function PlantearSesionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const docenteId = (await auth())!.user.id;

  const sesion = await prisma.sesion.findUnique({
    where: { id },
    select: { id: true, codigo: true, titulo: true, pantalla: true, preguntaOrientadora: true, eje: { select: { numero: true, nombre: true } } },
  });
  if (!sesion || !esGuiada(sesion.pantalla) || !SE_PLANTEA[sesion.pantalla]) notFound();

  const [planteamiento, respuestas] = await Promise.all([
    prisma.planteamientoSesion.findUnique({ where: { sesionId_docenteId: { sesionId: id, docenteId } } }),
    // Las respuestas de sus estudiantes, para saber cómo va la actividad.
    prisma.respuestaActividad.findMany({ where: { sesionId: id, user: { creadoPorId: docenteId } }, select: { datos: true } }),
  ]);

  const dilema = sesion.pantalla === "dilema" ? leerDilema(planteamiento?.datos) : null;
  const investigacion = sesion.pantalla === "investigar" ? leerInvestigacion(planteamiento?.datos) : null;
  const reparto = dilema
    ? repartoDeOpciones(
        dilema.opciones,
        respuestas.map((r) => leerDatosGuiada(r.datos).opcion).filter((o): o is string => Boolean(o))
      )
    : null;

  return (
    <div className="animar-aparecer max-w-[820px]">
      <Link href="/docente/panel" className="text-[11.5px] font-semibold text-apagado no-underline hover:text-primario">
        ← Panel del docente
      </Link>
      <div className="mt-2 text-[10.5px] font-bold tracking-[.14em] text-primario">
        EJE {sesion.eje.numero} · {sesion.pantalla === "dilema" ? "DILEMA" : "A INVESTIGAR"}
      </div>
      <h1 className="mb-1.5 mt-1.5 text-[24px] font-extrabold leading-tight tracking-[-.02em]">
        <span className="text-primario">{sesion.codigo}</span> {sesion.titulo}
      </h1>
      <p className="mb-5 text-[13.5px] leading-[1.65] text-apagado">
        {sesion.pantalla === "dilema"
          ? "Plantea el dilema a tus estudiantes: la pregunta y entre dos y cuatro opciones. Cada quien elige y justifica, y después ve cómo eligió el curso. Adáptalo a tu contexto: la guía sugiere que, donde el territorio sigue en disputa, se exploren solo las acciones no violentas."
          : "Plantea la pregunta que tus estudiantes van a investigar. Entregan lo que encontraron con sus fuentes."}{" "}
        {respuestas.length === 1 ? "Ya respondió 1 estudiante." : `Han respondido ${respuestas.length} estudiantes.`}
      </p>

      <FormularioPlanteamiento
        sesionId={sesion.id}
        tipo={sesion.pantalla}
        pregunta={dilema?.pregunta ?? investigacion?.pregunta ?? sesion.preguntaOrientadora ?? ""}
        opciones={dilema?.opciones ?? ["", ""]}
        yaPlanteada={Boolean(planteamiento)}
      />

      {reparto && respuestas.length > 0 && (
        <section className="mt-5 rounded-xl border border-borde bg-superficie p-5">
          <h2 className="text-[11px] font-bold tracking-[.12em] text-tenue">CÓMO ELIGIERON TUS ESTUDIANTES</h2>
          <ul className="mt-2 grid gap-1 text-[13px]">
            {reparto.map((r) => (
              <li key={r.opcion} className="flex justify-between gap-3">
                <span>{r.opcion}</span>
                <strong>{r.cuantos}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
