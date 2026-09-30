import { avanceDeEstudiante, type AvanceEstudiante } from "@/lib/avance";
import { estadoDeEjes, type EstadoEje, type Recorrido } from "@/lib/desbloqueo";
import { prisma } from "@/lib/prisma";

export type RecorridoEstudiante = {
  /** Estado de cada eje del módulo activo. */
  ejes: Map<string, EstadoEje>;
  /** El umbral del curso, para explicar qué falta en un eje cerrado. */
  umbral: number;
  enOrden: boolean;
};

/**
 * Qué ejes tiene abiertos un estudiante según el recorrido de su curso. Si el
 * curso es libre, o el estudiante no tiene curso, todo está abierto y no hace
 * falta calcular su avance.
 */
export async function recorridoDe(userId: string, avance?: AvanceEstudiante): Promise<RecorridoEstudiante> {
  const [yo, ejes] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { curso: { select: { recorrido: true, umbral: true, ejesAbiertos: true } } } }),
    prisma.eje.findMany({
      where: { caso: { activo: true } },
      orderBy: { orden: "asc" },
      select: { id: true, esPreambulo: true, _count: { select: { sesiones: { where: { publicada: true } } } } },
    }),
  ]);
  const curso = yo?.curso;
  const enOrden = curso?.recorrido === "EN_ORDEN";
  const progreso = enOrden ? new Map((avance ?? (await avanceDeEstudiante(userId))).ejes.map((e) => [e.ejeId, e.progreso])) : new Map();

  const estados = estadoDeEjes(
    ejes.map((e) => ({ id: e.id, esPreambulo: e.esPreambulo, publicadas: e._count.sesiones, progreso: progreso.get(e.id) ?? 0 })),
    curso ? { recorrido: curso.recorrido as Recorrido, umbral: curso.umbral, abiertos: curso.ejesAbiertos } : null
  );
  return { ejes: new Map(estados.map((e) => [e.id, e])), umbral: curso?.umbral ?? 0, enOrden };
}
