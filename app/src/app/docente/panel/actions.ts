"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revisarPesos } from "@/lib/progreso";

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

const pesosSchema = z.object({
  pesos: z.array(z.object({ ejeId: z.string().min(1), peso: z.number().int().min(0).max(100) })),
});

/**
 * Reparto de los 100 puntos del curso entre los ejes.
 *
 * Dentro de cada eje, sus sesiones publicadas se reparten ese peso a partes
 * iguales, así que el docente no tiene que repesar nada al publicar una sesión
 * nueva.
 */
export async function guardarPesos(entrada: unknown) {
  if (!(await exigirDocente())) return { error: "No autorizado." };

  const parsed = pesosSchema.safeParse(entrada);
  if (!parsed.success) return { error: "El reparto enviado no es válido." };

  const revision = revisarPesos(parsed.data.pesos.map((p) => p.peso));
  if (!revision.valida) return { error: revision.mensaje };

  const ejes = await prisma.eje.findMany({
    where: { id: { in: parsed.data.pesos.map((p) => p.ejeId) }, caso: { activo: true } },
    select: { id: true },
  });
  const validos = new Set(ejes.map((e) => e.id));
  if (validos.size !== parsed.data.pesos.length) {
    return { error: "Alguno de los ejes ya no pertenece al módulo activo." };
  }

  await prisma.$transaction(
    parsed.data.pesos.map((p) =>
      prisma.eje.update({ where: { id: p.ejeId }, data: { peso: p.peso } })
    )
  );

  revalidatePath("/docente/panel");
  revalidatePath("/docente/estudiantes");
  revalidatePath("/docente/subpoblaciones");
  revalidatePath("/estudiante/mapa");

  return { ok: "Reparto guardado. El avance del curso ya se calcula con estos pesos." };
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
