"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { eliminarArchivo, firmarSubida, guardarArchivo, infoArchivo, rutaValida } from "@/lib/almacen";
import {
  duracion,
  extensionDe,
  LIMITES_MARCA,
  mimeBase,
  tipoDeAdjuntoCoincide,
  validarAdjunto,
  validarMarca,
  type ClaseAdjunto,
} from "@/lib/cartografia";
import { prisma } from "@/lib/prisma";

/**
 * Cartografía social: el lugar, su relato escrito o grabado, una foto y, si el
 * grupo lo eligió junto, el grupo. El audio y la foto van del navegador al
 * depósito privado con una dirección firmada, como los recursos del docente.
 */

const PREFIJO = "cartografia/";

/** El estudiante que marca y la sesión de cartografía, publicada, en la que lo hace. */
async function contexto(sesionId: string) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ESTUDIANTE") return { error: "Solo los estudiantes marcan lugares." as const };

  const [estudiante, actividad] = await Promise.all([
    prisma.user.findUnique({ where: { id: sesion.user.id }, select: { id: true, grupoId: true } }),
    prisma.sesion.findUnique({ where: { id: sesionId }, select: { id: true, publicada: true, pantalla: true } }),
  ]);
  if (!estudiante) return { error: "Necesitas iniciar sesión." as const };
  if (!actividad || actividad.pantalla !== "cartografia") return { error: "Esta sesión no tiene cartografía." as const };
  if (!actividad.publicada) return { error: "El docente aún no ha publicado esta sesión." as const };
  return { estudiante, sesionId: actividad.id };
}

const esRutaDeMarca = (ruta: string) => rutaValida(ruta) && ruta.startsWith(PREFIJO);

function refrescar(sesionId: string) {
  revalidatePath(`/estudiante/sesion/${sesionId}`);
  revalidatePath("/estudiante/mapa");
}

export type SubidaAdjunto = { error?: string; ruta?: string; url?: string | null; mime?: string };

/**
 * Firma la subida de la grabación o de la foto. En un equipo local, sin
 * depósito, la dirección es `null` y el archivo va por `subirAdjuntoLocal`.
 */
export async function prepararAdjunto(
  sesionId: string,
  clase: ClaseAdjunto,
  archivo: { mime: string; tamano: number }
): Promise<SubidaAdjunto> {
  const ctx = await contexto(sesionId);
  if ("error" in ctx) return { error: ctx.error };
  if (clase !== "audio" && clase !== "foto") return { error: "Adjunto no válido." };

  const error = validarAdjunto(clase, archivo);
  if (error) return { error };

  const ruta = `${PREFIJO}${randomUUID()}.${extensionDe(clase, archivo.mime)}`;
  try {
    return { ruta, mime: mimeBase(archivo.mime), url: await firmarSubida(ruta) };
  } catch {
    return { error: "No se pudo preparar la subida. Inténtalo de nuevo en unos segundos." };
  }
}

/** En un equipo local el archivo pasa por el servidor. */
export async function subirAdjuntoLocal(sesionId: string, ruta: string, formData: FormData) {
  const ctx = await contexto(sesionId);
  if ("error" in ctx) return { error: ctx.error };
  const archivo = formData.get("archivo");
  if (!esRutaDeMarca(ruta) || !(archivo instanceof Blob)) return { error: "La subida no es válida." };
  await guardarArchivo(ruta, new Uint8Array(await archivo.arrayBuffer()), mimeBase(archivo.type));
  return { ok: true };
}

/** Borra un adjunto que se subió pero no llegó a quedar en ninguna marca. */
export async function descartarAdjunto(ruta: string) {
  const sesion = await auth();
  if (!sesion?.user || !esRutaDeMarca(ruta)) return { error: "No autorizado." };
  const enUso = await prisma.marcaCartografia.findFirst({ where: { OR: [{ audioArchivo: ruta }, { foto: ruta }] } });
  if (enUso) return { error: "Ese archivo está en uso." };
  await eliminarArchivo(ruta);
  return { ok: true };
}

/**
 * Comprueba en el depósito que el adjunto llegó y es lo que dice ser: la firma
 * autoriza a escribir, no garantiza qué se escribió.
 */
