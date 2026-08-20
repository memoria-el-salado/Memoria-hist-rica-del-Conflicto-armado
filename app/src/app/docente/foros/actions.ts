"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function exigirDocente() {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "DOCENTE") return null;
  return sesion;
}

const foroSchema = z.object({
  pregunta: z.string().trim().min(1, "Escribe la pregunta del debate."),
  rolA: z.string().trim().min(1, "Define el rol A."),
  rolB: z.string().trim().min(1, "Define el rol B."),
});

export async function crearForo(_prev: unknown, formData: FormData) {
  const sesion = await exigirDocente();
  if (!sesion) return { error: "No autorizado." };

  const parsed = foroSchema.safeParse({
    pregunta: formData.get("pregunta"),
    rolA: formData.get("rolA"),
    rolB: formData.get("rolB"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.foro.create({
    data: { ...parsed.data, autorId: sesion.user.id },
  });

  revalidatePath("/docente/foros");
  return { ok: "Foro abierto." };
}

export async function alternarForo(foroId: string) {
  if (!(await exigirDocente())) return { error: "No autorizado." };

  const actual = await prisma.foro.findUnique({ where: { id: foroId } });
  if (!actual) return { error: "El foro no existe." };

  await prisma.foro.update({
    where: { id: foroId },
    data: { abierto: !actual.abierto },
  });

  revalidatePath("/docente/foros");
  return { ok: true };
}
