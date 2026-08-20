"use server";

import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { extractText, getDocumentProxy } from "unpdf";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVIDADES, armarArbol, detectarEstructura, type EjeArmado } from "@/lib/importador-pdf";

const CARPETA = path.join(process.cwd(), "almacen", "documentos");
const TAMANO_MAXIMO = 25 * 1024 * 1024;

const TONOS = ["#D95D39", "#1B8A8A", "#EBB035", "#B8482A", "#8C8279", "#177575"];

async function exigirAdmin() {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ADMIN") return null;
  return sesion;
}

export type ResultadoAnalisis = {
  error?: string;
  documentoId?: string;
  tituloDocumento?: string;
  paginas?: number;
  arbol?: EjeArmado[];
};

/** Extrae el texto de un PDF y propone la estructura curricular que contiene. */
async function analizar(bytes: Uint8Array) {
  // pdf.js se apropia del búfer que recibe y lo deja inservible, así que se le
  // entrega una copia y el original queda intacto para guardar el archivo.
  const pdf = await getDocumentProxy(bytes.slice());
  const { text, totalPages } = await extractText(pdf, { mergePages: true });

  if (!text.trim()) {
    return {
      error:
        "El PDF no contiene texto seleccionable (parece escaneado). Necesita pasar antes por un proceso de OCR.",
    };
  }

  const estructura = detectarEstructura(text);
  const arbol = armarArbol(estructura.elementos);

  if (arbol.length === 0) {
    return {
      error:
        "No se reconoció ninguna estructura de ejes o sesiones en el documento. Revisa que sea una guía con numeración del tipo 1.1, 1.2.1.",
    };
  }

  return { titulo: estructura.titulo, arbol, paginas: totalPages };
}

/**
 * Paso 1a · Sube un PDF nuevo, lo guarda y propone su estructura.
 * No crea nada del módulo todavía: el administrador revisa primero.
 */
export async function analizarDocumento(
  _prev: unknown,
  formData: FormData
): Promise<ResultadoAnalisis> {
  if (!(await exigirAdmin())) return { error: "No autorizado." };

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Selecciona un archivo PDF." };
  }
  if (archivo.type !== "application/pdf" && !archivo.name.toLowerCase().endsWith(".pdf")) {
    return { error: "El archivo debe ser un PDF." };
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return { error: "El PDF supera el tamaño máximo de 25 MB." };
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer());

  let analisis;
  try {
    analisis = await analizar(bytes);
  } catch {
    return { error: "No se pudo leer el PDF. Puede estar dañado o protegido con contraseña." };
  }
  if (analisis.error) return { error: analisis.error };

  await mkdir(CARPETA, { recursive: true });
  const id = randomUUID();
  await writeFile(path.join(CARPETA, `${id}.pdf`), bytes);

  const documento = await prisma.documentoFuente.create({
    data: {
      id,
      titulo: analisis.titulo ?? archivo.name.replace(/\.pdf$/i, ""),
      nombreArchivo: archivo.name,
      rutaArchivo: `almacen/documentos/${id}.pdf`,
      paginas: analisis.paginas!,
    },
  });

  revalidatePath("/admin/importar");
  return {
    documentoId: documento.id,
    tituloDocumento: documento.titulo,
    paginas: documento.paginas,
    arbol: analisis.arbol,
  };
}

/**
 * Elimina un documento del repositorio: la ficha y el PDF del disco.
 *
 * Sirve para volver a subir una versión corregida sin acumular copias. Si el
 * documento ya dio origen a un módulo, se avisa: borrar el archivo dejaría al
 * módulo sin su fuente, que es lo que respalda su contenido.
 */
export async function eliminarDocumento(documentoId: string) {
  if (!(await exigirAdmin())) return { error: "No autorizado." };

  const documento = await prisma.documentoFuente.findUnique({
    where: { id: documentoId },
    include: { caso: { select: { nombre: true } } },
  });
  if (!documento) return { error: "El documento ya no existe." };

  if (documento.caso) {
    return {
      error:
        `Este PDF es la fuente del módulo "${documento.caso.nombre}". ` +
        "Elimina antes el módulo en Módulos Geográficos y vuelve a intentarlo.",
    };
  }

  await prisma.documentoFuente.delete({ where: { id: documentoId } });

  // El archivo puede haber desaparecido ya; el borrado no debe fallar por eso.
  try {
    await unlink(path.join(CARPETA, `${documento.id}.pdf`));
  } catch {
    // Nada que hacer: la ficha es lo que manda y ya se eliminó.
  }

  revalidatePath("/admin/importar");
  return { ok: `"${documento.titulo}" se eliminó del repositorio.` };
}

