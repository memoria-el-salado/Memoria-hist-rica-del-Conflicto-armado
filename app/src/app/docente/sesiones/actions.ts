"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { esGuiada, validarPlanteamiento } from "@/lib/actividades";
import { prisma } from "@/lib/prisma";

/**
 * El docente plantea a sus estudiantes el dilema o la pregunta de
 * investigación de una sesión. Cada docente tiene el suyo: la sesión es común,
 * el planteamiento no.
 */
export async function guardarPlanteamiento(sesionId: string, entrada: unknown): Promise<{ ok?: string; error?: string }> {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "DOCENTE") return { error: "No autorizado." };

  const actividad = await prisma.sesion.findUnique({ where: { id: sesionId }, select: { id: true, pantalla: true } });
  if (!actividad || !esGuiada(actividad.pantalla)) return { error: "Esta sesión no tiene una actividad que se plantee." };

  const revision = validarPlanteamiento(actividad.pantalla, (entrada ?? {}) as { pregunta?: unknown; opciones?: unknown });
  if ("error" in revision) return { error: revision.error };

  await prisma.planteamientoSesion.upsert({
    where: { sesionId_docenteId: { sesionId, docenteId: sesion.user.id } },
    create: { sesionId, docenteId: sesion.user.id, datos: revision.datos },
    update: { datos: revision.datos },
  });

  revalidatePath(`/docente/sesiones/${sesionId}`);
  revalidatePath("/docente/panel");
  revalidatePath(`/estudiante/sesion/${sesionId}`);
  return {
    ok:
      actividad.pantalla === "dilema"
        ? "Dilema planteado. Tus estudiantes ya pueden elegir y justificar."
        : "Pregunta planteada. Tus estudiantes la verán al abrir la sesión.",
  };
}
