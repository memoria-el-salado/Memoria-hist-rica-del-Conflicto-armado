import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resumenDeSubpoblaciones } from "@/lib/subpoblaciones-datos";
import { cursoElegido, etiquetaCurso } from "@/lib/cursos";
import { FiltroCurso } from "@/components/filtro-curso";
import { ReportesSubpoblaciones } from "./reportes-subpoblaciones";

const RECOMENDACIONES: Record<string, string> = {
  "Víctimas directas": "Reducir carga escrita; priorizar formatos orales.",
  "Población desplazada": "Reforzar acompañamiento en el eje 5.",
  Retornados: "Habilitar rol de mentor en foros.",
  "Sin vínculo directo": "Sumar actividades de escucha activa.",
};

export default async function SubpoblacionesPage({ searchParams }: { searchParams: Promise<{ curso?: string | string[] }> }) {
  const sesion = await auth();

  const cursos = await prisma.curso.findMany({
    where: { docenteId: sesion!.user.id },
    orderBy: [{ anio: "desc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, anio: true },
  });
  const elegido = cursoElegido((await searchParams).curso, cursos);

  const [resumen, reportes] = await Promise.all([
    resumenDeSubpoblaciones(sesion!.user.id, elegido),
    // Cada docente ve solo sus reportes.
    prisma.reporteDiferenciado.findMany({ where: { docenteId: sesion!.user.id }, orderBy: { creadoEn: "desc" } }),
  ]);

  const colores = ["#D95D39", "#EBB035", "#177575", "#1B8A8A", "#A79E96"];
  const filas = resumen.filas.map((f, i) => ({
    ...f,
    color: colores[i % colores.length],
    recomendacion: RECOMENDACIONES[f.nombre] ?? "Invita a las familias a declarar la subpoblación, con su autorización.",
  }));

  return (
    <ReportesSubpoblaciones
      filtro={<FiltroCurso cursos={cursos.map((c) => ({ id: c.id, etiqueta: etiquetaCurso(c) }))} elegido={elegido} />}
      filas={filas}
      ocultos={resumen.ocultos}
      total={resumen.total}
      reportes={reportes.map((r) => ({ id: r.id, resumen: r.resumen }))}
    />
  );
}
