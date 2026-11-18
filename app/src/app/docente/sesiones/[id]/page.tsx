import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { esGuiada, leerDatosGuiada, leerDilema, leerInvestigacion, repartoDeOpciones, SE_PLANTEA } from "@/lib/actividades";
import { cargarAnotaciones } from "@/lib/anotaciones-datos";
import { cursoElegido, etiquetaCurso } from "@/lib/cursos";
import { ACTIVIDADES, esEspecial } from "@/lib/importador-pdf";
import { prisma } from "@/lib/prisma";
import { Conversacion } from "@/components/anotaciones/conversacion";
import { FiltroCurso } from "@/components/filtro-curso";
import { CartillasSesion } from "@/components/cartillas/cartillas-sesion";
import { cartillasDeSesion } from "@/lib/cartillas";
import { cartillasDelCaso } from "@/lib/cartillas-datos";
import { actividadesDeSesion } from "@/lib/actividades-cartilla";
import { fechaYHora } from "@/lib/fechas";
import { FormularioPlanteamiento } from "./formulario-planteamiento";

/**
 * Una sesión vista por el docente. En las de «se plantea» (dilema, a
 * investigar) escribe la pregunta; en las de archivo y anotaciones conversa
 * con sus estudiantes: responde y destaca las anotaciones que ayudan a todo el
 * curso. Lo demás que entregan se comenta en Revisión.
 */
