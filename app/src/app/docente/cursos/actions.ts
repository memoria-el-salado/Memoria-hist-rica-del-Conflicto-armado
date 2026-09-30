"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeAsignar, repartirEnGrupos, validarCurso, validarGrupo } from "@/lib/cursos";

type Resultado = { ok?: string; error?: string };

async function docente() {
  const sesion = await auth();
  return sesion?.user?.rol === "DOCENTE" ? sesion.user.id : null;
}

/** El curso, solo si es de quien lo pide. */
async function miCurso(cursoId: string, docenteId: string) {
  const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
  return curso?.docenteId === docenteId ? curso : null;
}

/** Todo lo que se ve distinto cuando cambia un curso o quién está en él. */
function refrescar(cursoId?: string) {
  revalidatePath("/docente/cursos");
  if (cursoId) revalidatePath(`/docente/cursos/${cursoId}`);
  revalidatePath("/docente/estudiantes");
  revalidatePath("/docente/panel");
  revalidatePath("/docente/subpoblaciones");
  revalidatePath("/docente/foros");
}

const repetido = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function crearCurso(_prev: unknown, formData: FormData): Promise<Resultado> {
  const docenteId = await docente();
  if (!docenteId) return { error: "No autorizado." };

  const revision = validarCurso({ nombre: formData.get("nombre"), anio: formData.get("anio") }, new Date().getFullYear());
  if ("error" in revision) return { error: revision.error };

  try {
    await prisma.curso.create({ data: { ...revision.datos, docenteId } });
  } catch (e) {
    if (repetido(e)) return { error: `Ya tienes un curso ${revision.datos.nombre} en ${revision.datos.anio}.` };
    throw e;
  }

  refrescar();
  return { ok: `Curso ${revision.datos.nombre} creado. Ábrelo para sumar estudiantes y armar grupos.` };
}

/**
 * Borra el curso y sus grupos. Los estudiantes no se borran: siguen siendo del
 * docente, solo que sin curso.
 */
export async function eliminarCurso(cursoId: string) {
  const docenteId = await docente();
  if (!docenteId || !(await miCurso(cursoId, docenteId))) return { error: "Ese curso no es tuyo." };

  // Los grupos se borran con el curso; los estudiantes quedan sin grupo.
  await prisma.$transaction([
    prisma.user.updateMany({ where: { cursoId }, data: { grupoId: null } }),
    prisma.curso.delete({ where: { id: cursoId } }),
  ]);
  refrescar();
  redirect("/docente/cursos");
}

export async function crearGrupo(cursoId: string, nombre: string): Promise<Resultado> {
  const docenteId = await docente();
  if (!docenteId || !(await miCurso(cursoId, docenteId))) return { error: "Ese curso no es tuyo." };

  const revision = validarGrupo(nombre);
  if ("error" in revision) return { error: revision.error };

  try {
    await prisma.grupo.create({ data: { nombre: revision.datos, cursoId } });
  } catch (e) {
    if (repetido(e)) return { error: `Ya hay un grupo ${revision.datos} en este curso.` };
    throw e;
  }
  refrescar(cursoId);
  return { ok: `Grupo ${revision.datos} creado.` };
}

export async function eliminarGrupo(grupoId: string): Promise<Resultado> {
  const docenteId = await docente();
  const grupo = await prisma.grupo.findUnique({ where: { id: grupoId }, include: { curso: true } });
  if (!docenteId || grupo?.curso.docenteId !== docenteId) return { error: "Ese grupo no es tuyo." };

  await prisma.grupo.delete({ where: { id: grupoId } });
  refrescar(grupo.cursoId);
  return { ok: `Grupo ${grupo.nombre} eliminado; sus miembros quedan sin grupo.` };
}

/** Mete a un estudiante en un curso, o lo saca con `null`. Cambiar de curso lo deja sin grupo. */
export async function asignarCurso(estudianteId: string, cursoId: string | null): Promise<Resultado> {
  const docenteId = await docente();
  if (!docenteId) return { error: "No autorizado." };

  const [estudiante, curso] = await Promise.all([
    prisma.user.findUnique({ where: { id: estudianteId } }),
    cursoId ? prisma.curso.findUnique({ where: { id: cursoId } }) : null,
  ]);
  if (!estudiante || (cursoId && !curso) || !puedeAsignar(docenteId, estudiante, { curso })) {
    return { error: "No puedes mover a ese estudiante a ese curso." };
  }

  if (estudiante.cursoId !== cursoId) {
    await prisma.user.update({ where: { id: estudianteId }, data: { cursoId, grupoId: null } });
  }
  refrescar(cursoId ?? estudiante.cursoId ?? undefined);
  if (estudiante.cursoId && estudiante.cursoId !== cursoId) revalidatePath(`/docente/cursos/${estudiante.cursoId}`);
  return { ok: curso ? `${estudiante.nombre} está en ${curso.nombre}.` : `${estudiante.nombre} quedó sin curso.` };
}

/** Mete a un estudiante en un grupo de su curso, o lo saca con `null`. */
export async function asignarGrupo(estudianteId: string, grupoId: string | null): Promise<Resultado> {
  const docenteId = await docente();
  if (!docenteId) return { error: "No autorizado." };

  const [estudiante, grupo] = await Promise.all([
    prisma.user.findUnique({ where: { id: estudianteId } }),
    grupoId ? prisma.grupo.findUnique({ where: { id: grupoId }, include: { curso: true } }) : null,
  ]);
  if (!estudiante || (grupoId && !grupo) || !puedeAsignar(docenteId, estudiante, { grupo })) {
    return { error: "Ese grupo no es del curso del estudiante." };
  }

  await prisma.user.update({ where: { id: estudianteId }, data: { grupoId } });
  refrescar(estudiante.cursoId ?? undefined);
  return { ok: grupo ? `${estudiante.nombre} está en el grupo ${grupo.nombre}.` : `${estudiante.nombre} quedó sin grupo.` };
}

/** Reparte entre los grupos a quienes del curso todavía no tienen uno. */
export async function repartirGrupos(cursoId: string): Promise<Resultado> {
  const docenteId = await docente();
  if (!docenteId || !(await miCurso(cursoId, docenteId))) return { error: "Ese curso no es tuyo." };

  const [sinGrupo, grupos] = await Promise.all([
    prisma.user.findMany({ where: { cursoId, rol: "ESTUDIANTE", grupoId: null }, orderBy: { nombre: "asc" }, select: { id: true } }),
    prisma.grupo.findMany({ where: { cursoId }, orderBy: { creadoEn: "asc" }, include: { _count: { select: { miembros: true } } } }),
  ]);
  if (!grupos.length) return { error: "Crea al menos un grupo antes de repartir." };

  const reparto = repartirEnGrupos(
    sinGrupo.map((e) => e.id),
    grupos.map((g) => ({ id: g.id, miembros: g._count.miembros }))
  );
  await prisma.$transaction(
    [...reparto].map(([id, grupoId]) => prisma.user.update({ where: { id }, data: { grupoId } }))
  );

  refrescar(cursoId);
  return { ok: reparto.size === 1 ? "1 estudiante recibió grupo." : `${reparto.size} estudiantes recibieron grupo.` };
}
