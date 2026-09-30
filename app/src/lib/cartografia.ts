/**
 * Cartografía social (CU02): el relato del lugar se puede escribir o grabar,
 * y se le puede sumar una foto. La guía pide además que el espacio
 * significativo se elija en colectivo, así que una marca puede ser del grupo.
 */

export const LIMITES_MARCA = {
  lugarMaximo: 120,
  relatoMaximo: 2000,
  /** Tres minutos bastan para un relato; más, y el archivo pesa en una conexión rural. */
  audioSegundos: 180,
  audioBytes: 8 * 1024 * 1024,
  /** La foto se reduce en el navegador antes de subirla; esto es solo el tope. */
  fotoBytes: 5 * 1024 * 1024,
  /** Lado mayor de la foto reducida, en píxeles. */
  fotoLado: 1600,
};

export type ClaseAdjunto = "audio" | "foto";

/** Formatos que graban los navegadores (Chrome y Firefox, WebM u Ogg; Safari, MP4) y los de una foto. */
const EXTENSIONES: Record<ClaseAdjunto, Record<string, string>> = {
  audio: { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav" },
  foto: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
};

/** El tipo sin parámetros: `audio/webm;codecs=opus` es `audio/webm`. */
export function mimeBase(mime: string): string {
  return mime.split(";")[0].trim().toLowerCase();
}

export function extensionDe(clase: ClaseAdjunto, mime: string): string | null {
  return EXTENSIONES[clase][mimeBase(mime)] ?? null;
}

/** Revisa lo que el navegador anuncia antes de firmar la subida. */
export function validarAdjunto(clase: ClaseAdjunto, archivo: { mime: string; tamano: number }): string | null {
  if (!extensionDe(clase, archivo.mime)) {
    return clase === "audio"
      ? "Tu navegador grabó en un formato que no podemos guardar. Prueba con otro navegador o escribe el relato."
      : "Esa imagen no se puede usar. Prueba con una foto JPG o PNG.";
  }
  const maximo = clase === "audio" ? LIMITES_MARCA.audioBytes : LIMITES_MARCA.fotoBytes;
  if (!Number.isFinite(archivo.tamano) || archivo.tamano <= 0) return "El archivo está vacío.";
  if (archivo.tamano > maximo) {
    return clase === "audio" ? "La grabación es demasiado larga." : "La foto pesa demasiado aun reducida.";
  }
  return null;
}

/** El tipo que el depósito dice tener coincide con la clase de adjunto. */
export function tipoDeAdjuntoCoincide(clase: ClaseAdjunto, mimeGuardado: string): boolean {
  return extensionDe(clase, mimeGuardado) !== null;
}

/**
 * Lo mínimo de una marca: dónde y qué evoca. El relato se puede escribir o
 * grabar; a quien le cuesta escribir no se le obliga.
 */
export function validarMarca(entrada: { lugar: string; relato: string; conAudio: boolean }): string | null {
  const lugar = entrada.lugar.trim();
  const relato = entrada.relato.trim();
  if (!lugar) return "Escribe el nombre del lugar.";
  if (lugar.length > LIMITES_MARCA.lugarMaximo) return `El nombre del lugar no puede pasar de ${LIMITES_MARCA.lugarMaximo} caracteres.`;
  if (relato.length > LIMITES_MARCA.relatoMaximo) return `El relato no puede pasar de ${LIMITES_MARCA.relatoMaximo} caracteres.`;
  if (!relato && !entrada.conAudio) return "Cuenta qué te evoca el lugar: escríbelo o grábalo.";
  return null;
}

export function duracion(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * A quién cuenta una marca para el avance: a su autor y, si es del grupo, a
 * todos los miembros del grupo, que eligieron el lugar juntos.
 */
export function quienesCuentan(marca: { autorId: string; grupoId: string | null }, miembros: Map<string, string[]>): string[] {
  const grupo = marca.grupoId ? (miembros.get(marca.grupoId) ?? []) : [];
  return [...new Set([marca.autorId, ...grupo])];
}
