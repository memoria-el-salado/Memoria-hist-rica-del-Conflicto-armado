"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LIMITES_COMENTARIO } from "@/lib/revision";

const comentarioSchema = z.object({
  clase: z.enum(["RESPUESTA", "SIMULACION", "DIARIO"]),
  id: z.string().min(1),
  texto: z.string(),
});

/** El estudiante dueño del trabajo, su sesión y si el docente puede comentarlo. */
async function trabajo(clase: "RESPUESTA" | "SIMULACION" | "DIARIO", id: string) {
  const alumno = { select: { id: true, creadoPorId: true } };
  if (clase === "RESPUESTA") {
    const r = await prisma.respuestaActividad.findUnique({ where: { id }, include: { user: alumno } });
    return r && { estudiante: r.user, sesionId: r.sesionId, enlace: { respuestaId: r.id }, comentable: true };
  }
  if (clase === "SIMULACION") {
    const s = await prisma.simulacion.findUnique({ where: { id }, include: { user: alumno } });
    return s && { estudiante: s.user, sesionId: s.sesionId, enlace: { simulacionId: s.id }, comentable: Boolean(s.validadaEn) };
  }
  const e = await prisma.entradaDiario.findUnique({ where: { id }, include: { autor: alumno } });
  // Una entrada privada no existe para el docente.
  return e && { estudiante: e.autor, sesionId: e.sesionId, enlace: { entradaId: e.id }, comentable: !e.privada };
}

/**
 * El docente comenta un trabajo de uno de sus estudiantes. El comentario le
 * llega al estudiante donde está el trabajo y en su campana.
 */
export async function comentarTrabajo(entrada: unknown): Promise<{ ok?: string; error?: string }> {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "DOCENTE") return { error: "No autorizado." };

  const parsed = comentarioSchema.safeParse(entrada);
  if (!parsed.success) return { error: "El comentario no es válido." };
  const texto = parsed.data.texto.trim();
  if (texto.length < LIMITES_COMENTARIO.minimo) return { error: "Escribe tu comentario." };
  if (texto.length > LIMITES_COMENTARIO.maximo) return { error: `El comentario no puede pasar de ${LIMITES_COMENTARIO.maximo} caracteres.` };

  const t = await trabajo(parsed.data.clase, parsed.data.id);
  if (!t || !t.comentable || t.estudiante.creadoPorId !== sesion.user.id) return { error: "Ese trabajo no es de un estudiante tuyo." };

  await prisma.comentario.create({
    data: { texto, docenteId: sesion.user.id, estudianteId: t.estudiante.id, sesionId: t.sesionId, ...t.enlace },
  });

  revalidatePath("/docente", "layout");
  revalidatePath("/estudiante", "layout");
  return { ok: "Comentario enviado." };
}
