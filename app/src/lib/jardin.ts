/**
 * Jardín de la Memoria (CU04). Cada flor honra a una persona y su legado, y
 * puede llevar una creación del estudiante: una carta, un poema, un dibujo
 * hecho en la plataforma o la foto de uno hecho en papel.
 *
 * Por decisión del equipo el jardín no se modera: lo sembrado se ve al
 * publicarlo, con el nombre de quien lo sembró.
 */

export const CREACIONES = ["NINGUNA", "CARTA", "POEMA", "DIBUJO", "FOTO"] as const;
export type Creacion = (typeof CREACIONES)[number];

export const ETIQUETA_CREACION: Record<Creacion, string> = {
  NINGUNA: "Solo la flor",
  CARTA: "Una carta",
  POEMA: "Un poema",
  DIBUJO: "Un dibujo",
  FOTO: "Foto de un dibujo o una obra",
};

export const LIMITES_FLOR = {
  nombreMaximo: 120,
  legadoMaximo: 600,
  textoMinimo: 10,
  textoMaximo: 4000,
  descripcionMaxima: 300,
  dibujoBytes: 3 * 1024 * 1024,
  fotoBytes: 5 * 1024 * 1024,
};

export const esTexto = (c: Creacion) => c === "CARTA" || c === "POEMA";
export const esImagen = (c: Creacion) => c === "DIBUJO" || c === "FOTO";

/** Formatos de imagen: el dibujo sale del lienzo en PNG; la foto se reduce a JPEG. */
const IMAGENES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function extensionImagen(mime: string): string | null {
  return IMAGENES[mime.split(";")[0].trim().toLowerCase()] ?? null;
}

export function validarImagenFlor(creacion: Creacion, archivo: { mime: string; tamano: number }): string | null {
  if (!esImagen(creacion)) return "Esta creación no lleva imagen.";
  if (!extensionImagen(archivo.mime)) return "Esa imagen no se puede usar. Prueba con JPG o PNG.";
  if (!Number.isFinite(archivo.tamano) || archivo.tamano <= 0) return "La imagen está vacía.";
  const maximo = creacion === "DIBUJO" ? LIMITES_FLOR.dibujoBytes : LIMITES_FLOR.fotoBytes;
  if (archivo.tamano > maximo) return "La imagen pesa demasiado.";
  return null;
}

type Flor = {
  nombre: string;
  legado: string;
  creacion: Creacion;
  texto?: string | null;
  conImagen: boolean;
  descripcion?: string | null;
};

/** Lo que tiene que traer una flor según la creación que la acompaña. */
export function validarFlor(flor: Flor): string | null {
  const nombre = flor.nombre.trim();
  const legado = flor.legado.trim();
  const texto = (flor.texto ?? "").trim();
  if (!nombre) return "Escribe el nombre de la persona que quieres honrar.";
  if (nombre.length > LIMITES_FLOR.nombreMaximo) return "El nombre es demasiado largo.";
  if (!legado) return "Escribe el legado que quieres honrar.";
  if (legado.length > LIMITES_FLOR.legadoMaximo) return `El legado no puede pasar de ${LIMITES_FLOR.legadoMaximo} caracteres.`;
  if ((flor.descripcion ?? "").trim().length > LIMITES_FLOR.descripcionMaxima) return "La descripción de la imagen es demasiado larga.";

  if (esTexto(flor.creacion)) {
    const que = flor.creacion === "CARTA" ? "la carta" : "el poema";
    if (texto.length < LIMITES_FLOR.textoMinimo) return `Escribe ${que} antes de sembrar.`;
    if (texto.length > LIMITES_FLOR.textoMaximo) return `${que === "la carta" ? "La carta" : "El poema"} no puede pasar de ${LIMITES_FLOR.textoMaximo} caracteres.`;
  } else if (texto) {
    return "El texto solo acompaña a una carta o a un poema.";
  }

  if (esImagen(flor.creacion) && !flor.conImagen) {
    return flor.creacion === "DIBUJO" ? "Haz tu dibujo antes de sembrar." : "Añade la foto antes de sembrar.";
  }
  if (!esImagen(flor.creacion) && flor.conImagen) return "La imagen solo acompaña a un dibujo o a una foto.";
  return null;
}

/**
 * Texto alternativo de la imagen: lo que describió el autor, o al menos qué
 * es y a quién honra.
 */
export function textoAlternativo(flor: { creacion: Creacion; nombre: string; descripcion?: string | null }): string {
  const descripcion = flor.descripcion?.trim();
  if (descripcion) return descripcion;
  return flor.creacion === "DIBUJO" ? `Dibujo en memoria de ${flor.nombre}` : `Obra en memoria de ${flor.nombre}`;
}