export default async function SesionDocentePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ curso?: string | string[] }>;
}) {
  const { id } = await params;
  const docenteId = (await auth())!.user.id;

  const sesion = await prisma.sesion.findUnique({
    where: { id },
    select: {
      id: true,
      codigo: true,
      titulo: true,
      pantalla: true,
      publicada: true,
      preguntaOrientadora: true,
      subsecciones: { orderBy: { orden: "asc" }, select: { codigo: true, titulo: true } },
      eje: { select: { numero: true, nombre: true, casoId: true } },
    },
  });
  if (!sesion) notFound();

  const sePlantea = esGuiada(sesion.pantalla) && SE_PLANTEA[sesion.pantalla];
  // «zona» es la lectura con anotaciones; un tipo desconocido también cae ahí en el estudiante.
  const conAnotaciones = !ACTIVIDADES.some((a) => a.valor === sesion.pantalla && a.valor !== "zona");
  const etiqueta = ACTIVIDADES.find((a) => a.valor === sesion.pantalla)?.etiqueta ?? "Archivo y anotaciones";

  const cursos = await prisma.curso.findMany({
    where: { docenteId },
    orderBy: [{ anio: "desc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, anio: true },
  });
  const elegido = cursoElegido((await searchParams).curso, cursos);
  // Las dos cartillas, cada una en su apartado: la del estudiante para leer en
  // clase y la guía para maestros con las orientaciones de la sesión.
  const cartillas = cartillasDeSesion(await cartillasDelCaso(sesion.eje.casoId), sesion.codigo, "DOCENTE");

  return (
    <div className="animar-aparecer max-w-[860px]">
      <Link href="/docente/panel" className="text-[11.5px] font-semibold text-apagado no-underline hover:text-primario-texto">
        ← Panel del docente
      </Link>
      <div className="mt-2 text-[10.5px] font-bold tracking-[.14em] text-primario-texto">
        EJE {sesion.eje.numero} · {esEspecial(sesion.pantalla) && "ACTIVIDAD ESPECIAL: "}
        {etiqueta.toUpperCase()}
        {!sesion.publicada && <span className="text-suave"> · BORRADOR</span>}
      </div>
      <h1 className="mb-1.5 mt-1.5 text-[24px] font-extrabold leading-tight tracking-[-.02em]">
        <span className="text-primario-texto">{sesion.codigo}</span> {sesion.titulo}
      </h1>

      <CartillasSesion cartillas={cartillas} codigo={sesion.codigo} className="mb-6 mt-3" />

      {sePlantea && <Planteamiento sesion={sesion} docenteId={docenteId} />}

      {conAnotaciones && (
        <>
          <p className="mb-4 text-[13.5px] leading-[1.65] text-apagado">
            Tus estudiantes leen el texto de la sesión y lo anotan. Aquí ves sus anotaciones: puedes responderles,
            anotar tú también y destacar las que le sirven a todo el curso; las destacadas aparecen en su pestaña
            «Destacados».
          </p>
          <FiltroCurso cursos={cursos.map((c) => ({ id: c.id, etiqueta: etiquetaCurso(c) }))} elegido={elegido} />
          <Conversacion
            sesionId={sesion.id}
            hilos={await cargarAnotaciones(sesion.id, { id: docenteId, rol: "DOCENTE", creadoPorId: null, cursoId: null }, elegido)}
            puedeDestacar
          />
        </>
      )}

      <RespuestasCartilla sesion={sesion} docenteId={docenteId} cursoId={elegido} />

      {!sePlantea && !conAnotaciones && (
        <p className="rounded-xl border border-borde bg-superficie p-5 text-[13.5px] leading-[1.65] text-apagado">
          Lo que tus estudiantes entregan en esta sesión lo ves y lo comentas en{" "}
          <Link href="/docente/revision" className="font-bold text-primario-fuerte">
            Revisión
          </Link>
          .
        </p>
      )}
    </div>
  );
}

/**
 * Las actividades de la cartilla de esta sesión y lo que respondió cada uno de
 * los estudiantes del docente (del curso elegido, si eligió uno).
 */
async function RespuestasCartilla({
  sesion,
  docenteId,
  cursoId,
}: {
  sesion: { id: string; codigo: string; titulo: string; subsecciones: { codigo: string; titulo: string }[] };
  docenteId: string;
  cursoId: string | null;
}) {
  const actividades = actividadesDeSesion(sesion, sesion.subsecciones);
  if (!actividades.length) return null;
  const respuestas = await prisma.respuestaCartilla.findMany({
    where: { sesionId: sesion.id, user: { creadoPorId: docenteId, ...(cursoId ? { cursoId } : {}) } },
    orderBy: { actualizadoEn: "desc" },
    select: { id: true, actividad: true, texto: true, actualizadoEn: true, user: { select: { nombre: true } } },
  });

  return (
    <section aria-labelledby="titulo-respuestas-cartilla" className="mb-6 rounded-xl border border-borde bg-superficie p-5">
      <h2 id="titulo-respuestas-cartilla" className="text-[12px] font-extrabold tracking-[.08em] text-tinta-media">
        ACTIVIDADES DE LA CARTILLA
      </h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-apagado">
        Los ejercicios que la cartilla propone en los apartados de esta sesión. Tus estudiantes los encuentran después de la
        actividad principal; aquí ves lo que respondió cada uno.
      </p>
      <ul className="mt-3 grid gap-2.5">
        {actividades.map(({ actividad, apartado }) => {
          const deEsta = respuestas.filter((r) => r.actividad === actividad.id);
          return (
            <li key={actividad.id} className="rounded-lg border border-borde bg-superficie-suave p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primario-tinte px-2 py-0.5 text-[11px] font-extrabold text-primario-fuerte">{apartado.codigo}</span>
                <span className="text-[13.5px] font-bold">{actividad.titulo}</span>
                <span className="ml-auto text-[11.5px] font-bold text-apagado">
                  {deEsta.length === 1 ? "1 respuesta" : `${deEsta.length} respuestas`}
                </span>
              </div>
              {deEsta.length > 0 && (
                <ul className="mt-2 grid gap-1.5">
                  {deEsta.map((r) => (
                    <li key={r.id}>
                      <details className="rounded-lg border border-borde bg-white px-3 py-2">
                        <summary className="cursor-pointer text-[12.5px] font-bold text-tinta-media">
                          {r.user.nombre} <span className="font-normal text-apagado">· {fechaYHora(r.actualizadoEn)}</span>
                        </summary>
                        <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-tinta-media">{r.texto}</p>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function Planteamiento({
  sesion,
  docenteId,
}: {
  sesion: { id: string; pantalla: string; preguntaOrientadora: string | null };
  docenteId: string;
}) {
  const [planteamiento, respuestas] = await Promise.all([
    prisma.planteamientoSesion.findUnique({ where: { sesionId_docenteId: { sesionId: sesion.id, docenteId } } }),
    // Las respuestas de sus estudiantes, para saber cómo va la actividad.
    prisma.respuestaActividad.findMany({ where: { sesionId: sesion.id, user: { creadoPorId: docenteId } }, select: { datos: true } }),
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
    <>
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
    </>
  );
}
