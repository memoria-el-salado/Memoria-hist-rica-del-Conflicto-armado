"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeBorrarComentario, validarComentario } from "@/lib/cartografia";
import { puedeVerAporte } from "@/lib/visibilidad";

type Resultado = { ok?: string; error?: string };

/** Quien pide, con lo que hace falta para saber qué lugares ve. */
async function quien() {
  const sesion = await auth();
  if (!sesion?.user) return null;
  return prisma.user.findUnique({
    where: { id: sesion.user.id },
    select: { id: true, rol: true, creadoPorId: true, cursoId: true },
  });
}

/** El lugar, si quien pide puede verlo. */
async function lugarVisible(marcaId: string, yo: { id: string; rol: string; creadoPorId: string | null; cursoId: string | null }) {
  const marca = await prisma.marcaCartografia.findUnique({
    where: { id: marcaId },
    select: { id: true, sesionId: true, autor: { select: { id: true, creadoPorId: true, cursoId: true } } },
  });
  if (!marca || !puedeVerAporte(yo, marca.autor)) return null;
  return marca;
}

/** Lo que cambia cuando alguien comenta: la sesión y los foros que parten del lugar. */
async function refrescar(marcaId: string, sesionId: string) {
  revalidatePath(`/estudiante/sesion/${sesionId}`);
  const foros = await prisma.foro.findMany({ where: { marcaId }, select: { id: true } });
  for (const f of foros) {
    revalidatePath(`/estudiante/foros/${f.id}`);
    revalidatePath(`/docente/foros/${f.id}`);
  }
}

/**
 * Comentar un lugar de la cartografía. Puede hacerlo quien ve el lugar: los
 * compañeros del curso del autor y su docente.
 */
export async function comentarMarca(marcaId: string, texto: string): Promise<Resultado> {
  const yo = await quien();
  if (!yo || (yo.rol !== "ESTUDIANTE" && yo.rol !== "DOCENTE")) return { error: "No autorizado." };

  const revision = validarComentario(texto);
  if ("error" in revision) return revision;

  const marca = await lugarVisible(marcaId, yo);
  if (!marca) return { error: "Ese lugar ya no está en la cartografía." };

  await prisma.comentarioMarca.create({ data: { marcaId, autorId: yo.id, texto: revision.texto } });
  await refrescar(marcaId, marca.sesionId);
  return { ok: "Comentario publicado." };
}

/** Borra un comentario: su autor, o el docente que modera el curso. */
export async function borrarComentarioMarca(comentarioId: string): Promise<Resultado> {
  const yo = await quien();
  if (!yo) return { error: "No autorizado." };

  const comentario = await prisma.comentarioMarca.findUnique({
    where: { id: comentarioId },
    select: { autorId: true, marca: { select: { id: true, sesionId: true, autor: { select: { creadoPorId: true } } } } },
  });
  if (!comentario) return { ok: "El comentario ya no estaba." };
  if (!puedeBorrarComentario(yo, comentario, comentario.marca.autor)) return { error: "Solo su autor o el docente pueden borrarlo." };

  await prisma.comentarioMarca.delete({ where: { id: comentarioId } });
  await refrescar(comentario.marca.id, comentario.marca.sesionId);
  return { ok: "Comentario borrado." };
}
