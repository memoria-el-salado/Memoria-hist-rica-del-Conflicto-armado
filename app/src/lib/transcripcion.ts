/**
 * Transcripciones de los audios y videos (CU10).
 *
 * El documento de avance exige que todos los audios de testimonios tengan
 * transcripción sincronizada para las personas con discapacidad auditiva. La
 * norma que lo concreta es WCAG 2.1:
 *
 * - 1.2.1 · Un audio pregrabado necesita una alternativa en texto. Basta la
 *   transcripción; si trae tiempos, se resalta la línea que va sonando.
 * - 1.2.2 · Un video pregrabado necesita subtítulos sincronizados.
 *
 * Un docente no tiene por qué saber qué es WebVTT, así que se aceptan tres
 * formas: un archivo WebVTT, líneas con su minuto (`0:07 El tabaco se secaba`)
 * o texto corrido sin tiempos.
 */

export type Cue = { inicio: number; fin: number; texto: string };

export type Transcripcion = {
  /** Trae tiempos: se puede mostrar como subtítulos y seguir la lectura. */
  sincronizada: boolean;
  cues: Cue[];
  /** Todo el texto seguido, para leerlo sin reproducir. */
  texto: string;
};

export const MAXIMO_TRANSCRIPCION = 50_000;

/** `1:02`, `01:02.5`, `00:01:02.500` → segundos. */
function segundos(marca: string): number | null {
  const m = marca.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const [, h, min, s, ms] = m;
  if (Number(s) >= 60 || (h && Number(min) >= 60)) return null;
  return Number(h ?? 0) * 3600 + Number(min) * 60 + Number(s) + (ms ? Number(ms.padEnd(3, "0")) / 1000 : 0);
}

/** Duración razonable de la última línea: el tiempo de leerla, con mínimo. */
function duracionDeLectura(texto: string): number {
  return Math.max(3, Math.round(texto.split(/\s+/).length / 2.5));
}

function leerWebVtt(lineas: string[]): { cues?: Cue[]; error?: string } {
  const cues: Cue[] = [];
  let i = 1; // la primera línea es la cabecera WEBVTT
  while (i < lineas.length) {
    // Bloques separados por líneas en blanco. NOTE, STYLE y REGION no son subtítulos.
    while (i < lineas.length && !lineas[i].trim()) i++;
    if (i >= lineas.length) break;
    if (/^(NOTE|STYLE|REGION)\b/.test(lineas[i])) {
      while (i < lineas.length && lineas[i].trim()) i++;
      continue;
    }
    // Un identificador opcional antes de la línea de tiempos.
    if (!lineas[i].includes("-->")) i++;
    const tiempos = lineas[i]?.match(/^\s*(\S+)\s+-->\s+(\S+)/);
    if (!tiempos) return { error: `Línea ${i + 1}: falta la marca de tiempos (00:00:01.000 --> 00:00:04.000).` };
    const inicio = segundos(tiempos[1]);
    const fin = segundos(tiempos[2]);
    if (inicio === null || fin === null) return { error: `Línea ${i + 1}: los tiempos no se entienden.` };
    if (fin <= inicio) return { error: `Línea ${i + 1}: el subtítulo termina antes de empezar.` };
    i++;
    const texto: string[] = [];
    while (i < lineas.length && lineas[i].trim()) texto.push(lineas[i++].trim());
    if (texto.length) cues.push({ inicio, fin, texto: texto.join(" ") });
  }
  if (!cues.length) return { error: "El archivo WebVTT no trae ningún subtítulo." };
  return { cues: cues.sort((a, b) => a.inicio - b.inicio) };
}

const LINEA_CON_TIEMPO = /^\s*\[?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\]?\s*[-–—:]?\s*(.+)$/;

/**
 * Lee lo que el docente escribió o subió. Devuelve la transcripción o por qué
 * no se entiende.
 */
