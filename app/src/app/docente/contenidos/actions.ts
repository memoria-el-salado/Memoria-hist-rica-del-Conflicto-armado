"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eliminarArchivo, firmarSubida, guardarArchivo, infoArchivo, rutaValida } from "@/lib/almacen";
import { quienSoy } from "@/lib/debate";
import { prisma } from "@/lib/prisma";
import {
  definicionDe,
  extensionParaGuardar,
  MAXIMO_RECURSO,
  mimeParaGuardar,
  tipoCoincide,
  validarArchivoRecurso,
  validarEnlace,
  type ArchivoRecurso,
  type TipoRecurso,
} from "@/lib/recursos";
import { esIdentificadorDeSubida } from "@/lib/subida-documento";
import { estadoAccesibilidad, leerTranscripcion, requisitoDe, serializar } from "@/lib/transcripcion";

const TIPOS = ["VIDEO", "AUDIO", "IMAGEN", "DOCUMENTO", "SIMULADOR"] as const;

async function exigirDocente() {
  const quien = await quienSoy();
  return quien?.rol === "DOCENTE" ? quien : null;
}

function refrescar() {
  revalidatePath("/docente/contenidos");
  revalidatePath("/admin/accesibilidad");
  // El material aparece dentro de las sesiones del estudiante.
  revalidatePath("/estudiante/sesion/[id]", "page");
}

export type SubidaRecurso = { error?: string; id?: string; ruta?: string; url?: string | null; mime?: string };

/**
 * Prepara la subida de un archivo de recurso. Devuelve la ruta en el depósito,
 * la dirección firmada a la que el navegador lo envía directamente y el tipo
 * MIME con que debe enviarlo. En un equipo local la dirección es `null`: el
 * archivo va por `subirRecursoLocal`.
 */
export async function prepararSubidaRecurso(archivo: ArchivoRecurso, tipo: TipoRecurso): Promise<SubidaRecurso> {
  if (!(await exigirDocente())) return { error: "No autorizado." };
  if (!TIPOS.includes(tipo)) return { error: "Tipo de recurso no válido." };

  const error = validarArchivoRecurso(archivo, tipo);
  if (error) return { error };

  const extension = extensionParaGuardar(archivo, tipo);
  const mime = mimeParaGuardar(archivo, tipo);

  const id = randomUUID();
  const ruta = `recursos/${id}.${extension}`;
  try {
    return { id, ruta, mime, url: await firmarSubida(ruta) };
  } catch {
    return { error: "No se pudo preparar la subida. Inténtalo de nuevo en unos segundos." };
  }
}

/** En un equipo local, sin depósito, el archivo pasa por el servidor. */
export async function subirRecursoLocal(ruta: string, formData: FormData) {
  if (!(await exigirDocente())) return { error: "No autorizado." };
  const archivo = formData.get("archivo");
  if (!rutaValida(ruta) || !ruta.startsWith("recursos/") || !(archivo instanceof File)) {
    return { error: "La subida no es válida." };
  }
  await guardarArchivo(ruta, new Uint8Array(await archivo.arrayBuffer()), archivo.type);
  return { ok: true };
}

/**
 * Borra un archivo subido que no llegó a registrarse, por ejemplo porque el
 * formulario tenía un error. Sin esto quedaría en el depósito sin ficha.
 */
export async function descartarSubida(ruta: string) {
  if (!(await exigirDocente())) return { error: "No autorizado." };
  if (!rutaValida(ruta) || !ruta.startsWith("recursos/")) return { error: "Ruta no válida." };
  if (await prisma.recurso.findFirst({ where: { archivo: ruta } })) return { error: "Ese archivo está en uso." };

  await eliminarArchivo(ruta);
  return { ok: true };
}

const recursoSchema = z.object({
  titulo: z.string().trim().min(1, "El recurso necesita un título."),
  // Regla pedagógica del documento: ningún recurso se publica sin contexto histórico.
  contexto: z.string().trim().min(1, "El contexto histórico es obligatorio para publicar."),
  ejeId: z.string().min(1, "Selecciona el eje temático."),
  sesionId: z.string().nullish(),
  tipo: z.enum(TIPOS),
  alerta: z.boolean(),
  origen: z.discriminatedUnion("clase", [
    z.object({ clase: z.literal("archivo"), id: z.string(), ruta: z.string() }),
    z.object({ clase: z.literal("enlace"), enlace: z.string() }),
  ]),
});

/**
 * Registra el recurso. Si es un archivo, comprueba en el depósito que llegó,
 * con el tamaño y el tipo anunciados: la firma autoriza escribir, no garantiza
 * qué se escribió.
 */
