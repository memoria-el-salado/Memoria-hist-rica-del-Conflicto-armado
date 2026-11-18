import { prisma } from "@/lib/prisma";
import { etiquetaCurso } from "@/lib/cursos";
import { tieneAula, valorDeDestino } from "@/lib/aulas";
import { generarContrasenaTemporal } from "@/lib/politica-contrasena";
import { GestionAulas } from "./gestion-aulas";

/**
 * La administración conecta a cada estudiante con su docente, como un aula de
 * Canvas: quien no está en el aula de un docente no ve los contenidos.
 */
export default async function AulasPage() {
  const [docentes, cursos, estudiantes] = await Promise.all([
    prisma.user.findMany({ where: { rol: "DOCENTE" }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.curso.findMany({
      orderBy: [{ anio: "desc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, anio: true, docenteId: true, _count: { select: { estudiantes: true } } },
    }),
    prisma.user.findMany({
      where: { rol: "ESTUDIANTE" },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, usuario: true, creadoPorId: true, cursoId: true, creadoPor: { select: { rol: true } } },
    }),
  ]);
  const idsDocentes = new Set(docentes.map((d) => d.id));

  return (
    <GestionAulas
      sugerencia={generarContrasenaTemporal()}
      anio={new Date().getFullYear()}
      docentes={docentes.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        aulas: cursos.filter((c) => c.docenteId === d.id).map((c) => ({ id: c.id, etiqueta: etiquetaCurso(c) })),
      }))}
      aulas={cursos.map((c) => ({ id: c.id, etiqueta: etiquetaCurso(c), docenteId: c.docenteId, estudiantes: c._count.estudiantes }))}
      estudiantes={estudiantes.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        usuario: e.usuario,
        destino: valorDeDestino(e, idsDocentes),
        conectado: tieneAula(e.creadoPor),
      }))}
    />
  );
}
