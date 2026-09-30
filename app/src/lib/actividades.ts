/**
 * Los formatos que la guía del CNMH repite a lo largo de los ejes y que no
 * tenían pantalla propia: Me ubico, Dilema, A investigar, Testimonios y
 * Compromiso. Todos se responden con un texto del estudiante; algunos piden
 * además algo más (una opción, unas fuentes) que va en `datos`.
 *
 * Dos de ellos los plantea cada docente para sus estudiantes: las opciones del
 * dilema y la pregunta de la investigación. La guía para maestros lo pide así
 * en 3.1: donde el territorio sigue en disputa, conviene centrarse solo en
 * las acciones no violentas, y eso lo decide quien conoce al grupo.
 */

export const GUIADAS = ["meubico", "dilema", "investigar", "testimonios", "compromiso"] as const;
export type Guiada = (typeof GUIADAS)[number];

export const esGuiada = (pantalla: string): pantalla is Guiada => (GUIADAS as readonly string[]).includes(pantalla);

/** Lo que el docente puede plantear en cada formato. */
export const SE_PLANTEA: Record<Guiada, boolean> = {
  meubico: false,
  dilema: true,
  investigar: true,
  testimonios: false,
  compromiso: false,
};

export const LIMITES_GUIADA = {
  preguntaMinima: 10,
  preguntaMaxima: 400,
  opcionMinima: 2,
  opcionMaxima: 160,
  opcionesMinimas: 2,
  opcionesMaximas: 4,
  fuenteMaxima: 300,
  fuentesMaximas: 10,
  respuestaMaxima: 4000,
};

/** Extensión mínima de la respuesta, según lo que pide cada formato. */
export const MINIMO_RESPUESTA: Record<Guiada, number> = {
  meubico: 40,
  dilema: 60,
  investigar: 120,
  testimonios: 60,
  compromiso: 30,
};

// --------------------------------------------------------------- Planteamiento

export type PlanteamientoDilema = { pregunta: string; opciones: string[] };
export type PlanteamientoInvestigacion = { pregunta: string };

const limpiar = (t: unknown) => String(t ?? "").trim().replace(/\s+/g, " ");

export function validarPlanteamiento(
  tipo: Guiada,
  entrada: { pregunta?: unknown; opciones?: unknown }
): { datos: PlanteamientoDilema | PlanteamientoInvestigacion } | { error: string } {
  if (!SE_PLANTEA[tipo]) return { error: "Esta actividad no se plantea." };
  const pregunta = limpiar(entrada.pregunta);
  if (pregunta.length < LIMITES_GUIADA.preguntaMinima) {
    return { error: tipo === "dilema" ? "Escribe el dilema que vas a plantear." : "Escribe la pregunta que van a investigar." };
  }
  if (pregunta.length > LIMITES_GUIADA.preguntaMaxima) return { error: "La pregunta es demasiado larga." };
  if (tipo === "investigar") return { datos: { pregunta } };

  const opciones = (Array.isArray(entrada.opciones) ? entrada.opciones : []).map(limpiar).filter(Boolean);
  if (opciones.length < LIMITES_GUIADA.opcionesMinimas) return { error: "Un dilema necesita al menos dos opciones." };
  if (opciones.length > LIMITES_GUIADA.opcionesMaximas) return { error: `Como mucho ${LIMITES_GUIADA.opcionesMaximas} opciones.` };
  if (opciones.some((o) => o.length < LIMITES_GUIADA.opcionMinima || o.length > LIMITES_GUIADA.opcionMaxima)) {
    return { error: `Cada opción debe tener entre ${LIMITES_GUIADA.opcionMinima} y ${LIMITES_GUIADA.opcionMaxima} caracteres.` };
  }
  if (new Set(opciones.map((o) => o.toLowerCase())).size !== opciones.length) return { error: "Hay dos opciones iguales." };
  return { datos: { pregunta, opciones } };
}

