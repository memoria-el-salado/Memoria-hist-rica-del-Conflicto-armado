/**
 * Reglas del material multimedia de los módulos (CU06).
 *
 * El documento de avance pide que el docente cargue testimonios, coplas y
 * recortes de prensa con su contexto histórico. Un recurso es un archivo del
 * depósito o un enlace externo: los videos largos no caben en los 50 MB por
 * archivo del plan gratuito de Supabase, así que se enlazan desde YouTube o
 * Vimeo y se ven incrustados.
 */

export type TipoRecurso = "VIDEO" | "AUDIO" | "IMAGEN" | "DOCUMENTO" | "SIMULADOR";

type Definicion = {
  valor: TipoRecurso;
  etiqueta: string;
  /** Tipos MIME y extensiones que se aceptan al subir. Vacíos: solo enlace. */
  mimes: readonly string[];
  extensiones: readonly string[];
};

export const TIPOS_RECURSO: readonly Definicion[] = [
  {
    valor: "VIDEO",
    etiqueta: "Video",
    mimes: ["video/mp4", "video/webm", "video/quicktime"],
    extensiones: ["mp4", "webm", "mov"],
  },
  {
    valor: "AUDIO",
    etiqueta: "Audio",
    mimes: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg", "audio/wav", "audio/x-wav", "audio/webm"],
    extensiones: ["mp3", "m4a", "aac", "ogg", "wav", "webm"],
  },
  {
    valor: "IMAGEN",
    etiqueta: "Imagen",
    mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    extensiones: ["jpg", "jpeg", "png", "webp", "gif"],
  },
  { valor: "DOCUMENTO", etiqueta: "Documento", mimes: ["application/pdf"], extensiones: ["pdf"] },
  { valor: "SIMULADOR", etiqueta: "Simulador", mimes: [], extensiones: [] },
];

const MB = 1024 * 1024;

/** Supabase, plan gratuito: 50 MB por archivo. */
export const MAXIMO_RECURSO = 50 * MB;

export function definicionDe(tipo: TipoRecurso): Definicion {
  return TIPOS_RECURSO.find((t) => t.valor === tipo)!;
}

export function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  return punto < 0 ? "" : nombre.slice(punto + 1).toLowerCase();
}

export type ArchivoRecurso = { nombre: string; tipo: string; tamano: number };

function megas(bytes: number) {
  return `${Math.round(bytes / MB)} MB`;
}

/** Devuelve por qué no se acepta el archivo para ese tipo de recurso, o `null`. */
export function validarArchivoRecurso(archivo: ArchivoRecurso, tipo: TipoRecurso): string | null {
  const def = definicionDe(tipo);
  if (!def.extensiones.length) return "Un simulador se enlaza: pega su dirección en lugar de subir un archivo.";
  if (!archivo.nombre || archivo.tamano <= 0) return "Selecciona un archivo.";

  // Hay sistemas que no informan el tipo MIME: basta con que cuadre uno de los dos.
  const cuadra = def.extensiones.includes(extensionDe(archivo.nombre)) || def.mimes.includes(archivo.tipo);
  if (!cuadra) {
    return `Para ${def.etiqueta.toLowerCase() === "imagen" ? "una imagen" : `un ${def.etiqueta.toLowerCase()}`} se admiten archivos ${def.extensiones.join(", ")}.`;
  }

  if (archivo.tamano > MAXIMO_RECURSO) {
    const consejo = tipo === "VIDEO" ? " Para un video largo, súbelo a YouTube o Vimeo y pega el enlace." : "";
    return `El archivo pesa ${megas(archivo.tamano)} y el máximo es ${megas(MAXIMO_RECURSO)}.${consejo}`;
  }
  return null;
}

/** Extensión que corresponde a cada tipo MIME admitido. */
const EXTENSION_DE_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/** Extensión con que se guarda: la del archivo si es válida, o la de su tipo. */
export function extensionParaGuardar(archivo: ArchivoRecurso, tipo: TipoRecurso): string {
  const def = definicionDe(tipo);
  const propia = extensionDe(archivo.nombre);
  if (def.extensiones.includes(propia)) return propia;
  return EXTENSION_DE_MIME[archivo.tipo] ?? def.extensiones[0];
}

/**
 * Tipo MIME con que se sube el archivo. Si el navegador no lo informó, se toma
 * el de la extensión, para que el depósito lo sirva como audio o video y no
 * como archivo genérico que el reproductor no sabría abrir.
 */
export function mimeParaGuardar(archivo: ArchivoRecurso, tipo: TipoRecurso): string {
  const def = definicionDe(tipo);
  if (def.mimes.includes(archivo.tipo)) return archivo.tipo;

  const extension = extensionParaGuardar(archivo, tipo);
  // .webm puede ser audio o video: decide el tipo de recurso.
  if (extension === "webm") return tipo === "AUDIO" ? "audio/webm" : "video/webm";
  const mime = Object.entries(EXTENSION_DE_MIME).find(([m, e]) => e === extension && def.mimes.includes(m))?.[0];
  return mime ?? def.mimes[0];
}

/** Comprueba que lo que llegó al depósito es lo que se anunció al firmar. */
export function tipoCoincide(mimeGuardado: string, tipo: TipoRecurso): boolean {
  const mime = mimeGuardado.split(";")[0].trim();
  return definicionDe(tipo).mimes.includes(mime);
}

export type Incrustado = { proveedor: "YouTube" | "Vimeo"; url: string };

const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Convierte un enlace de YouTube o Vimeo en la dirección para incrustarlo. De
 * YouTube se usa el dominio sin cookies, para no rastrear a los estudiantes.
 * Devuelve `null` si el enlace no es de ninguno de los dos.
 */
export function incrustable(enlace: string): Incrustado | null {
  let url: URL;
  try {
    url = new URL(enlace);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, "");

  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? null;
  }
  if (id && ID_YOUTUBE.test(id)) {
    return { proveedor: "YouTube", url: `https://www.youtube-nocookie.com/embed/${id}` };
  }

  const vimeo =
    host === "vimeo.com"
      ? url.pathname.match(/^\/(\d+)/)?.[1]
      : host === "player.vimeo.com"
        ? url.pathname.match(/^\/video\/(\d+)/)?.[1]
        : undefined;
  if (vimeo) return { proveedor: "Vimeo", url: `https://player.vimeo.com/video/${vimeo}` };

  return null;
}

/** Un enlace tiene que ser una dirección https completa. */
export function validarEnlace(enlace: string): string | null {
  const limpio = enlace.trim();
  if (!limpio) return "Pega la dirección del recurso.";
  if (limpio.length > 500) return "La dirección es demasiado larga.";
  try {
    if (new URL(limpio).protocol !== "https:") return "La dirección tiene que empezar por https://.";
  } catch {
    return "Eso no parece una dirección web.";
  }
  return null;
}

/**
 * El docente y el administrador ven todo el material. El estudiante, el del
 * módulo activo; si el recurso es de una sesión concreta, solo cuando esa
 * sesión está publicada, porque antes no sabría de dónde sale; y solo si es
 * accesible: un audio o un video sin su transcripción no se publica (CU10).
 */
export function puedeVerRecurso(
  rol: "ESTUDIANTE" | "DOCENTE" | "ADMIN",
  recurso: { casoActivo: boolean; sesionPublicada: boolean | null; accesible: boolean }
): boolean {
  if (rol !== "ESTUDIANTE") return true;
  return recurso.casoActivo && recurso.sesionPublicada !== false && recurso.accesible;
}
