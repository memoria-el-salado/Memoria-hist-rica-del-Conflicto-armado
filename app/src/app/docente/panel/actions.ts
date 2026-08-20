"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function exigirDocente() {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "DOCENTE") return null;
  return sesion;
}

export async function alternarPublicacion(sesionId: string) {
  if (!(await exigirDocente())) return { error: "No autorizado." };

  const actual = await prisma.sesion.findUnique({ where: { id: sesionId } });
  if (!actual) return { error: "La sesión no existe." };

  await prisma.sesion.update({
    where: { id: sesionId },
    data: { publicada: !actual.publicada },
  });

  revalidatePath("/docente/panel");
  revalidatePath("/estudiante/mapa");
  revalidatePath(`/estudiante/sesion/${sesionId}`);
  return { ok: true };
}

const protocoloSchema = z.object({
  sesionId: z.string().min(1, "Elige una sesión para aplicar el protocolo."),
});

export async function activarProtocolo(_prev: unknown, formData: FormData) {
  if (!(await exigirDocente())) return { error: "No autorizado." };

  const parsed = protocoloSchema.safeParse({ sesionId: formData.get("sesionId") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const sesion = await prisma.sesion.findUnique({ where: { id: parsed.data.sesionId } });
  if (!sesion) return { error: "La sesión no existe." };

  await prisma.sesion.update({
    where: { id: sesion.id },
    data: { alertaCuidado: true },
  });

  revalidatePath("/docente/panel");
  revalidatePath(`/estudiante/sesion/${sesion.id}`);
  return {
    ok: "Protocolo activado: la sesión mostrará una advertencia previa y habilitará la ruta de acompañamiento.",
  };
}
