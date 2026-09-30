import { armarHilos } from "@/lib/foros";
import { prisma } from "@/lib/prisma";
import { anotacionesVisiblesPara } from "@/lib/visibilidad";

export type AnotacionVista = {
  id: string;
  autor: string;
  iniciales: string;
  rol: "DOCENTE" | "ESTUDIANTE";
  cita: string | null;
  texto: string;
  hora: string;
  /** Para ordenar en el navegador. */
  creadoEnMs: number;
  destacada: boolean;
  meSirve: number;
  yoMeSirve: boolean;
  propia: boolean;
};

export type HiloAnotacion = AnotacionVista & { respuestas: AnotacionVista[] };

const HORA: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" };

/**
 * Las anotaciones de una sesión que ve quien la abre, en hilos. El estudiante
 * ve las de su curso y las de su docente; el docente, las de sus estudiantes y
 * las suyas.
 */
export async function cargarAnotaciones(
  sesionId: string,
  quien: { id: string; rol: string; creadoPorId: string | null; cursoId: string | null },
  /** Para el docente: solo los estudiantes de este curso, además de él. */
  soloCurso: string | null = null
): Promise<HiloAnotacion[]> {
  const visibles =
    quien.rol === "DOCENTE"
      ? [{ autorId: quien.id }, { autor: { creadoPorId: quien.id, ...(soloCurso ? { cursoId: soloCurso } : {}) } }]
      : anotacionesVisiblesPara(quien);

  const anotaciones = await prisma.anotacion.findMany({
    where: { sesionId, OR: visibles },
    orderBy: { creadoEn: "asc" },
    include: {
      autor: { select: { nombre: true, iniciales: true, rol: true } },
      _count: { select: { meSirve: true } },
      meSirve: { where: { userId: quien.id }, select: { userId: true } },
    },
  });

  // Una respuesta cuyo original no se ve (otro curso, por ejemplo) no se
  // muestra suelta como si fuera una anotación nueva.
  const ids = new Set(anotaciones.map((a) => a.id));
  const vistas = anotaciones.filter((a) => !a.respuestaAId || ids.has(a.respuestaAId)).map((a) => ({
    id: a.id,
    respuestaAId: a.respuestaAId,
    creadoEn: a.creadoEn,
    vista: {
      id: a.id,
      autor: a.autor.nombre,
      iniciales: a.autor.iniciales,
      rol: a.autor.rol === "DOCENTE" ? ("DOCENTE" as const) : ("ESTUDIANTE" as const),
      cita: a.cita,
      texto: a.texto,
      hora: a.creadoEn.toLocaleString("es-CO", HORA),
      creadoEnMs: a.creadoEn.getTime(),
      destacada: a.destacada,
      meSirve: a._count.meSirve,
      yoMeSirve: a.meSirve.length > 0,
      propia: a.autorId === quien.id,
    } satisfies AnotacionVista,
  }));

  return armarHilos(vistas).map((h) => ({ ...h.vista, respuestas: h.respuestas.map((r) => r.vista) }));
}