/**
 * Reserva un documento al docente, o lo vuelve a abrir a todos.
 *
 * Las guías para maestros del CNMH traen las respuestas esperadas y las
 * orientaciones para conducir la sesión; si el estudiante puede abrirlas, la
 * actividad pierde sentido.
 */
export async function alternarVisibilidadDocumento(documentoId: string) {
  if (!(await exigirAdmin())) return { error: "No autorizado." };

  const documento = await prisma.documentoFuente.findUnique({ where: { id: documentoId } });
  if (!documento) return { error: "El documento ya no existe." };

  const actualizado = await prisma.documentoFuente.update({
    where: { id: documentoId },
    data: { soloDocentes: !documento.soloDocentes },
  });

  revalidatePath("/admin/importar");
  revalidatePath("/docente/contenidos");

  return {
    ok: actualizado.soloDocentes
      ? `"${actualizado.titulo}" queda reservado a los docentes.`
      : `"${actualizado.titulo}" vuelve a estar disponible para los estudiantes.`,
  };
}

/**
 * Asocia un documento ya cargado a un módulo existente, sin volver a importar
 * su estructura. Es la vía para adjuntar la guía del docente al mismo caso que
 * se creó desde la guía del estudiante.
 */
export async function vincularDocumento(documentoId: string, casoId: string) {
  if (!(await exigirAdmin())) return { error: "No autorizado." };

  const documento = await prisma.documentoFuente.findUnique({ where: { id: documentoId } });
  if (!documento) return { error: "El documento ya no existe." };

  if (!casoId) {
    await prisma.documentoFuente.update({ where: { id: documentoId }, data: { casoId: null } });
    revalidatePath("/admin/importar");
    return { ok: `"${documento.titulo}" ya no está asociado a ningún módulo.` };
  }

  const caso = await prisma.caso.findUnique({ where: { id: casoId } });
  if (!caso) return { error: "El módulo no existe." };

  await prisma.documentoFuente.update({ where: { id: documentoId }, data: { casoId } });

  revalidatePath("/admin/importar");
  revalidatePath("/docente/contenidos");
  return { ok: `"${documento.titulo}" quedó asociado al módulo "${caso.nombre}".` };
}

/** Paso 1b · Analiza un documento que ya está cargado en el sistema. */
export async function analizarDocumentoExistente(documentoId: string): Promise<ResultadoAnalisis> {
  if (!(await exigirAdmin())) return { error: "No autorizado." };

  const documento = await prisma.documentoFuente.findUnique({ where: { id: documentoId } });
  if (!documento) return { error: "El documento no existe." };

  let analisis;
  try {
    const bytes = new Uint8Array(await readFile(path.join(CARPETA, `${documento.id}.pdf`)));
    analisis = await analizar(bytes);
  } catch {
    return { error: "No se pudo leer el archivo del documento." };
  }
  if (analisis.error) return { error: analisis.error };

  return {
    documentoId: documento.id,
    tituloDocumento: documento.titulo,
    paginas: documento.paginas,
    arbol: analisis.arbol,
  };
}

const actividades = ACTIVIDADES.map((a) => a.valor);

const arbolSchema = z.array(
  z.object({
    codigo: z.string().min(1),
    titulo: z.string().trim().min(1),
    sesiones: z.array(
      z.object({
        codigo: z.string().min(1),
        titulo: z.string().trim().min(1),
        actividad: z.enum(actividades as [string, ...string[]]),
        contenido: z.string().default(""),
        subsecciones: z.array(
          z.object({
            codigo: z.string().min(1),
            titulo: z.string().trim().min(1),
            contenido: z.string().default(""),
          })
        ),
      })
    ),
  })
);

