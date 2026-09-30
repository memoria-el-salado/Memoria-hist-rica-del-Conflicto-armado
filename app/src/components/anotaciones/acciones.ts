"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { validarAnotacion } from "@/lib/anotaciones";
import { prisma } from "@/lib/prisma";
import { puedeVerAnotacion } from "@/lib/visibilidad";

type Resultado = { ok?: string; error?: string };

/** Quien actúa, con lo que hace falta para decidir qué puede ver. */
async function quien() {
  const sesion = await auth();
  if (!sesion?.user) return null;
  return prisma.user.findUnique({ where: { id: sesion.user.id }, select: { id: true, rol: true, creadoPorId: true, cursoId: true } });
}

/** Una anotación que quien actúa puede ver: el docente, las de sus estudiantes. */
async function anotacionVisible(anotacionId: string, yo: NonNullable<Awaited<ReturnType<typeof quien>>>) {
  const a = await prisma.anotacion.findUnique({
    where: { id: anotacionId },
    include: { autor: { select: { id: true, creadoPorId: true, cursoId: true } } },
  });
  if (!a) return null;
  const visible = yo.rol === "DOCENTE" ? a.autorId === yo.id || a.autor.creadoPorId === yo.id : puedeVerAnotacion(yo, a.autor);
  return visible ? a : null;
}

function refrescar(sesionId: string) {
  revalidatePath(`/estudiante/sesion/${sesionId}`);
  revalidatePath(`/docente/sesiones/${sesionId}`);
  revalidatePath("/estudiante/mapa");
}

const publicacionSchema = z.object({
  sesionId: z.string().min(1),
  texto: z.string(),
  cita: z.string().max(4000).nullish(),
  respuestaAId: z.string().nullish(),
});

/** Una anotación nueva sobre el texto, o una respuesta en el hilo de otra. */
export async function publicarEnHilo(entrada: unknown): Promise<Resultado> {
  const yo = await quien();
  if (!yo || yo.rol === "ADMIN") return { error: "No autorizado." };
  const parsed = publicacionSchema.safeParse(entrada);
  if (!parsed.success) return { error: "La anotación no es válida." };
  const { sesionId, texto, cita, respuestaAId } = parsed.data;

  const error = validarAnotacion(texto);
  if (error) return { error };

  const sesion = await prisma.sesion.findUnique({ where: { id: sesionId }, select: { publicada: true } });
  if (!sesion || (yo.rol === "ESTUDIANTE" && !sesion.publicada)) return { error: "La sesión no está disponible." };

  if (respuestaAId) {
    const padre = await anotacionVisible(respuestaAId, yo);
    if (!padre || padre.sesionId !== sesionId) return { error: "No puedes responder a esa anotación." };
  }

  await prisma.anotacion.create({
    data: { autorId: yo.id, sesionId, texto: texto.trim(), cita: respuestaAId ? null : cita?.trim() || null, respuestaAId: respuestaAId ?? null },
  });
  refrescar(sesionId);
  return { ok: respuestaAId ? "Respuesta publicada." : "Anotación publicada." };
}

/** «Me sirve», o quitarlo. Uno por persona; la propia no cuenta. */
export async function alternarMeSirve(anotacionId: string): Promise<Resultado> {
  const yo = await quien();
  if (!yo) return { error: "No autorizado." };
  const a = await anotacionVisible(anotacionId, yo);
  if (!a) return { error: "Esa anotación no existe." };
  if (a.autorId === yo.id) return { error: "No puedes marcar tu propia anotación." };

  const clave = { anotacionId_userId: { anotacionId, userId: yo.id } };
  if (await prisma.meSirve.findUnique({ where: clave })) await prisma.meSirve.delete({ where: clave });
  else await prisma.meSirve.create({ data: { anotacionId, userId: yo.id } });
  refrescar(a.sesionId);
  return { ok: "Listo." };
}

/** El docente destaca (o deja de destacar) una anotación de sus estudiantes. */
export async function alternarDestacada(anotacionId: string): Promise<Resultado> {
  const yo = await quien();
  if (!yo || yo.rol !== "DOCENTE") return { error: "Solo el docente destaca anotaciones." };
  const a = await anotacionVisible(anotacionId, yo);
  if (!a) return { error: "Esa anotación no es de tus estudiantes." };

  await prisma.anotacion.update({ where: { id: anotacionId }, data: { destacada: !a.destacada } });
  refrescar(a.sesionId);
  return { ok: a.destacada ? "Ya no está destacada." : "Anotación destacada." };
}
