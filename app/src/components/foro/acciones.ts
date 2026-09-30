"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { quienSoy } from "@/lib/debate";
import { puedeEscribir, validarMensaje } from "@/lib/foros";
import { prisma } from "@/lib/prisma";

const mensajeSchema = z.object({
  texto: z.string(),
  fuente: z.string().nullish(),
  respuestaAId: z.string().nullish(),
});

export type ResultadoForo = { ok?: true; error?: string };

/** Revalida las dos vistas de un debate: la del docente y la de sus estudiantes. */
function refrescar(foroId: string) {
  revalidatePath(`/docente/foros/${foroId}`);
  revalidatePath(`/estudiante/foros/${foroId}`);
  revalidatePath("/docente/foros");
  revalidatePath("/estudiante/foros");
}

/**
 * Publica un argumento o una respuesta. El estudiante escribe desde el bando
 * que tiene asignado; el docente, como mediador, sin bando.
 */
export async function publicarMensaje(foroId: string, entrada: unknown): Promise<ResultadoForo> {
  const quien = await quienSoy();
  if (!quien) return { error: "No autorizado." };

  const parsed = mensajeSchema.safeParse(entrada);
  if (!parsed.success) return { error: "El mensaje no es válido." };
  const { texto, fuente, respuestaAId } = parsed.data;

  const foro = await prisma.foro.findUnique({ where: { id: foroId }, select: { autorId: true, abierto: true } });
  if (!foro || !puedeEscribir(quien, foro)) {
    return { error: foro?.abierto === false ? "El foro está cerrado." : "No puedes escribir en este foro." };
  }

  // Una respuesta tiene que ser a un mensaje de este mismo foro.
  if (respuestaAId) {
    const padre = await prisma.mensajeForo.findUnique({ where: { id: respuestaAId }, select: { foroId: true } });
    if (padre?.foroId !== foroId) return { error: "El mensaje al que respondes ya no está." };
  }

  let postura: "A" | "B" | null = null;
  if (quien.rol === "ESTUDIANTE") {
    const participante = await prisma.participanteForo.findUnique({
      where: { foroId_userId: { foroId, userId: quien.id } },
    });
    if (!participante) return { error: "Vuelve a abrir el foro para recibir tu rol." };
    postura = participante.postura;
  }

  const error = validarMensaje({
    texto,
    fuente,
    esRespuesta: Boolean(respuestaAId),
    esDocente: quien.rol === "DOCENTE",
  });
  if (error) return { error };

  await prisma.mensajeForo.create({
    data: {
      foroId,
      autorId: quien.id,
      texto: texto.trim(),
      fuente: fuente?.trim() || null,
      postura,
      respuestaAId: respuestaAId ?? null,
    },
  });

  refrescar(foroId);
  return { ok: true };
}
