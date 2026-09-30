import { prisma } from "@/lib/prisma";
import { detalleDeTrabajo, estaPendiente, type ClaseTrabajo } from "@/lib/revision";

/**
 * El trabajo de los estudiantes de un docente que admite comentario: las
 * respuestas a las actividades, las simulaciones validadas y las entradas del
 * diario que el estudiante decidió compartir. La página de revisión y la
 * campana del docente leen de aquí.
 */

export type Trabajo = {
  clase: ClaseTrabajo;
  id: string;
  estudiante: string;
  sesion: string | null;
  /** Código de la sesión, para los avisos. */
  codigo: string | null;
  etiqueta: string;
  detalle: string[];
  texto: string;
  /** Última versión: si el estudiante reescribe, cambia. */
  fecha: Date;
  comentarios: { id: string; texto: string; creadoEn: Date }[];
  pendiente: boolean;
};

const MAXIMO = 200;

export async function trabajosDeDocente(
  docenteId: string,
  opciones: { cursoId?: string | null; desde?: Date } = {}
): Promise<Trabajo[]> {
  const estudiantes = { rol: "ESTUDIANTE" as const, creadoPorId: docenteId, ...(opciones.cursoId ? { cursoId: opciones.cursoId } : {}) };
  const comentarios = {
    where: { docenteId },
    orderBy: { creadoEn: "asc" as const },
    select: { id: true, texto: true, creadoEn: true },
  };
  const sesion = { select: { codigo: true, titulo: true, pantalla: true } };

  const [respuestas, simulaciones, entradas] = await Promise.all([
    prisma.respuestaActividad.findMany({
      where: { user: estudiantes, ...(opciones.desde ? { actualizadoEn: { gte: opciones.desde } } : {}) },
      orderBy: { actualizadoEn: "desc" },
      take: MAXIMO,
      include: { user: { select: { nombre: true } }, sesion, comentarios },
    }),
    prisma.simulacion.findMany({
      where: { user: estudiantes, validadaEn: opciones.desde ? { gte: opciones.desde } : { not: null } },
      orderBy: { validadaEn: "desc" },
      take: MAXIMO,
      include: { user: { select: { nombre: true } }, sesion, comentarios },
    }),
    prisma.entradaDiario.findMany({
      where: { autor: estudiantes, privada: false, ...(opciones.desde ? { creadoEn: { gte: opciones.desde } } : {}) },
      orderBy: { creadoEn: "desc" },
      take: MAXIMO,
      include: { autor: { select: { nombre: true } }, sesion, comentarios },
    }),
  ]);

  const nombreSesion = (s: { codigo: string; titulo: string } | null) => (s ? `${s.codigo} ${s.titulo}` : null);

  const todos: Trabajo[] = [
    ...respuestas.map((r) => ({
      clase: "RESPUESTA" as const,
      id: r.id,
      estudiante: r.user.nombre,
      sesion: nombreSesion(r.sesion),
      codigo: r.sesion?.codigo ?? null,
      ...detalleDeTrabajo({ clase: "RESPUESTA", pantalla: r.sesion.pantalla, datos: r.datos }),
      texto: r.texto,
      fecha: r.actualizadoEn,
      comentarios: r.comentarios,
      pendiente: estaPendiente(r.actualizadoEn, r.comentarios),
    })),
    ...simulaciones.map((s) => ({
      clase: "SIMULACION" as const,
      id: s.id,
      estudiante: s.user.nombre,
      sesion: nombreSesion(s.sesion),
      codigo: s.sesion?.codigo ?? null,
      ...detalleDeTrabajo({ clase: "SIMULACION", equidad: s.indiceEquidad }),
      texto: "",
      fecha: s.validadaEn!,
      comentarios: s.comentarios,
      pendiente: estaPendiente(s.validadaEn!, s.comentarios),
    })),
    ...entradas.map((e) => ({
      clase: "DIARIO" as const,
      id: e.id,
      estudiante: e.autor.nombre,
      sesion: nombreSesion(e.sesion),
      codigo: e.sesion?.codigo ?? null,
      ...detalleDeTrabajo({ clase: "DIARIO", emocion: e.emocion }),
      texto: e.texto,
      fecha: e.creadoEn,
      comentarios: e.comentarios,
      pendiente: estaPendiente(e.creadoEn, e.comentarios),
    })),
  ];

  // Primero lo que espera comentario; dentro, lo más reciente arriba.
  return todos.sort((a, b) => Number(b.pendiente) - Number(a.pendiente) || b.fecha.getTime() - a.fecha.getTime());
}
