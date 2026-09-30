"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { eliminarArchivo, firmarSubida, guardarArchivo, infoArchivo, rutaValida } from "@/lib/almacen";
import { CREACIONES, esImagen, extensionImagen, LIMITES_FLOR, validarFlor, validarImagenFlor, type Creacion } from "@/lib/jardin";
import { prisma } from "@/lib/prisma";

/**
 * Jardín de la Memoria: sembrar una flor con su creación. El dibujo o la foto
 * van del navegador al depósito privado con una dirección firmada, como en la
 * cartografía. No hay moderación: la flor se ve en cuanto se siembra.
 */

const PREFIJO = "jardin/";
const TONOS = ["#1B8A8A", "#EBB035", "#D95D39", "#177575"];

async function contexto(sesionId: string) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ESTUDIANTE") return { error: "Solo los estudiantes siembran en el jardín." as const };
  const actividad = await prisma.sesion.findUnique({ where: { id: sesionId }, select: { id: true, publicada: true, pantalla: true } });
  if (!actividad || actividad.pantalla !== "jardin") return { error: "Esta sesión no tiene jardín." as const };
  if (!actividad.publicada) return { error: "El docente aún no ha publicado esta sesión." as const };
  return { userId: sesion.user.id, sesionId: actividad.id };
}

const esRutaDeFlor = (ruta: string) => rutaValida(ruta) && ruta.startsWith(PREFIJO);

function refrescar(sesionId: string) {
  revalidatePath(`/estudiante/sesion/${sesionId}`);
  revalidatePath("/estudiante/mapa");
}

export async function prepararImagenFlor(
  sesionId: string,
  creacion: Creacion,
  archivo: { mime: string; tamano: number }
): Promise<{ error?: string; ruta?: string; url?: string | null; mime?: string }> {
  const ctx = await contexto(sesionId);
  if ("error" in ctx) return { error: ctx.error };
  if (!CREACIONES.includes(creacion)) return { error: "Creación no válida." };
  const error = validarImagenFlor(creacion, archivo);
  if (error) return { error };

  const ruta = `${PREFIJO}${randomUUID()}.${extensionImagen(archivo.mime)}`;
  try {
    return { ruta, mime: archivo.mime.split(";")[0].trim().toLowerCase(), url: await firmarSubida(ruta) };
  } catch {
    return { error: "No se pudo preparar la subida. Inténtalo de nuevo en unos segundos." };
  }
}

/** En un equipo local, sin depósito, la imagen pasa por el servidor. */
export async function subirImagenFlorLocal(sesionId: string, ruta: string, formData: FormData) {
  const ctx = await contexto(sesionId);
  if ("error" in ctx) return { error: ctx.error };
  const archivo = formData.get("archivo");
  if (!esRutaDeFlor(ruta) || !(archivo instanceof Blob)) return { error: "La subida no es válida." };
  await guardarArchivo(ruta, new Uint8Array(await archivo.arrayBuffer()), archivo.type);
  return { ok: true };
}

/** Borra una imagen que se subió pero no llegó a quedar en ninguna flor. */
export async function descartarImagenFlor(ruta: string) {
  const sesion = await auth();
  if (!sesion?.user || !esRutaDeFlor(ruta)) return { error: "No autorizado." };
  if (await prisma.florJardin.findFirst({ where: { imagen: ruta } })) return { error: "Esa imagen está en uso." };
  await eliminarArchivo(ruta);
  return { ok: true };
}

const florSchema = z.object({
  sesionId: z.string().min(1),
  nombre: z.string(),
  legado: z.string(),
  epoca: z.enum(["ANTES_1997", "ENTRE_1997_2000", "RETORNO"]),
  pieza: z.enum(["FLOR", "HOJA", "SEMILLA", "MANO"]),
  creacion: z.enum(CREACIONES),
  texto: z.string().nullish(),
  descripcion: z.string().nullish(),
  imagen: z.object({ ruta: z.string() }).nullish(),
});

export async function sembrarMemoria(entrada: unknown): Promise<{ ok?: string; error?: string }> {
  const parsed = florSchema.safeParse(entrada);
  if (!parsed.success) return { error: "Los datos de la flor no son válidos." };
  const { sesionId, nombre, legado, epoca, pieza, creacion, texto, descripcion, imagen } = parsed.data;

  const ctx = await contexto(sesionId);
  if ("error" in ctx) return { error: ctx.error };

  const error = validarFlor({ nombre, legado, creacion, texto, descripcion, conImagen: Boolean(imagen) });
  if (error) return { error };

  if (imagen) {
    if (!esRutaDeFlor(imagen.ruta)) return { error: "La subida no es válida. Vuelve a añadir la imagen." };
    if (await prisma.florJardin.findFirst({ where: { imagen: imagen.ruta } })) return { error: "Esa imagen ya está en otra flor." };
    // La firma autoriza a escribir; se comprueba qué llegó.
    const info = await infoArchivo(imagen.ruta);
    if (!info) return { error: "La imagen no llegó. Vuelve a intentarlo." };
    if (validarImagenFlor(creacion, { mime: info.tipo || "", tamano: info.tamano })) {
      await eliminarArchivo(imagen.ruta);
      return { error: "La imagen no es válida." };
    }
  }

  const total = await prisma.florJardin.count({ where: { sesionId: ctx.sesionId } });
  await prisma.florJardin.create({
    data: {
      nombre: nombre.trim(),
      legado: legado.trim(),
      epoca,
      pieza,
      creacion,
      texto: texto?.trim() || null,
      imagen: esImagen(creacion) ? (imagen?.ruta ?? null) : null,
      descripcion: esImagen(creacion) ? descripcion?.trim().slice(0, LIMITES_FLOR.descripcionMaxima) || null : null,
      autorId: ctx.userId,
      sesionId: ctx.sesionId,
      tono: TONOS[total % TONOS.length],
      altura: 50 + ((total * 23) % 70),
    },
  });

  refrescar(ctx.sesionId);
  return { ok: `La flor de ${nombre.trim()} ya está en el jardín. Tus compañeros de curso pueden verla.` };
}

/** Quien sembró una flor la puede retirar, con su imagen. */
export async function retirarFlor(florId: string): Promise<{ ok?: string; error?: string }> {
  const sesion = await auth();
  if (!sesion?.user) return { error: "No autorizado." };
  const flor = await prisma.florJardin.findUnique({ where: { id: florId } });
  if (!flor || flor.autorId !== sesion.user.id) return { error: "Solo quien sembró la flor puede retirarla." };

  await prisma.florJardin.delete({ where: { id: florId } });
  if (flor.imagen) await eliminarArchivo(flor.imagen).catch(() => {});
  refrescar(flor.sesionId);
  return { ok: "Flor retirada del jardín." };
}
