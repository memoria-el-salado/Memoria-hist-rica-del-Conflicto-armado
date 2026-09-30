"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revisarPesos } from "@/lib/progreso";
import { validarTextoAlerta } from "@/lib/cuidado";

async function exigirDocente() {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "DOCENTE") return null;
  return sesion;
}

export async function alternarPublicacion(sesionId: string) {
  if (!(await exigirDocente())) return { error: "No autorizado." };

  const actual = await prisma.sesion.findUnique({ where: { id: sesionId } });
  if (!actual) return { error: "La sesión no existe." };

  // Al publicar se anota la fecha: con ella se avisa a los estudiantes.
  await prisma.sesion.update({
    where: { id: sesionId },
    data: actual.publicada ? { publicada: false } : { publicada: true, publicadaEn: new Date() },
  });

  revalidatePath("/docente/panel");
  revalidatePath("/estudiante", "layout");
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

const alertaSchema = z.object({
  sesionId: z.string().min(1, "Elige la sesión que llevará la alerta."),
  texto: z.string(),
});

function refrescarAlerta(sesionId: string) {
  revalidatePath("/docente/panel");
  revalidatePath(`/estudiante/sesion/${sesionId}`);
}

/**
 * Activa la alerta de cuidado de una sesión, o cambia su texto si ya estaba
 * activa. El estudiante lee ese texto antes del contenido y desde ahí puede
 * seguir, dejarlo para después o pedir acompañamiento.
 */
export async function activarAlerta(_prev: unknown, formData: FormData) {
  if (!(await exigirDocente())) return { error: "No autorizado." };

  const parsed = alertaSchema.safeParse({ sesionId: formData.get("sesionId"), texto: formData.get("texto") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const error = validarTextoAlerta(parsed.data.texto);
  if (error) return { error };

  const sesion = await prisma.sesion.findFirst({
    where: { id: parsed.data.sesionId, eje: { caso: { activo: true } } },
    select: { id: true, codigo: true },
  });
  if (!sesion) return { error: "La sesión no pertenece al módulo activo." };

  await prisma.sesion.update({
    where: { id: sesion.id },
    data: { alertaCuidado: true, textoAlerta: parsed.data.texto.trim() },
  });

  refrescarAlerta(sesion.id);
  return {
    ok: `Alerta activa en la sesión ${sesion.codigo}. Antes del contenido, tus estudiantes leerán el aviso y podrán pedirte acompañamiento.`,
  };
}

/** Quita la alerta. El texto se conserva por si se vuelve a activar. */
export async function quitarAlerta(sesionId: string) {
  if (!(await exigirDocente())) return { error: "No autorizado." };

  const sesion = await prisma.sesion.findUnique({ where: { id: sesionId }, select: { id: true } });
  if (!sesion) return { error: "La sesión no existe." };

  await prisma.sesion.update({ where: { id: sesion.id }, data: { alertaCuidado: false } });
  refrescarAlerta(sesion.id);
  return { ok: true };
}

/** Solo el docente a quien se dirigió el pedido puede darlo por atendido. */
export async function marcarAtendida(solicitudId: string) {
  const sesion = await exigirDocente();
  if (!sesion) return { error: "No autorizado." };

  const solicitud = await prisma.solicitudAcompanamiento.findUnique({
    where: { id: solicitudId },
    select: { docenteId: true, atendidaEn: true },
  });
  if (!solicitud || solicitud.docenteId !== sesion.user.id) return { error: "Esa solicitud no es tuya." };

  if (!solicitud.atendidaEn) {
    await prisma.solicitudAcompanamiento.update({ where: { id: solicitudId }, data: { atendidaEn: new Date() } });
  }
  revalidatePath("/docente", "layout");
  return { ok: true };
}
