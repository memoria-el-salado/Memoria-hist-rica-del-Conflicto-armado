import { avanceDeEstudiantes } from "@/lib/avance";
import { prisma } from "@/lib/prisma";
import { agregarPorSubpoblacion, categoriaDeReporte, type FilaSubpoblacion } from "@/lib/subpoblaciones";

/**
 * El resumen por subpoblación de los estudiantes de un docente (o de uno de
 * sus cursos), ya protegido: solo categorías autorizadas y sin grupos de menos
 * de cinco. El panel, la página de reportes y el reporte guardado leen de aquí,
 * para que ninguno muestre más que los otros.
 */
export async function resumenDeSubpoblaciones(
  docenteId: string,
  cursoId: string | null = null
): Promise<{ filas: FilaSubpoblacion[]; ocultos: number; total: number }> {
  const estudiantes = await prisma.user.findMany({
    where: { rol: "ESTUDIANTE", creadoPorId: docenteId, ...(cursoId ? { cursoId } : {}) },
    select: {
      id: true,
      subpoblacion: true,
      subpoblacionConsentidaEn: true,
      _count: { select: { entradasDiario: true, anotaciones: true, respuestas: true } },
    },
  });
  const avances = await avanceDeEstudiantes(estudiantes.map((e) => e.id));

  const { filas, ocultos } = agregarPorSubpoblacion(
    estudiantes.map((e) => ({
      categoria: categoriaDeReporte({ subpoblacion: e.subpoblacion, consentidaEn: e.subpoblacionConsentidaEn }),
      avance: avances.get(e.id)?.total ?? 0,
      entregas: e._count.entradasDiario + e._count.anotaciones + e._count.respuestas,
    }))
  );
  return { filas, ocultos, total: estudiantes.length };
}
