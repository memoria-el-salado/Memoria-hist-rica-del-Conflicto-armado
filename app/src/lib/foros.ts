/**
 * Reglas de los debates (CU08).
 *
 * La guía para maestros plantea la sesión 1.3 como un contraste de fuentes: los
 * estudiantes asumen uno de dos roles —por ejemplo, defensores de la Reforma
 * Agraria frente al modelo productivista— y construyen argumentos apoyados en
 * documentos históricos. De ahí salen las reglas: un argumento se sostiene en
 * una fuente, los bandos se equilibran y el docente media sin tomar partido.
 */

export type Postura = "A" | "B";

export const LIMITES = {
  /** Un argumento se desarrolla; una respuesta puede ser breve. */
  argumentoMinimo: 40,
  maximo: 2000,
  fuenteMinima: 4,
};

export type MensajePropuesto = {
  texto: string;
  fuente?: string | null;
  /** Responde a otro mensaje en vez de abrir un hilo. */
  esRespuesta: boolean;
  /** El docente media: no argumenta desde un bando. */
  esDocente: boolean;
};

/** Devuelve por qué no se puede publicar el mensaje, o `null` si vale. */
export function validarMensaje(m: MensajePropuesto): string | null {
  const texto = m.texto.trim();
  if (!texto) return "Escribe tu mensaje.";
  if (texto.length > LIMITES.maximo) return `El mensaje supera los ${LIMITES.maximo} caracteres.`;

  const esArgumento = !m.esRespuesta && !m.esDocente;
  if (!esArgumento) return null;

  if (texto.length < LIMITES.argumentoMinimo) {
    return `Desarrolla tu argumento: escribe al menos ${LIMITES.argumentoMinimo} caracteres.`;
  }
  if ((m.fuente ?? "").trim().length < LIMITES.fuenteMinima) {
    return "Indica la fuente en la que se apoya tu argumento.";
  }
  return null;
}

/** Bando que le toca a quien entra sin rol: el que tiene menos gente. */
export function posturaParaNuevo(asignadas: Postura[]): Postura {
  const a = asignadas.filter((p) => p === "A").length;
  return a <= asignadas.length - a ? "A" : "B";
}

/**
 * Reparte a los estudiantes que aún no tienen rol, sin mover a quien ya lo
 * tiene y dejando los dos bandos tan parejos como se pueda.
 */
export function repartirPosturas(
  estudiantes: string[],
  existentes: ReadonlyMap<string, Postura>
): Map<string, Postura> {
  const reparto = new Map<string, Postura>();
  const actuales = estudiantes.filter((e) => existentes.has(e)).map((e) => existentes.get(e)!);

  for (const id of estudiantes) {
    if (existentes.has(id)) continue;
    const postura = posturaParaNuevo([...actuales, ...reparto.values()]);
    reparto.set(id, postura);
  }
  return reparto;
}

type Encadenable = { id: string; respuestaAId: string | null; creadoEn: Date };

/**
 * Agrupa los mensajes en hilos: cada argumento con sus respuestas debajo.
 * Una respuesta a otra respuesta se queda en el hilo de su argumento, para que
 * la conversación no se hunda en niveles. Todo va en orden de publicación.
 */
export function armarHilos<T extends Encadenable>(mensajes: T[]): (T & { respuestas: T[] })[] {
  const porId = new Map(mensajes.map((m) => [m.id, m]));

  const raiz = (m: T): T => {
    let actual = m;
    const vistos = new Set<string>();
    while (actual.respuestaAId && porId.has(actual.respuestaAId) && !vistos.has(actual.id)) {
      vistos.add(actual.id);
      actual = porId.get(actual.respuestaAId)!;
    }
    return actual;
  };

  const orden = (x: T, y: T) => x.creadoEn.getTime() - y.creadoEn.getTime();
  const hilos = new Map<string, T & { respuestas: T[] }>();

  for (const m of [...mensajes].sort(orden)) {
    const r = raiz(m);
    if (r.id === m.id) {
      hilos.set(m.id, { ...m, respuestas: hilos.get(m.id)?.respuestas ?? [] });
    } else {
      const hilo = hilos.get(r.id) ?? { ...r, respuestas: [] };
      hilo.respuestas.push(m);
      hilos.set(r.id, hilo);
    }
  }

  return [...hilos.values()].sort(orden);
}

export type Quien = {
  rol: "ESTUDIANTE" | "DOCENTE" | "ADMIN";
  id: string;
  creadoPorId: string | null;
  cursoId?: string | null;
};

type ForoVisible = { autorId: string | null; cursoId?: string | null };

/**
 * El foro es de su docente y lo ven sus estudiantes: la misma cadena de
 * responsabilidad con la que se crean las cuentas. Si el docente lo abrió para
 * un curso, solo lo ven los estudiantes de ese curso.
 */
export function puedeVerForo(quien: Quien, foro: ForoVisible): boolean {
  if (!foro.autorId) return false;
  if (quien.rol === "DOCENTE") return foro.autorId === quien.id;
  if (quien.rol === "ESTUDIANTE") {
    return foro.autorId === quien.creadoPorId && (!foro.cursoId || foro.cursoId === quien.cursoId);
  }
  return false;
}

/** Un foro cerrado se puede leer, pero ya no admite mensajes de estudiantes. */
export function puedeEscribir(quien: Quien, foro: ForoVisible & { abierto: boolean }): boolean {
  if (!puedeVerForo(quien, foro)) return false;
  return quien.rol === "DOCENTE" || foro.abierto;
}
