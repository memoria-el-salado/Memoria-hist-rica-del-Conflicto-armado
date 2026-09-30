"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { esRepeticion, limpiarMensaje, MINUTOS_REPETICION, unirMensajes } from "@/lib/cuidado";
import { prisma } from "@/lib/prisma";

const solicitudSchema = z.object({
  sesionId: z.string().nullish(),
  mensaje: z.string().nullish(),
});

export type ResultadoSolicitud = { ok?: string; error?: string };

/**
 * El estudiante pide hablar con su docente. Le llega solo a quien creó su
 * cuenta, que es quien lo acompaña en el curso.
 *
 * Si ya hay un pedido suyo esperando desde el mismo sitio, no se duplica: lo
 * que escriba de nuevo se suma a ese pedido.
 */
export async function pedirAcompanamiento(entrada: unknown): Promise<ResultadoSolicitud> {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ESTUDIANTE") return { error: "Solo los estudiantes pueden pedir acompañamiento." };

  const parsed = solicitudSchema.safeParse(entrada);
  if (!parsed.success) return { error: "La solicitud no es válida." };

  const { mensaje, error } = limpiarMensaje(parsed.data.mensaje);
  if (error) return { error };

  const estudiante = await prisma.user.findUnique({
    where: { id: sesion.user.id },
    select: { id: true, creadoPor: { select: { id: true, nombre: true } } },
  });
  const docente = estudiante?.creadoPor;
  if (!estudiante || !docente) {
    return { error: "Tu cuenta no tiene un docente asignado. Busca a un adulto de confianza en el colegio." };
  }

  // Una dirección de sesión que no existe no debe impedir que el pedido llegue.
  const sesionId = parsed.data.sesionId
    ? ((await prisma.sesion.findUnique({ where: { id: parsed.data.sesionId }, select: { id: true } }))?.id ?? null)
    : null;

  const ahora = new Date();
  const pendientes = await prisma.solicitudAcompanamiento.findMany({
    where: {
      estudianteId: estudiante.id,
      atendidaEn: null,
      creadoEn: { gte: new Date(ahora.getTime() - MINUTOS_REPETICION * 60_000) },
    },
    orderBy: { creadoEn: "desc" },
  });

  const aviso = `${docente.nombre} recibió tu solicitud y te buscará. Mientras tanto, puedes pausar cuanto necesites.`;

  if (esRepeticion({ sesionId, creadoEn: ahora }, pendientes)) {
    const previa = pendientes.find((p) => p.sesionId === sesionId)!;
    const unido = unirMensajes(previa.mensaje, mensaje);
    if (unido !== previa.mensaje) {
      await prisma.solicitudAcompanamiento.update({ where: { id: previa.id }, data: { mensaje: unido } });
      revalidatePath("/docente/panel");
    }
    return { ok: aviso };
  }

  await prisma.solicitudAcompanamiento.create({
    data: { estudianteId: estudiante.id, docenteId: docente.id, sesionId, mensaje },
  });

  revalidatePath("/docente", "layout");
  return { ok: aviso };
}
