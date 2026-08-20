"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  HECTAREAS_MAX_POR_FAMILIA,
  calcularEquidad,
  type Asignacion,
  type Familia,
} from "@/lib/simulador";

/**
 * Acciones de las actividades del estudiante.
 *
 * Todas trabajan dentro de una sesión concreta: lo que se escribe en la sesión
 * 1.1 no se mezcla con lo de la 5.3, y al cambiar de módulo el trabajo sigue
 * atado a la sesión que lo originó.
 */

/** Comprueba que hay estudiante y que la sesión existe y está publicada. */
async function exigirSesion(sesionId: string) {
  const sesion = await auth();
  if (!sesion?.user) return { error: "Necesitas iniciar sesión." as const };

  const actividad = await prisma.sesion.findUnique({
    where: { id: sesionId },
    select: { id: true, publicada: true },
  });
  if (!actividad) return { error: "La sesión ya no existe." as const };
  if (!actividad.publicada) return { error: "El docente aún no ha publicado esta sesión." as const };

  return { userId: sesion.user.id, sesionId: actividad.id };
}

function refrescar(sesionId: string) {
  revalidatePath(`/estudiante/sesion/${sesionId}`);
  revalidatePath("/estudiante/mapa");
}

// ---------------------------------------------------------------- Anotaciones

const anotacionSchema = z.object({
  texto: z.string().trim().min(1, "Escribe tu anotación antes de publicar."),
  cita: z.string().trim().optional(),
});

