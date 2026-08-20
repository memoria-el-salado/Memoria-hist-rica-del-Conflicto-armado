"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function exigirAdmin() {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ADMIN") return null;
  return sesion;
}

export async function corregirHallazgo(auditoriaId: string) {
  if (!(await exigirAdmin())) return { error: "No autorizado." };

  await prisma.auditoriaAccesibilidad.update({
    where: { id: auditoriaId },
    data: { transcripcion: true, contraste: true, responsivo: true, revisadaEn: new Date() },
  });

  revalidatePath("/admin/accesibilidad");
  return { ok: true };
}

export async function ejecutarAuditoria() {
  if (!(await exigirAdmin())) return { error: "No autorizado." };

  await prisma.auditoriaAccesibilidad.updateMany({ data: { revisadaEn: new Date() } });

  revalidatePath("/admin/accesibilidad");
  return { ok: true };
}
