"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { estadoAccesibilidad } from "@/lib/transcripcion";

async function exigirAdmin() {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ADMIN") return null;
  return sesion;
}

/**
 * Recalcula el estado de cada recurso a partir de sus datos y lo guarda.
 *
 * Antes había un botón que marcaba como cumplidos la transcripción, el
 * contraste y el diseño adaptable sin comprobar nada. Un hallazgo solo se cierra
 * cuando quien cargó el recurso añade lo que falta; aquí se constata.
 */
export async function ejecutarAuditoria() {
  if (!(await exigirAdmin())) return { error: "No autorizado." };

  const recursos = await prisma.recurso.findMany();
  const ahora = new Date();
  for (const r of recursos) {
    const { alternativa } = estadoAccesibilidad(r);
    await prisma.auditoriaAccesibilidad.upsert({
      where: { recursoId: r.id },
      create: { recursoId: r.id, descripcion: r.tipo, transcripcion: alternativa, revisadaEn: ahora },
      update: { transcripcion: alternativa, revisadaEn: ahora },
    });
  }

  revalidatePath("/admin/accesibilidad");
  return { ok: true };
}