export async function publicarAnotacion(_prev: unknown, formData: FormData) {
  const contexto = await exigirSesion(String(formData.get("sesionId") ?? ""));
  if ("error" in contexto) return { error: contexto.error };

  const parsed = anotacionSchema.safeParse({
    texto: formData.get("texto"),
    cita: formData.get("cita") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.anotacion.create({
    data: {
      autorId: contexto.userId,
      sesionId: contexto.sesionId,
      texto: parsed.data.texto,
      cita: parsed.data.cita || null,
    },
  });

  refrescar(contexto.sesionId);
  return { ok: "Anotación publicada." };
}

// --------------------------------------------------------------- Cartografía

const marcaSchema = z.object({
  sesionId: z.string().min(1),
  lugar: z.string().trim().min(1, "Escribe el nombre del lugar."),
  relato: z.string().trim(),
  tags: z.array(z.string()),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  conAudio: z.boolean(),
});

export async function guardarMarca(entrada: unknown) {
  const parsed = marcaSchema.safeParse(entrada);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const contexto = await exigirSesion(parsed.data.sesionId);
  if ("error" in contexto) return { error: contexto.error };

  const { lugar, relato, tags, lat, lon, conAudio } = parsed.data;

  await prisma.marcaCartografia.create({
    data: {
      autorId: contexto.userId,
      sesionId: contexto.sesionId,
      lugar,
      relato: relato || "Sin relato escrito.",
      audio: conAudio ? "0:18 grabado" : "Sin audio",
      tags,
      lat,
      lon,
    },
  });

  refrescar(contexto.sesionId);
  return { ok: "Lugar sembrado en la cartografía colectiva." };
}

// ------------------------------------------------------------------- Diario

const entradaSchema = z.object({
  texto: z.string().trim().min(1, "Escribe tu entrada antes de guardar."),
  emocion: z.string().trim(),
  compartir: z.boolean(),
});

export async function guardarEntradaDiario(_prev: unknown, formData: FormData) {
  const autenticacion = await auth();
  if (!autenticacion?.user) return { error: "Necesitas iniciar sesión." };

  const parsed = entradaSchema.safeParse({
    texto: formData.get("texto"),
    emocion: formData.get("emocion") ?? "",
    compartir: formData.get("compartir") === "si",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // El diario se puede escribir dentro de una sesión o desde el espacio
  // personal, donde no hay ninguna.
  const sesionId = String(formData.get("sesionId") ?? "") || null;
  if (sesionId) {
    const contexto = await exigirSesion(sesionId);
    if ("error" in contexto) return { error: contexto.error };
  }

  await prisma.entradaDiario.create({
    data: {
      autorId: autenticacion.user.id,
      sesionId,
      emocion: parsed.data.emocion || "SIN ETIQUETA",
      texto: parsed.data.texto,
      privada: !parsed.data.compartir,
    },
  });

  revalidatePath("/estudiante/diario");
  if (sesionId) refrescar(sesionId);
  return { ok: "Entrada guardada." };
}

// ------------------------------------------------------------------- Jardín

const TONOS = ["#1B8A8A", "#EBB035", "#D95D39", "#177575"];

const florSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre de la persona que quieres honrar."),
  legado: z.string().trim().min(1, "Escribe el legado que quieres honrar."),
  epoca: z.enum(["ANTES_1997", "ENTRE_1997_2000", "RETORNO"]),
  pieza: z.enum(["FLOR", "HOJA", "SEMILLA", "MANO"]),
});

export async function sembrarMemoria(_prev: unknown, formData: FormData) {
  const contexto = await exigirSesion(String(formData.get("sesionId") ?? ""));
  if ("error" in contexto) return { error: contexto.error };

  const parsed = florSchema.safeParse({
    nombre: formData.get("nombre"),
    legado: formData.get("legado"),
    epoca: formData.get("epoca"),
    pieza: formData.get("pieza"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const total = await prisma.florJardin.count({ where: { sesionId: contexto.sesionId } });

  await prisma.florJardin.create({
    data: {
      ...parsed.data,
      autorId: contexto.userId,
      sesionId: contexto.sesionId,
      tono: TONOS[total % TONOS.length],
      altura: 50 + ((total * 23) % 70),
    },
  });

  refrescar(contexto.sesionId);
  return { ok: "Memoria sembrada en el jardín colectivo." };
}

// ---------------------------------------------------------------- Simulador

const simulacionSchema = z.object({
  sesionId: z.string().min(1),
  asignaciones: z.record(
    z.string(),
    z.object({
      hectareas: z.number().int().min(0).max(HECTAREAS_MAX_POR_FAMILIA),
      subsidio: z.enum(["NINGUNO", "RIEGO", "AGRICULTURA"]),
    })
  ),
});

export async function guardarSimulacion(entrada: unknown) {
  const parsed = simulacionSchema.safeParse(entrada);
  if (!parsed.success) return { error: "La distribución enviada no es válida." };

  const contexto = await exigirSesion(parsed.data.sesionId);
  if ("error" in contexto) return { error: contexto.error };

  const asignaciones = parsed.data.asignaciones as Record<string, Asignacion>;
  const familias = await prisma.familia.findMany({ orderBy: { orden: "asc" } });
  const equidad = calcularEquidad(familias as unknown as Familia[], asignaciones);

  const clave = { userId_sesionId: { userId: contexto.userId, sesionId: contexto.sesionId } };

  const simulacion = await prisma.simulacion.upsert({
    where: clave,
    create: {
      userId: contexto.userId,
      sesionId: contexto.sesionId,
      indiceEquidad: equidad,
      validadaEn: new Date(),
    },
    update: { indiceEquidad: equidad, validadaEn: new Date() },
  });

  const validas = familias.filter((f) => asignaciones[f.id]);

  await prisma.$transaction([
    prisma.asignacion.deleteMany({ where: { simulacionId: simulacion.id } }),
    prisma.asignacion.createMany({
      data: validas.map((f) => ({
        simulacionId: simulacion.id,
        familiaId: f.id,
        hectareas: asignaciones[f.id].hectareas,
        subsidio: asignaciones[f.id].subsidio,
      })),
    }),
  ]);

  refrescar(contexto.sesionId);
  return { ok: true, equidad };
}

export async function reiniciarSimulacion(sesionId: string) {
  const contexto = await exigirSesion(sesionId);
  if ("error" in contexto) return { error: contexto.error };

  const simulacion = await prisma.simulacion.findUnique({
    where: { userId_sesionId: { userId: contexto.userId, sesionId: contexto.sesionId } },
  });

  if (simulacion) {
    await prisma.asignacion.deleteMany({ where: { simulacionId: simulacion.id } });
    await prisma.simulacion.update({
      where: { id: simulacion.id },
      data: { indiceEquidad: 0, validadaEn: null },
    });
  }

  refrescar(contexto.sesionId);
  return { ok: true };
}

// ------------------------------------------------------- Respuesta escrita

const respuestaSchema = z.object({
  texto: z.string().trim().min(1, "Escribe tu respuesta antes de guardar."),
});

/** Respuesta abierta del estudiante a la sesión; se puede reescribir. */
export async function guardarRespuesta(_prev: unknown, formData: FormData) {
  const contexto = await exigirSesion(String(formData.get("sesionId") ?? ""));
  if ("error" in contexto) return { error: contexto.error };

  const parsed = respuestaSchema.safeParse({ texto: formData.get("texto") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.respuestaActividad.upsert({
    where: { userId_sesionId: { userId: contexto.userId, sesionId: contexto.sesionId } },
    create: {
      userId: contexto.userId,
      sesionId: contexto.sesionId,
      texto: parsed.data.texto,
    },
    update: { texto: parsed.data.texto },
  });

  refrescar(contexto.sesionId);
  return { ok: "Respuesta guardada." };
}
