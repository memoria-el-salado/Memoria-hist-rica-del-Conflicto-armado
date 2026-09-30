import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CursoDetalle } from "./curso-detalle";

export default async function CursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await auth();
  const docenteId = sesion!.user.id;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: {
      grupos: { orderBy: { creadoEn: "asc" }, select: { id: true, nombre: true } },
      estudiantes: {
        where: { rol: "ESTUDIANTE" },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, usuario: true, iniciales: true, grupoId: true },
      },
    },
  });
  // Un curso ajeno no existe para este docente.
  if (!curso || curso.docenteId !== docenteId) notFound();

  const [sinCurso, ejes] = await Promise.all([
    prisma.user.findMany({
      where: { rol: "ESTUDIANTE", creadoPorId: docenteId, cursoId: null },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.eje.findMany({
      where: { caso: { activo: true } },
      orderBy: { orden: "asc" },
      select: { id: true, numero: true, nombre: true, esPreambulo: true },
    }),
  ]);

  return (
    <CursoDetalle
      curso={{ id: curso.id, nombre: curso.nombre, anio: curso.anio }}
      grupos={curso.grupos}
      estudiantes={curso.estudiantes}
      sinCurso={sinCurso}
      recorrido={{ recorrido: curso.recorrido, umbral: curso.umbral, abiertos: curso.ejesAbiertos }}
      ejes={ejes}
    />
  );
}
