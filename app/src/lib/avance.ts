import { prisma } from "@/lib/prisma";
import {
  TRABAJO_VACIO,
  progresoDeEje,
  progresoDelCurso,
  sesionCompletada,
  type TrabajoEnSesion,
} from "@/lib/progreso";

/**
 * Reúne el trabajo real de los estudiantes y lo convierte en avance.
 *
 * Las reglas viven en `progreso.ts`, que es puro y está cubierto por pruebas;
 * aquí solo se consulta la base de datos y se juntan las piezas.
 */

export type AvanceEje = {
  ejeId: string;
  numero: number;
  nombre: string;
  peso: number;
  progreso: number;
  publicadas: number;
  completadas: number;
};

export type AvanceEstudiante = {
  userId: string;
  total: number;
  ejes: AvanceEje[];
  /** Identificadores de las sesiones que la persona ya completó. */
  completadas: Set<string>;
};

type Recuento = Map<string, Map<string, TrabajoEnSesion>>;

/** Crea la casilla de un usuario en una sesión la primera vez que hace falta. */
function casilla(recuento: Recuento, userId: string, sesionId: string): TrabajoEnSesion {
  let porSesion = recuento.get(userId);
  if (!porSesion) {
    porSesion = new Map();
    recuento.set(userId, porSesion);
  }
  let trabajo = porSesion.get(sesionId);
  if (!trabajo) {
    trabajo = { ...TRABAJO_VACIO };
    porSesion.set(sesionId, trabajo);
  }
  return trabajo;
}

/**
 * Recoge, para un grupo de estudiantes, qué produjo cada uno en cada sesión.
 * Son seis consultas agrupadas en vez de una por estudiante y actividad.
 */
async function reunirTrabajo(userIds: string[], sesionIds: string[]): Promise<Recuento> {
  const recuento: Recuento = new Map();
  if (userIds.length === 0 || sesionIds.length === 0) return recuento;

  const donde = { autorId: { in: userIds }, sesionId: { in: sesionIds } };

  const [anotaciones, marcas, flores, entradas, respuestas, simulaciones] = await Promise.all([
    prisma.anotacion.findMany({ where: donde, select: { autorId: true, sesionId: true } }),
    prisma.marcaCartografia.findMany({ where: donde, select: { autorId: true, sesionId: true } }),
    prisma.florJardin.findMany({
      where: { autorId: { in: userIds }, sesionId: { in: sesionIds } },
      select: { autorId: true, sesionId: true },
    }),
    prisma.entradaDiario.findMany({
      where: { autorId: { in: userIds }, sesionId: { in: sesionIds } },
      select: { autorId: true, sesionId: true },
    }),
    prisma.respuestaActividad.findMany({
      where: { userId: { in: userIds }, sesionId: { in: sesionIds } },
      select: { userId: true, sesionId: true },
    }),
    prisma.simulacion.findMany({
      where: { userId: { in: userIds }, sesionId: { in: sesionIds }, validadaEn: { not: null } },
      select: { userId: true, sesionId: true },
    }),
  ]);

  for (const a of anotaciones) casilla(recuento, a.autorId, a.sesionId).anotaciones += 1;
  for (const m of marcas) casilla(recuento, m.autorId, m.sesionId).marcas += 1;
  for (const f of flores) {
    if (f.autorId) casilla(recuento, f.autorId, f.sesionId).flores += 1;
  }
  for (const e of entradas) {
    if (e.sesionId) casilla(recuento, e.autorId, e.sesionId).entradasDiario += 1;
  }
  for (const r of respuestas) casilla(recuento, r.userId, r.sesionId).respondio = true;
  for (const s of simulaciones) casilla(recuento, s.userId, s.sesionId).simulacionValidada = true;

  return recuento;
}

/**
 * Avance de varios estudiantes sobre el módulo activo. Devuelve un mapa por
 * identificador de usuario, para poder pintar una lista sin repetir consultas.
 */
export async function avanceDeEstudiantes(
  userIds: string[]
): Promise<Map<string, AvanceEstudiante>> {
  const ejes = await prisma.eje.findMany({
    where: { caso: { activo: true } },
    orderBy: { orden: "asc" },
    include: { sesiones: { orderBy: { orden: "asc" } } },
  });

  const sesiones = ejes.flatMap((e) => e.sesiones);
  const trabajo = await reunirTrabajo(userIds, sesiones.map((s) => s.id));

  const resultado = new Map<string, AvanceEstudiante>();

  for (const userId of userIds) {
    const suyo = trabajo.get(userId) ?? new Map<string, TrabajoEnSesion>();
    const completadas = new Set<string>();

    const avanceEjes: AvanceEje[] = ejes.map((eje) => {
      const estado = eje.sesiones.map((s) => {
        const hecha = sesionCompletada(s.pantalla, suyo.get(s.id) ?? TRABAJO_VACIO);
        if (hecha && s.publicada) completadas.add(s.id);
        return { publicada: s.publicada, completada: hecha };
      });

      return {
        ejeId: eje.id,
        numero: eje.numero,
        nombre: eje.nombre,
        peso: eje.peso,
        progreso: progresoDeEje(estado),
        publicadas: estado.filter((s) => s.publicada).length,
        completadas: estado.filter((s) => s.publicada && s.completada).length,
      };
    });

    resultado.set(userId, {
      userId,
      total: progresoDelCurso(avanceEjes),
      ejes: avanceEjes,
      completadas,
    });
  }

  return resultado;
}

/** Avance de un solo estudiante. */
export async function avanceDeEstudiante(userId: string): Promise<AvanceEstudiante> {
  const todos = await avanceDeEstudiantes([userId]);
  return (
    todos.get(userId) ?? { userId, total: 0, ejes: [], completadas: new Set<string>() }
  );
}

/** Promedio del grupo, para el panel del docente. */
export function promedioDelGrupo(avances: AvanceEstudiante[]): number {
  if (avances.length === 0) return 0;
  return Math.round(avances.reduce((s, a) => s + a.total, 0) / avances.length);
}
