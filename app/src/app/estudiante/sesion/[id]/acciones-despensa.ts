"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { limpiarUbicaciones, validarCopla } from "@/lib/copla";
import { prisma } from "@/lib/prisma";

const despensaSchema = z.object({
  sesionId: z.string().min(1),
  ubicaciones: z.unknown(),
  texto: z.string(),
  versos: z.string().default(""),
});

/**
 * Guarda el mapa de la copla y la explicación de «la despensa del Caribe».
 * Se puede rehacer cuantas veces se quiera: se guarda la última versión.
 */
export async function guardarDespensa(entrada: unknown): Promise<{ ok?: string; error?: string }> {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ESTUDIANTE") return { error: "Solo los estudiantes hacen esta actividad." };

  const parsed = despensaSchema.safeParse(entrada);
  if (!parsed.success) return { error: "Los datos no son válidos." };
  const { sesionId, texto, versos } = parsed.data;

  const actividad = await prisma.sesion.findUnique({ where: { id: sesionId }, select: { id: true, publicada: true, pantalla: true } });
  if (!actividad || actividad.pantalla !== "despensa") return { error: "Esta sesión no tiene el mapa de la copla." };
  if (!actividad.publicada) return { error: "El docente aún no ha publicado esta sesión." };

  const ubicaciones = limpiarUbicaciones(parsed.data.ubicaciones);
  const error = validarCopla({ ubicaciones, texto, versos });
  if (error) return { error };

  const datos = { ubicaciones, versos: versos.trim() };
  await prisma.respuestaActividad.upsert({
    where: { userId_sesionId: { userId: sesion.user.id, sesionId } },
    create: { userId: sesion.user.id, sesionId, texto: texto.trim(), datos },
    update: { texto: texto.trim(), datos },
  });

  revalidatePath(`/estudiante/sesion/${sesionId}`);
  revalidatePath("/estudiante/mapa");
  return { ok: "Tu mapa y tu respuesta quedaron guardados. Abajo puedes ver cómo lo ubicó tu curso." };
}
