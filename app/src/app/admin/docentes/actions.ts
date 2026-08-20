"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generarContrasenaTemporal } from "@/lib/politica-contrasena";
import { validarAltaUsuario } from "@/lib/usuarios";

/**
 * Alta de docentes. Solo el administrador puede hacerlo: es el primer eslabón
 * de la cadena de responsabilidad sobre las cuentas de la plataforma.
 */
export async function crearDocente(_prev: unknown, formData: FormData) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ADMIN") return { error: "No autorizado." };

  const revision = validarAltaUsuario({
    nombre: formData.get("nombre"),
    usuario: formData.get("usuario"),
    contrasena: formData.get("contrasena"),
  });
  if ("error" in revision) return { error: revision.error };

  const { nombre, usuario, contrasena, iniciales, email } = revision.datos;

  const existente = await prisma.user.findFirst({ where: { OR: [{ usuario }, { email }] } });
  if (existente) return { error: `El usuario "${usuario}" ya está registrado.` };

  await prisma.user.create({
    data: {
      nombre,
      usuario,
      email,
      iniciales,
      rol: "DOCENTE",
      passwordHash: await bcrypt.hash(contrasena, 10),
      creadoPorId: sesion.user.id,
      // La contraseña es provisional: el docente elegirá la suya al entrar.
      debeCambiarContrasena: true,
    },
  });

  revalidatePath("/admin/docentes");
  return { ok: `Docente "${nombre}" creado.`, entrega: { nombre, usuario, contrasena } };
}

/**
 * Devuelve a un docente una contraseña provisional nueva. Las guardadas están
 * cifradas y no se pueden leer, así que perder la contraseña solo se resuelve
 * emitiendo otra.
 */
export async function restablecerDocente(id: string) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ADMIN") return { error: "No autorizado." };

  const docente = await prisma.user.findUnique({ where: { id } });
  if (!docente || docente.rol !== "DOCENTE") return { error: "El docente no existe." };

  const contrasena = generarContrasenaTemporal();
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await bcrypt.hash(contrasena, 10),
      debeCambiarContrasena: true,
      contrasenaCambiadaEn: null,
    },
  });

  revalidatePath("/admin/docentes");
  return { contrasena };
}
