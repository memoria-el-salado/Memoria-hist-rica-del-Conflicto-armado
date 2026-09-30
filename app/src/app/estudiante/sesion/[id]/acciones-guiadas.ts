"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { esGuiada, leerDilema, validarRespuestaGuiada } from "@/lib/actividades";
import { prisma } from "@/lib/prisma";

const guiadaSchema = z.object({
  sesionId: z.string().min(1),
  texto: z.string(),
  datos: z.unknown().optional(),
});

const EXITO: Record<string, string> = {
  meubico: "Tu reflexión quedó guardada. Solo tu docente la lee.",
  dilema: "Tu elección quedó guardada. Abajo puedes ver cómo eligió tu curso.",
  investigar: "Tu investigación quedó guardada.",
  testimonios: "Lo que escribiste quedó guardado.",
  compromiso: "Tu compromiso quedó guardado.",
};

/**
 * Guarda la respuesta a Me ubico, Dilema, A investigar, Testimonios o
 * Compromiso. En el dilema, las opciones válidas son las que planteó el
 * docente de quien responde.
 */
export async function guardarGuiada(entrada: unknown): Promise<{ ok?: string; error?: string }> {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ESTUDIANTE") return { error: "Solo los estudiantes responden las actividades." };

  const parsed = guiadaSchema.safeParse(entrada);
  if (!parsed.success) return { error: "Los datos no son válidos." };
  const { sesionId, texto } = parsed.data;

  const [actividad, yo] = await Promise.all([
    prisma.sesion.findUnique({ where: { id: sesionId }, select: { id: true, publicada: true, pantalla: true } }),
    prisma.user.findUnique({ where: { id: sesion.user.id }, select: { creadoPorId: true } }),
  ]);
  if (!actividad || !esGuiada(actividad.pantalla)) return { error: "Esta sesión no tiene esa actividad." };
  if (!actividad.publicada) return { error: "El docente aún no ha publicado esta sesión." };

  const planteamiento =
    actividad.pantalla === "dilema" && yo?.creadoPorId
      ? await prisma.planteamientoSesion.findUnique({ where: { sesionId_docenteId: { sesionId, docenteId: yo.creadoPorId } } })
      : null;

  const revision = validarRespuestaGuiada(actividad.pantalla, { texto, datos: parsed.data.datos }, leerDilema(planteamiento?.datos));
  if ("error" in revision) return { error: revision.error };

  await prisma.respuestaActividad.upsert({
    where: { userId_sesionId: { userId: sesion.user.id, sesionId } },
    create: { userId: sesion.user.id, sesionId, texto: texto.trim(), datos: revision.datos },
    update: { texto: texto.trim(), datos: revision.datos },
  });

  revalidatePath(`/estudiante/sesion/${sesionId}`);
  revalidatePath("/estudiante/mapa");
  return { ok: EXITO[actividad.pantalla] };
}
