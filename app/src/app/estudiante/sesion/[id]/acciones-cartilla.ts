"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { actividadDeSesion, evaluar, validarRespuestaCartilla } from "@/lib/actividades-cartilla";
import { prisma } from "@/lib/prisma";

const entradaSchema = z.object({
  sesionId: z.string().min(1),
  actividad: z.string().min(1).max(80),
  respuesta: z.unknown(),
});

/**
 * Guarda lo que el estudiante respondió en una actividad de la cartilla. La
 * actividad tiene que ser de la sesión: se busca entre las que traen sus
 * apartados, nunca por lo que diga el formulario.
 */
export async function guardarActividadCartilla(
  entrada: unknown
): Promise<{ ok?: string; error?: string; correctas?: number; total?: number }> {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ESTUDIANTE") return { error: "Solo los estudiantes responden las actividades." };

  const parsed = entradaSchema.safeParse(entrada);
  if (!parsed.success) return { error: "Los datos no son válidos." };
  const { sesionId } = parsed.data;

  const sesionBd = await prisma.sesion.findUnique({
    where: { id: sesionId },
    select: { codigo: true, titulo: true, publicada: true, subsecciones: { select: { codigo: true, titulo: true } } },
  });
  if (!sesionBd) return { error: "La sesión ya no existe." };
  if (!sesionBd.publicada) return { error: "El docente aún no ha publicado esta sesión." };

  const actividad = actividadDeSesion(parsed.data.actividad, sesionBd, sesionBd.subsecciones);
  if (!actividad) return { error: "Esta sesión no tiene esa actividad." };

  const revision = validarRespuestaCartilla(actividad, parsed.data.respuesta);
  if ("error" in revision) return { error: revision.error };

  await prisma.respuestaCartilla.upsert({
    where: { userId_sesionId_actividad: { userId: sesion.user.id, sesionId, actividad: actividad.id } },
    create: { userId: sesion.user.id, sesionId, actividad: actividad.id, texto: revision.texto, datos: revision.datos },
    update: { texto: revision.texto, datos: revision.datos },
  });

  revalidatePath(`/estudiante/sesion/${sesionId}`);
  const { correctas, total } = evaluar(actividad, revision.datos);
  return {
    // El conteo de aciertos lo muestra la actividad misma, junto a lo que hay que revisar.
    ok: total ? "Guardado. Tu docente puede verlo." : "Tus respuestas quedaron guardadas. Tu docente puede leerlas.",
    ...(total ? { correctas, total } : {}),
  };
}