export async function cargarRecurso(entrada: unknown) {
  const quien = await exigirDocente();
  if (!quien) return { error: "No autorizado." };

  const parsed = recursoSchema.safeParse(entrada);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { origen, sesionId, ...datos } = parsed.data;

  if (sesionId) {
    const sesion = await prisma.sesion.findUnique({ where: { id: sesionId }, select: { ejeId: true } });
    if (sesion?.ejeId !== datos.ejeId) return { error: "La sesión no pertenece a ese eje." };
  }

  let id: string = randomUUID();
  let archivo: { archivo: string; mime: string; tamano: number } | null = null;
  let enlace: string | null = null;

  if (origen.clase === "archivo") {
    const valida = esIdentificadorDeSubida(origen.id) && origen.ruta.startsWith(`recursos/${origen.id}.`) && rutaValida(origen.ruta);
    if (!valida) return { error: "La subida no es válida. Vuelve a elegir el archivo." };
    if (await prisma.recurso.findUnique({ where: { id: origen.id } })) return { error: "Ese recurso ya estaba cargado." };

    const info = await infoArchivo(origen.ruta);
    if (!info) return { error: "El archivo no llegó al almacén. Vuelve a subirlo." };

    const problema =
      info.tamano > MAXIMO_RECURSO
        ? "El archivo supera el tamaño máximo."
        : info.tipo && !tipoCoincide(info.tipo, datos.tipo)
          ? "El archivo no es del tipo elegido."
          : null;
    if (problema) {
      await eliminarArchivo(origen.ruta);
      return { error: problema };
    }

    id = origen.id;
    archivo = { archivo: origen.ruta, mime: info.tipo || definicionDe(datos.tipo).mimes[0], tamano: info.tamano };
  } else {
    const error = validarEnlace(origen.enlace);
    if (error) return { error };
    enlace = origen.enlace.trim();
  }

  const recurso = await prisma.recurso.create({
    data: { id, ...datos, sesionId: sesionId || null, ...archivo, enlace, autorId: quien.id },
  });

  // Todo recurso entra a la auditoría de accesibilidad (CU10), con su estado
  // calculado: un audio o un video recién subidos todavía no tienen transcripción.
  const estado = estadoAccesibilidad(recurso);
  await prisma.auditoriaAccesibilidad.create({
    data: {
      recursoId: recurso.id,
      descripcion: `${definicionDe(datos.tipo).etiqueta} · nuevo`,
      transcripcion: estado.alternativa,
      contraste: true,
      responsivo: true,
    },
  });

  refrescar();
  return {
    ok: estado.alternativa
      ? "Recurso cargado al módulo."
      : "Recurso cargado. Añade su transcripción: sin ella los estudiantes no lo ven.",
  };
}

/** Solo quien cargó el recurso lo cambia o lo retira. */
async function recursoPropio(recursoId: string) {
  const quien = await exigirDocente();
  if (!quien) return null;
  const recurso = await prisma.recurso.findUnique({ where: { id: recursoId } });
  return recurso && recurso.autorId === quien.id ? recurso : null;
}

export async function alternarAlertaRecurso(recursoId: string) {
  const recurso = await recursoPropio(recursoId);
  if (!recurso) return { error: "Solo quien cargó el recurso puede cambiarlo." };

  await prisma.recurso.update({ where: { id: recursoId }, data: { alerta: !recurso.alerta } });
  refrescar();
  return { ok: true };
}

/**
 * Guarda la transcripción del audio o del video. Un video subido necesita
 * tiempos, porque se muestra como subtítulos; al audio y al video enlazado les
 * basta el texto.
 */
export async function guardarTranscripcion(recursoId: string, entrada: string) {
  const recurso = await recursoPropio(recursoId);
  if (!recurso) return { error: "Solo quien cargó el recurso puede cambiarlo." };

  const requisito = requisitoDe(recurso.tipo, Boolean(recurso.enlace));
  if (requisito === "ninguno") return { error: "Este tipo de recurso no lleva transcripción." };

  const { transcripcion, error } = leerTranscripcion(String(entrada ?? ""));
  if (error) return { error };
  if (requisito === "sincronizada" && !transcripcion!.sincronizada) {
    return {
      error: "Un video subido se muestra con subtítulos: escribe cada línea con su minuto, como 0:07 El tabaco se secaba…",
    };
  }

  const actualizado = await prisma.recurso.update({
    where: { id: recursoId },
    data: { transcripcion: serializar(transcripcion!) },
  });
  await prisma.auditoriaAccesibilidad.updateMany({
    where: { recursoId },
    data: { transcripcion: estadoAccesibilidad(actualizado).alternativa, revisadaEn: new Date() },
  });

  refrescar();
  return {
    ok: transcripcion!.sincronizada
      ? `Transcripción guardada con ${transcripcion!.cues.length} líneas sincronizadas. Los estudiantes ya lo ven.`
      : "Transcripción guardada. Los estudiantes ya lo ven.",
  };
}

/** Retira el recurso y borra su archivo del depósito. */
export async function eliminarRecurso(recursoId: string) {
  const recurso = await recursoPropio(recursoId);
  if (!recurso) return { error: "Solo quien cargó el recurso puede retirarlo." };

  await prisma.recurso.delete({ where: { id: recursoId } });
  if (recurso.archivo) await eliminarArchivo(recurso.archivo);

  refrescar();
  return { ok: `"${recurso.titulo}" se retiró del módulo.` };
}
