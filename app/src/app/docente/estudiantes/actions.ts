"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generarContrasenaTemporal } from "@/lib/politica-contrasena";
import { validarAltaUsuario } from "@/lib/usuarios";
import { validarDeclaracion } from "@/lib/subpoblaciones";

/**
 * Alta de estudiantes. Solo un docente puede hacerlo, y el estudiante queda
 * vinculado a quien lo creó, que es quien responde por esa cuenta.
 */
export async function crearEstudiante(_prev: unknown, formData: FormData) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "DOCENTE") return { error: "No autorizado." };

  const revision = validarAltaUsuario({
    nombre: formData.get("nombre"),
    usuario: formData.get("usuario"),
    contrasena: formData.get("contrasena"),
  });
  if ("error" in revision) return { error: revision.error };

  const { nombre, usuario, contrasena, iniciales, email } = revision.datos;

  const existente = await prisma.user.findFirst({ where: { OR: [{ usuario }, { email }] } });
  if (existente) return { error: `El usuario "${usuario}" ya está registrado.` };

  // El curso es opcional, y solo puede ser uno del propio docente.
  const cursoId = String(formData.get("cursoId") ?? "") || null;
  if (cursoId) {
    const curso = await prisma.curso.findUnique({ where: { id: cursoId }, select: { docenteId: true } });
    if (curso?.docenteId !== sesion.user.id) return { error: "Ese curso no es tuyo." };
  }

  await prisma.user.create({
    data: {
      nombre,
      usuario,
      email,
      iniciales,
      rol: "ESTUDIANTE",
      passwordHash: await bcrypt.hash(contrasena, 10),
      creadoPorId: sesion.user.id,
      cursoId,
      // La contraseña es provisional: el estudiante elegirá la suya al entrar.
      debeCambiarContrasena: true,
    },
  });

  revalidatePath("/docente/estudiantes");
  revalidatePath("/docente/panel");
  revalidatePath("/docente/subpoblaciones");
  revalidatePath("/docente/cursos");
  return { ok: `Estudiante "${nombre}" creado.`, entrega: { nombre, usuario, contrasena } };
}

/**
 * Emite una contraseña provisional nueva para un estudiante del grupo. Solo
 * puede hacerlo el docente que lo dio de alta.
 */
export async function restablecerEstudiante(id: string) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "DOCENTE") return { error: "No autorizado." };

  const estudiante = await prisma.user.findUnique({ where: { id } });
  if (!estudiante || estudiante.creadoPorId !== sesion.user.id) {
    return { error: "Ese estudiante no pertenece a tu grupo." };
  }

  const contrasena = generarContrasenaTemporal();
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await bcrypt.hash(contrasena, 10),
      debeCambiarContrasena: true,
      contrasenaCambiadaEn: null,
    },
  });

  revalidatePath("/docente/estudiantes");
  return { contrasena };
}

/**
 * Declara (o retira) la subpoblación de un estudiante. Es un dato sensible de
 * un menor: una categoría solo se guarda si el docente registra que el
 * acudiente la autorizó, y se guarda la fecha de esa autorización.
 */
export async function declararSubpoblacion(id: string, entrada: { categoria: unknown; consentimiento: unknown }) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "DOCENTE") return { error: "No autorizado." };

  const estudiante = await prisma.user.findUnique({ where: { id }, select: { creadoPorId: true, nombre: true } });
  if (!estudiante || estudiante.creadoPorId !== sesion.user.id) return { error: "Ese estudiante no pertenece a tu grupo." };

  const revision = validarDeclaracion(entrada);
  if ("error" in revision) return { error: revision.error };

  await prisma.user.update({
    where: { id },
    data: { subpoblacion: revision.subpoblacion, subpoblacionConsentidaEn: revision.subpoblacion ? new Date() : null },
  });
  revalidatePath("/docente/estudiantes");
  revalidatePath("/docente/panel");
  revalidatePath("/docente/subpoblaciones");
  return {
    ok: revision.subpoblacion
      ? `Subpoblación de ${estudiante.nombre} registrada con la autorización del acudiente.`
      : `La subpoblación de ${estudiante.nombre} queda sin declarar.`,
  };
}