export function leerDilema(datos: unknown): PlanteamientoDilema | null {
  const d = datos as Partial<PlanteamientoDilema> | null;
  if (!d || typeof d.pregunta !== "string" || !Array.isArray(d.opciones)) return null;
  return { pregunta: d.pregunta, opciones: d.opciones.filter((o): o is string => typeof o === "string") };
}

export function leerInvestigacion(datos: unknown): PlanteamientoInvestigacion | null {
  const d = datos as Partial<PlanteamientoInvestigacion> | null;
  return d && typeof d.pregunta === "string" ? { pregunta: d.pregunta } : null;
}

// ------------------------------------------------------------------ Respuesta

export type DatosGuiada = { opcion?: string; fuentes?: string[]; compartido?: boolean };

/**
 * Revisa la respuesta del estudiante y devuelve los datos que se guardan, ya
 * limpios. En el dilema se guarda el texto de la opción, no su posición: si el
 * docente cambia después el planteamiento, la respuesta sigue diciendo qué
 * eligió.
 */
export function validarRespuestaGuiada(
  tipo: Guiada,
  entrada: { texto: string; datos?: unknown },
  dilema: PlanteamientoDilema | null
): { datos: DatosGuiada } | { error: string } {
  const texto = entrada.texto.trim();
  const d = (entrada.datos && typeof entrada.datos === "object" ? entrada.datos : {}) as Record<string, unknown>;

  if (tipo === "dilema") {
    if (!dilema) return { error: "Tu docente todavía no ha planteado este dilema." };
    if (typeof d.opcion !== "string" || !dilema.opciones.includes(d.opcion)) return { error: "Elige una de las opciones." };
  }

  const minimo = MINIMO_RESPUESTA[tipo];
  if (texto.length < minimo) {
    const que: Record<Guiada, string> = {
      meubico: "Escribe tu reflexión",
      dilema: "Justifica tu elección",
      investigar: "Cuenta lo que encontraste",
      testimonios: "Escribe lo que te dejaron los testimonios",
      compromiso: "Escribe tu compromiso",
    };
    return { error: `${que[tipo]} (al menos ${minimo} caracteres).` };
  }
  if (texto.length > LIMITES_GUIADA.respuestaMaxima) return { error: "La respuesta es demasiado larga." };

  switch (tipo) {
    case "dilema":
      return { datos: { opcion: d.opcion as string } };
    case "investigar": {
      const fuentes = (Array.isArray(d.fuentes) ? d.fuentes : []).map(limpiar).filter(Boolean);
      if (!fuentes.length) return { error: "Anota al menos una fuente: un libro, una página, una entrevista." };
      if (fuentes.length > LIMITES_GUIADA.fuentesMaximas) return { error: `Como mucho ${LIMITES_GUIADA.fuentesMaximas} fuentes.` };
      if (fuentes.some((f) => f.length > LIMITES_GUIADA.fuenteMaxima)) return { error: "Alguna fuente es demasiado larga." };
      return { datos: { fuentes } };
    }
    case "compromiso":
      return { datos: { compartido: d.compartido === true } };
    default:
      return { datos: {} };
  }
}

export function leerDatosGuiada(datos: unknown): DatosGuiada {
  const d = (datos && typeof datos === "object" ? datos : {}) as Record<string, unknown>;
  return {
    opcion: typeof d.opcion === "string" ? d.opcion : undefined,
    fuentes: Array.isArray(d.fuentes) ? d.fuentes.filter((f): f is string => typeof f === "string") : undefined,
    compartido: d.compartido === true,
  };
}

/** Cuántos eligieron cada opción; las opciones sin votos también aparecen. */
export function repartoDeOpciones(opciones: string[], elegidas: string[]): { opcion: string; cuantos: number }[] {
  return opciones.map((opcion) => ({ opcion, cuantos: elegidas.filter((e) => e === opcion).length }));
}