export function leerTranscripcion(entrada: string): { transcripcion?: Transcripcion; error?: string } {
  const limpio = entrada.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim();
  if (!limpio) return { error: "Escribe o sube la transcripción." };
  if (limpio.length > MAXIMO_TRANSCRIPCION) return { error: "La transcripción es demasiado larga." };

  const lineas = limpio.split("\n");

  if (/^WEBVTT\b/.test(lineas[0])) {
    const { cues, error } = leerWebVtt(lineas);
    if (error) return { error };
    return { transcripcion: { sincronizada: true, cues: cues!, texto: cues!.map((c) => c.texto).join("\n") } };
  }

  // Líneas con su minuto. Si la primera no lo trae, se entiende como texto corrido.
  if (LINEA_CON_TIEMPO.test(lineas[0]) && segundos(lineas[0].match(LINEA_CON_TIEMPO)![1]) !== null) {
    const cues: Cue[] = [];
    for (const linea of lineas) {
      if (!linea.trim()) continue;
      const m = linea.match(LINEA_CON_TIEMPO);
      const inicio = m ? segundos(m[1]) : null;
      if (m && inicio !== null) {
        cues.push({ inicio, fin: 0, texto: m[2].trim() });
      } else {
        // Una línea sin tiempo continúa la anterior.
        cues[cues.length - 1].texto += ` ${linea.trim()}`;
      }
    }
    for (let k = 1; k < cues.length; k++) {
      if (cues[k].inicio < cues[k - 1].inicio) {
        return { error: `El tiempo ${formatoCorto(cues[k].inicio)} va antes que el de la línea anterior.` };
      }
    }
    cues.forEach((c, k) => {
      c.fin = k + 1 < cues.length ? cues[k + 1].inicio : c.inicio + duracionDeLectura(c.texto);
      if (c.fin <= c.inicio) c.fin = c.inicio + 1;
    });
    return { transcripcion: { sincronizada: true, cues, texto: cues.map((c) => c.texto).join("\n") } };
  }

  return { transcripcion: { sincronizada: false, cues: [], texto: limpio } };
}

function formatoCorto(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function formatoVtt(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(h)}:${dos(m)}:${dos(seg)}.${String(ms).padStart(3, "0")}`;
}

/** WebVTT listo para una pista `<track>` del reproductor. */
export function aWebVtt(cues: Cue[]): string {
  return `WEBVTT\n\n${cues.map((c) => `${formatoVtt(c.inicio)} --> ${formatoVtt(c.fin)}\n${c.texto}`).join("\n\n")}\n`;
}

/** Forma en que se guarda: WebVTT si trae tiempos; si no, el texto tal cual. */
export function serializar(t: Transcripcion): string {
  return t.sincronizada ? aWebVtt(t.cues) : t.texto;
}

/** Qué pide cada recurso para ser accesible. */
export type Requisito = "sincronizada" | "texto" | "ninguno";

export function requisitoDe(tipo: string, esEnlace: boolean): Requisito {
  if (tipo === "VIDEO") return esEnlace ? "texto" : "sincronizada";
  if (tipo === "AUDIO") return "texto";
  return "ninguno";
}

export function cumple(requisito: Requisito, t: Transcripcion | null): boolean {
  if (requisito === "ninguno") return true;
  if (!t) return false;
  return requisito === "texto" || t.sincronizada;
}

/**
 * Estado de accesibilidad de un recurso, calculado a partir de sus datos: es lo
 * que muestra la auditoría del administrador y lo que decide si el estudiante
 * lo ve. Un audio o un video sin la transcripción que le corresponde no se
 * publica.
 */
export function estadoAccesibilidad(recurso: {
  tipo: string;
  enlace: string | null;
  contexto: string;
  transcripcion: string | null;
}) {
  const requisito = requisitoDe(recurso.tipo, Boolean(recurso.enlace));
  const leida = recurso.transcripcion ? leerTranscripcion(recurso.transcripcion).transcripcion ?? null : null;
  const alternativa = cumple(requisito, leida);

  let pendiente: string | null = null;
  if (!alternativa) {
    pendiente =
      requisito === "sincronizada"
        ? leida
          ? "Los subtítulos necesitan tiempos: el video debe poder leerse mientras se ve."
          : "Falta la transcripción con tiempos (subtítulos)."
        : "Falta la transcripción.";
  }

  return {
    requisito,
    alternativa,
    sincronizada: leida?.sincronizada ?? false,
    /** Una imagen se describe con su contexto: que no sea una palabra suelta. */
    descripcion: recurso.tipo !== "IMAGEN" || recurso.contexto.trim().length >= 15,
    pendiente,
    visibleParaEstudiantes: alternativa,
  };
}
