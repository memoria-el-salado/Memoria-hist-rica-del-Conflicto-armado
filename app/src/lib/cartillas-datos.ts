import { extractText, getDocumentProxy } from "unpdf";
import { leerDocumento } from "@/lib/almacen";
import { prisma } from "@/lib/prisma";
import { leerUbicaciones, ubicarCodigos, type Cartilla, type UbicacionesDocumento } from "@/lib/cartillas";

/** El texto de cada página de un PDF, en orden. */
export async function textoPorPagina(bytes: Uint8Array): Promise<string[]> {
  // pdf.js se apropia del búfer que recibe: se le entrega una copia.
  const pdf = await getDocumentProxy(bytes.slice());
  const { text } = await extractText(pdf, { mergePages: false });
  return text;
}

/** Calcula dónde está cada apartado de un PDF ya guardado y lo anota en su ficha. */
export async function ubicarDocumento(id: string): Promise<UbicacionesDocumento> {
  const ubicaciones = ubicarCodigos(await textoPorPagina(await leerDocumento(id)));
  await prisma.documentoFuente.update({ where: { id }, data: { ubicaciones } });
  return ubicaciones;
}

/**
 * Las cartillas que acompañan las sesiones de un módulo: las que se
 * importaron para él y las que el administrador le vinculó.
 *
 * Una cartilla que aún no sabe dónde está cada apartado (subida antes de que
 * existiera esta función) se ubica la primera vez que se pide, y queda anotada.
 * Si no se puede leer, se ofrece igual, abierta en la portada.
 */
export async function cartillasDelCaso(casoId: string): Promise<Cartilla[]> {
  const seleccion = { id: true, titulo: true, soloDocentes: true, ubicaciones: true } as const;
  const [propias, vinculadas] = await Promise.all([
    prisma.documentoFuente.findMany({ where: { casoId }, select: seleccion }),
    prisma.documentoVinculado.findMany({ where: { casoId }, select: { documento: { select: seleccion } } }),
  ]);
  const documentos = [...propias, ...vinculadas.map((v) => v.documento)];

  return Promise.all(
    documentos.map(async (d) => {
      let ubicaciones = leerUbicaciones(d.ubicaciones);
      if (!ubicaciones) ubicaciones = await ubicarDocumento(d.id).catch(() => null);
      return { id: d.id, titulo: d.titulo, soloDocentes: d.soloDocentes, ubicaciones };
    })
  );
}
