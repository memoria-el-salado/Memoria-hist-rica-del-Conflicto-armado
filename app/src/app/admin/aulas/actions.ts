"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cambiosDeAsignacion, leerDestino, type Destino } from "@/lib/aulas";
import { validarCurso } from "@/lib/cursos";
import { validarAltaUsuario } from "@/lib/usuarios";

type Resultado = { ok?: string; error?: string };

async function esAdmin() {
  const sesion = await auth();
  return sesion?.user?.rol === "ADMIN";
}

/** Lo que cambia para el administrador, los docentes y los estudiantes. */
function refrescar() {
  revalidatePath("/admin", "layout");
  revalidatePath("/docente", "layout");
  revalidatePath("/estudiante", "layout");
}

/** Convierte lo elegido en el selector en docente y curso, comprobando que existen. */
async function resolverDestino(valor: unknown): Promise<Destino | { error: string }> {
  const leido = leerDestino(valor);
  if (!leido) return { error: "No se reconoce el aula elegida." };
  if ("docenteId" in leido) {
    if (!leido.docenteId) return { docenteId: null, cursoId: null };
    const docente = await prisma.user.findUnique({ where: { id: leido.docenteId }, select: { rol: true } });
    if (docente?.rol !== "DOCENTE") return { error: "Ese docente no existe." };
    return { docenteId: leido.docenteId, cursoId: null };
  }
  const curso = await prisma.curso.findUnique({ where: { id: leido.cursoId }, select: { docenteId: true } });
  if (!curso) return { error: "Esa aula no existe." };
  return { docenteId: curso.docenteId, cursoId: leido.cursoId };
}

/** Pone a un estudiante en el aula de un docente, con un docente sin aula o sin docente. */
export async function asignarEstudiante(estudianteId: string, valor: string): Promise<Resultado> {
  if (!(await esAdmin())) return { error: "No autorizado." };

  const estudiante = await prisma.user.findUnique({
    where: { id: estudianteId },
    select: { rol: true, nombre: true, creadoPorId: true, cursoId: true, grupoId: true },
  });
  if (estudiante?.rol !== "ESTUDIANTE") return { error: "Ese estudiante no existe." };

  const destino = await resolverDestino(valor);
  if ("error" in destino) return destino;

  const cambios = cambiosDeAsignacion(estudiante, destino);
  if (cambios) await prisma.user.update({ where: { id: estudianteId }, data: cambios });
  refrescar();
  return {
    ok: destino.docenteId
      ? `${estudiante.nombre} quedó conectado con su docente.`
      : `${estudiante.nombre} quedó sin docente: no verá los contenidos hasta que lo asignes.`,
  };
}

/**
 * Le asigna un aula entera a un docente: el curso pasa a ser suyo y todos sus
 * estudiantes quedan conectados con él. Conservan su grupo de trabajo, que
 * sigue siendo del mismo curso.
 */
export async function asignarAula(cursoId: string, docenteId: string): Promise<Resultado> {
  if (!(await esAdmin())) return { error: "No autorizado." };

  const [curso, docente] = await Promise.all([
    prisma.curso.findUnique({ where: { id: cursoId }, select: { nombre: true, docenteId: true } }),
    prisma.user.findUnique({ where: { id: docenteId }, select: { rol: true, nombre: true } }),
  ]);
  if (!curso) return { error: "Esa aula no existe." };
  if (docente?.rol !== "DOCENTE") return { error: "Ese docente no existe." };
  if (curso.docenteId === docenteId) return { ok: `${curso.nombre} ya es de ${docente.nombre}.` };

  try {
    await prisma.$transaction([
      prisma.curso.update({ where: { id: cursoId }, data: { docenteId } }),
      prisma.user.updateMany({ where: { cursoId, rol: "ESTUDIANTE" }, data: { creadoPorId: docenteId } }),
    ]);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `${docente.nombre} ya tiene un aula llamada ${curso.nombre} en ese año.` };
    }
    throw e;
  }
  refrescar();
  return { ok: `${curso.nombre} y sus estudiantes quedaron con ${docente.nombre}.` };
}

/** Crea un aula (un curso) para un docente. */
export async function crearAula(_prev: unknown, formData: FormData): Promise<Resultado> {
  if (!(await esAdmin())) return { error: "No autorizado." };

  const revision = validarCurso({ nombre: formData.get("nombre"), anio: formData.get("anio") }, new Date().getFullYear());
  if ("error" in revision) return { error: revision.error };
  const docenteId = String(formData.get("docenteId") ?? "");
  const docente = await prisma.user.findUnique({ where: { id: docenteId }, select: { rol: true, nombre: true } });
  if (docente?.rol !== "DOCENTE") return { error: "Elige el docente a cargo del aula." };

  try {
    await prisma.curso.create({ data: { ...revision.datos, docenteId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `${docente.nombre} ya tiene un aula llamada ${revision.datos.nombre} en ${revision.datos.anio}.` };
    }
    throw e;
  }
  refrescar();
  return { ok: `Aula ${revision.datos.nombre} creada para ${docente.nombre}.` };
}

/**
 * Alta de un estudiante desde la administración, directamente en el aula de un
 * docente. Si se deja sin aula, la cuenta existe pero no ve contenidos hasta
 * que se le asigne.
 */
export async function crearEstudianteEnAula(
  _prev: unknown,
  formData: FormData
): Promise<{ ok?: string; error?: string; entrega?: { nombre: string; usuario: string; contrasena: string } }> {
  if (!(await esAdmin())) return { error: "No autorizado." };

  const revision = validarAltaUsuario({
    nombre: formData.get("nombre"),
    usuario: formData.get("usuario"),
    contrasena: formData.get("contrasena"),
  });
  if ("error" in revision) return { error: revision.error };
  const { nombre, usuario, contrasena, iniciales, email } = revision.datos;

  const destino = await resolverDestino(formData.get("destino"));
  if ("error" in destino) return destino;

  const existente = await prisma.user.findFirst({ where: { OR: [{ usuario }, { email }] } });
  if (existente) return { error: `El usuario "${usuario}" ya está registrado.` };

  await prisma.user.create({
    data: {
      nombre,
      usuario,
      email,
      iniciales,
      rol: "ESTUDIANTE",
      passwordHash: await bcrypt.hash(contrasena, 10),
      creadoPorId: destino.docenteId,
      cursoId: destino.cursoId,
      debeCambiarContrasena: true,
    },
  });
  refrescar();
  return { ok: `Estudiante "${nombre}" creado.`, entrega: { nombre, usuario, contrasena } };
}
