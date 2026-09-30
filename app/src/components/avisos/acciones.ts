"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Abrir la campana deja vistas las novedades: lo publicado antes de ahora ya no es nuevo. */
export async function marcarAvisosVistos() {
  const sesion = await auth();
  if (!sesion?.user) return;
  await prisma.user.update({ where: { id: sesion.user.id }, data: { avisosVistosEn: new Date() } });
  revalidatePath(sesion.user.rol === "DOCENTE" ? "/docente" : "/estudiante", "layout");
}

/** El estudiante vio los comentarios de su docente donde está el trabajo comentado. */
export async function marcarComentariosLeidos(ids: string[]) {
  const sesion = await auth();
  if (!sesion?.user || !Array.isArray(ids) || !ids.length) return;
  // Solo los propios: un identificador ajeno no marca nada.
  await prisma.comentario.updateMany({
    where: { id: { in: ids.slice(0, 100) }, estudianteId: sesion.user.id, leidoEn: null },
    data: { leidoEn: new Date() },
  });
  revalidatePath("/estudiante", "layout");
}
