"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { quienSoy } from "@/lib/debate";
import { repartirPosturas, type Postura } from "@/lib/foros";
import { prisma } from "@/lib/prisma";

/** El docente solo gestiona sus propios foros. */
async function miForo(foroId: string) {
  const quien = await quienSoy();
  if (!quien || quien.rol !== "DOCENTE") return null;

  const foro = await prisma.foro.findUnique({ where: { id: foroId } });
  if (!foro || foro.autorId !== quien.id) return null;
  return { quien, foro };
}

function refrescar(foroId?: string) {
  revalidatePath("/docente/foros");
  revalidatePath("/estudiante/foros");
  if (foroId) {
    revalidatePath(`/docente/foros/${foroId}`);
    revalidatePath(`/estudiante/foros/${foroId}`);
  }
}

const foroSchema = z.object({
  pregunta: z.string().trim().min(1, "Escribe la pregunta del debate."),
  rolA: z.string().trim().min(1, "Define el rol A."),
  rolB: z.string().trim().min(1, "Define el rol B."),
  fuentes: z.string().trim().max(400).optional(),
  sesionId: z.string().optional(),
});

export async function crearForo(_prev: unknown, formData: FormData) {
  const quien = await quienSoy();
  if (!quien || quien.rol !== "DOCENTE") return { error: "No autorizado." };

  const parsed = foroSchema.safeParse({
    pregunta: formData.get("pregunta"),
    rolA: formData.get("rolA"),
    rolB: formData.get("rolB"),
    fuentes: formData.get("fuentes") ?? undefined,
    sesionId: formData.get("sesionId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { sesionId, fuentes, ...datos } = parsed.data;
  if (sesionId && !(await prisma.sesion.findUnique({ where: { id: sesionId }, select: { id: true } }))) {
    return { error: "La sesión elegida ya no existe." };
  }

  await prisma.foro.create({
    data: { ...datos, fuentes: fuentes || "Por asignar", sesionId: sesionId ?? null, autorId: quien.id },
  });

  refrescar();
  return { ok: "Foro abierto." };
}

export async function alternarForo(foroId: string) {
  const mio = await miForo(foroId);
  if (!mio) return { error: "No autorizado." };

  await prisma.foro.update({ where: { id: foroId }, data: { abierto: !mio.foro.abierto } });
  refrescar(foroId);
  return { ok: true };
}

/** Marca un argumento como ejemplar, o le quita la marca. */
export async function alternarDestacado(mensajeId: string) {
  const mensaje = await prisma.mensajeForo.findUnique({ where: { id: mensajeId } });
  if (!mensaje || !(await miForo(mensaje.foroId))) return { error: "No autorizado." };

  await prisma.mensajeForo.update({ where: { id: mensajeId }, data: { destacado: !mensaje.destacado } });
  refrescar(mensaje.foroId);
  return { ok: true };
}

/** Retira un mensaje del debate. Si abría un hilo, se van también sus respuestas. */
export async function retirarMensaje(mensajeId: string) {
  const mensaje = await prisma.mensajeForo.findUnique({ where: { id: mensajeId } });
  if (!mensaje || !(await miForo(mensaje.foroId))) return { error: "No autorizado." };

  await prisma.mensajeForo.delete({ where: { id: mensajeId } });
  refrescar(mensaje.foroId);
  return { ok: true };
}

/** Pone a un estudiante en un bando. Solo a los estudiantes propios. */
export async function asignarPostura(foroId: string, userId: string, postura: Postura) {
  const mio = await miForo(foroId);
  if (!mio || (postura !== "A" && postura !== "B")) return { error: "No autorizado." };

  const estudiante = await prisma.user.findUnique({ where: { id: userId }, select: { rol: true, creadoPorId: true } });
  if (estudiante?.rol !== "ESTUDIANTE" || estudiante.creadoPorId !== mio.quien.id) {
    return { error: "Ese estudiante no es tuyo." };
  }

  await prisma.participanteForo.upsert({
    where: { foroId_userId: { foroId, userId } },
    create: { foroId, userId, postura },
    update: { postura },
  });
  refrescar(foroId);
  return { ok: true };
}

/** Da rol a todos los estudiantes que aún no lo tienen, equilibrando los bandos. */
export async function repartirRoles(foroId: string) {
  const mio = await miForo(foroId);
  if (!mio) return { error: "No autorizado." };

  const [estudiantes, participantes] = await Promise.all([
    prisma.user.findMany({
      where: { rol: "ESTUDIANTE", creadoPorId: mio.quien.id },
      orderBy: { nombre: "asc" },
      select: { id: true },
    }),
    prisma.participanteForo.findMany({ where: { foroId } }),
  ]);

  const reparto = repartirPosturas(
    estudiantes.map((e) => e.id),
    new Map(participantes.map((p) => [p.userId, p.postura]))
  );

  await prisma.participanteForo.createMany({
    data: [...reparto].map(([userId, postura]) => ({ foroId, userId, postura })),
    skipDuplicates: true,
  });
  refrescar(foroId);
  const n = reparto.size;
  return { ok: n === 0 ? "Todos tenían rol." : n === 1 ? "1 estudiante recibió rol." : `${n} estudiantes recibieron rol.` };
}