const confirmacionSchema = z.object({
  documentoId: z.string().min(1),
  nombre: z.string().trim().min(1, "Indica el nombre del caso de estudio."),
  depto: z.string().trim().min(1, "Indica el departamento o la región."),
  activo: z.boolean(),
  lat: z.number().min(-90).max(90).nullable(),
  lon: z.number().min(-180).max(180).nullable(),
  arbol: arbolSchema.min(1, "Debes conservar al menos un eje."),
});

const ETIQUETA_ACTIVIDAD = new Map<string, string>(
  ACTIVIDADES.map((a) => [a.valor, a.etiqueta.toUpperCase()])
);

/**
 * Busca en el texto de la sesión una pregunta que sirva para encabezar la
 * actividad. Las guías del CNMH las plantean explícitamente; si no aparece
 * ninguna, se usa el propio título cuando ya es una pregunta.
 */
function extraerPregunta(contenido: string, titulo: string): string | null {
  for (const encontrada of contenido.matchAll(/¿[^¿?]{15,180}\?/g)) {
    // Las que van en versales son rótulos del índice, no preguntas de trabajo.
    if (/[a-záéíóúñ]/.test(encontrada[0])) return encontrada[0];
  }
  return /¿.*\?/.test(titulo) ? titulo : null;
}

/**
 * Paso 2 · Crea el módulo con la estructura ya revisada por el administrador
 * y deja el PDF vinculado como documento fuente.
 */
export async function crearModuloDesdeDocumento(entrada: unknown) {
  if (!(await exigirAdmin())) return { error: "No autorizado." };

  const parsed = confirmacionSchema.safeParse(entrada);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { documentoId, nombre, depto, activo, lat, lon, arbol } = parsed.data;

  const documento = await prisma.documentoFuente.findUnique({ where: { id: documentoId } });
  if (!documento) return { error: "El documento ya no está disponible; vuelve a subirlo." };

  const existente = await prisma.caso.findUnique({ where: { nombre } });
  if (existente) return { error: `Ya existe un módulo llamado "${nombre}".` };

  // Solo un caso puede estar activo: es el que ve el estudiante en su ruta.
  if (activo) await prisma.caso.updateMany({ data: { activo: false } });

  const caso = await prisma.caso.create({
    data: {
      nombre,
      depto,
      estado: activo ? "ACTIVO" : "EN_CURADURIA",
      version: "1.0.0",
      activo,
      lat,
      lon,
      ejes: {
        create: arbol.map((eje, i) => ({
          numero: Number(eje.codigo),
          nombre: eje.titulo,
          descripcion: `Eje derivado de "${documento.titulo}".`,
          tono: TONOS[i % TONOS.length],
          orden: i,
          sesiones: {
            create: eje.sesiones.map((sesion, j) => ({
              codigo: sesion.codigo,
              titulo: sesion.titulo,
              tipo: ETIQUETA_ACTIVIDAD.get(sesion.actividad) ?? "CONTENIDO IMPORTADO",
              pantalla: sesion.actividad,
              publicada: false,
              orden: j,
              // El texto del documento es lo que el estudiante leerá al abrir
              // la actividad, en lugar de un contenido de ejemplo.
              contenido: sesion.contenido || null,
              preguntaOrientadora: extraerPregunta(sesion.contenido, sesion.titulo),
              subsecciones: {
                create: sesion.subsecciones.map((sub, k) => ({
                  codigo: sub.codigo,
                  titulo: sub.titulo,
                  contenido: sub.contenido || null,
                  orden: k,
                })),
              },
            })),
          },
        })),
      },
    },
  });

  await prisma.documentoFuente.update({
    where: { id: documentoId },
    data: { casoId: caso.id },
  });

  const sesiones = arbol.reduce((s, e) => s + e.sesiones.length, 0);
  const subsecciones = arbol.reduce(
    (s, e) => s + e.sesiones.reduce((t, x) => t + x.subsecciones.length, 0),
    0
  );

  revalidatePath("/admin/casos");
  revalidatePath("/admin/importar");
  revalidatePath("/docente/panel");
  revalidatePath("/estudiante/mapa");

  return {
    ok:
      `Módulo "${nombre}" creado con ${arbol.length} ejes, ${sesiones} sesiones y ${subsecciones} subsecciones. ` +
      "Las sesiones quedan sin publicar: el docente las habilita desde su panel.",
  };
}