async function revisarAdjunto(clase: ClaseAdjunto, ruta: string): Promise<{ mime: string } | { error: string }> {
  if (!esRutaDeMarca(ruta)) return { error: "La subida no es válida. Vuelve a adjuntar el archivo." };
  const usado = await prisma.marcaCartografia.findFirst({ where: { OR: [{ audioArchivo: ruta }, { foto: ruta }] } });
  if (usado) return { error: "Ese archivo ya está en otra marca." };

  const info = await infoArchivo(ruta);
  if (!info) return { error: clase === "audio" ? "La grabación no llegó. Vuelve a intentarlo." : "La foto no llegó. Vuelve a intentarlo." };
  const maximo = clase === "audio" ? LIMITES_MARCA.audioBytes : LIMITES_MARCA.fotoBytes;
  if (info.tamano > maximo || (info.tipo && !tipoDeAdjuntoCoincide(clase, info.tipo))) {
    await eliminarArchivo(ruta);
    return { error: clase === "audio" ? "La grabación no es válida." : "La foto no es válida." };
  }
  return { mime: mimeBase(info.tipo || "") };
}

const marcaSchema = z.object({
  sesionId: z.string().min(1),
  lugar: z.string(),
  relato: z.string(),
  tags: z.array(z.string().max(40)).max(12),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  audio: z.object({ ruta: z.string(), segundos: z.number().min(0).max(LIMITES_MARCA.audioSegundos + 5) }).nullish(),
  foto: z.object({ ruta: z.string() }).nullish(),
  deGrupo: z.boolean().default(false),
});

export async function guardarMarca(entrada: unknown): Promise<{ ok?: string; error?: string }> {
  const parsed = marcaSchema.safeParse(entrada);
  if (!parsed.success) return { error: "Los datos del lugar no son válidos." };
  const { sesionId, lugar, relato, tags, lat, lon, audio, foto, deGrupo } = parsed.data;

  const ctx = await contexto(sesionId);
  if ("error" in ctx) return { error: ctx.error };

  const error = validarMarca({ lugar, relato, conAudio: Boolean(audio) });
  if (error) return { error };
  if (deGrupo && !ctx.estudiante.grupoId) return { error: "No estás en ningún grupo de trabajo." };

  const audioRevisado = audio ? await revisarAdjunto("audio", audio.ruta) : null;
  if (audioRevisado && "error" in audioRevisado) return { error: audioRevisado.error };
  const fotoRevisada = foto ? await revisarAdjunto("foto", foto.ruta) : null;
  if (fotoRevisada && "error" in fotoRevisada) return { error: fotoRevisada.error };

  const segundos = audio ? Math.round(audio.segundos) : null;
  await prisma.marcaCartografia.create({
    data: {
      autorId: ctx.estudiante.id,
      sesionId: ctx.sesionId,
      lugar: lugar.trim(),
      relato: relato.trim(),
      // La v1 publicada solo sabe leer este texto.
      audio: segundos !== null ? `${duracion(segundos)} grabado` : "Sin audio",
      audioArchivo: audio?.ruta ?? null,
      audioMime: audioRevisado && "mime" in audioRevisado ? audioRevisado.mime || null : null,
      audioSegundos: segundos,
      foto: foto?.ruta ?? null,
      grupoId: deGrupo ? ctx.estudiante.grupoId : null,
      tags,
      lat,
      lon,
    },
  });

  refrescar(ctx.sesionId);
  return { ok: deGrupo ? "Lugar sembrado en nombre de tu grupo." : "Lugar sembrado en la cartografía colectiva." };
}

/** Quien sembró un lugar lo puede retirar, con su grabación y su foto. */
export async function retirarMarca(marcaId: string): Promise<{ ok?: string; error?: string }> {
  const sesion = await auth();
  if (!sesion?.user) return { error: "No autorizado." };
  const marca = await prisma.marcaCartografia.findUnique({ where: { id: marcaId } });
  if (!marca || marca.autorId !== sesion.user.id) return { error: "Solo quien sembró el lugar puede retirarlo." };

  await prisma.marcaCartografia.delete({ where: { id: marcaId } });
  for (const ruta of [marca.audioArchivo, marca.foto]) if (ruta) await eliminarArchivo(ruta).catch(() => {});

  refrescar(marca.sesionId);
  return { ok: "Lugar retirado." };
}
