/**
 * Las cartillas del CNMH dentro de cada sesión.
 *
 * La tutora del proyecto pidió que en cada tarea estén a la mano los documentos
 * de El Salado con los que se trabaja: la cartilla del estudiante y la guía para
 * maestros. Abrir el PDF en la portada obliga a buscar el apartado a mano, así
 * que cada documento guarda en qué página empieza cada código (1.2, 1.3.4…) y la
 * sesión lo abre directamente ahí.
 *
 * Todo lo de este archivo es lógica pura: recibe el texto de cada página y no
 * toca la base de datos ni el depósito.
 */

/** Dónde está cada apartado dentro de un documento. Se guarda como JSON. */
export type UbicacionesDocumento = {
  /** La página del «Mapa del viaje», el índice que lista todas las sesiones. */
  indice: number | null;
  /** Página (desde 1) en la que se desarrolla cada código. */
  codigos: Record<string, number>;
};

/**
 * Un código de sesión o subsección suelto en el texto: «1.2» o «1.2.1», pero
 * no el «1.2» que hay dentro de «1.2.1» ni el «1.» de «1. IDENTIDAD».
 */
const CODIGO = /(?<![\d.])\d{1,2}\.\d{1,2}(?:\.\d{1,2})?(?!\.?\d)/g;

/** Los códigos distintos que aparecen en una página. */
export function codigosDePagina(texto: string): Set<string> {
  return new Set(texto.match(CODIGO) ?? []);
}

/** Solo los de sesión («1.2»), sin las subsecciones («1.2.1»). */
function sesionesDe(codigos: Set<string>) {
  return [...codigos].filter((c) => c.split(".").length === 2);
}

/**
 * Una página que nombra muchas sesiones es un índice o la portada de un eje:
 * sirve para orientarse, no para leer el apartado.
 */
const MAX_SESIONES_EN_PAGINA_DE_LECTURA = 2;
const MIN_SESIONES_EN_INDICE = 10;

/**
 * Ubica cada código en la primera página que lo desarrolla.
 *
 * Primero se busca una página de lectura (que nombre como mucho dos sesiones);
 * si no la hay, la portada del eje que lo lista. Los códigos que solo aparecen
 * en el índice quedan fuera: el documento no los desarrolla, y para ellos la
 * sesión ofrece el índice con un aviso.
 */
export function ubicarCodigos(paginas: string[]): UbicacionesDocumento {
  const porPagina = paginas.map(codigosDePagina);
  const esIndice = porPagina.map((c) => sesionesDe(c).length >= MIN_SESIONES_EN_INDICE);
  const indice = esIndice.indexOf(true);

  const lectura: Record<string, number> = {};
  const portada: Record<string, number> = {};
  porPagina.forEach((codigos, i) => {
    if (esIndice[i]) return;
    const destino = sesionesDe(codigos).length <= MAX_SESIONES_EN_PAGINA_DE_LECTURA ? lectura : portada;
    for (const c of codigos) destino[c] ??= i + 1;
  });

  const codigos: Record<string, number> = { ...portada };
  for (const [c, p] of Object.entries(lectura)) codigos[c] = p;
  return { indice: indice >= 0 ? indice + 1 : null, codigos };
}

/** Lee lo guardado en la base, que puede faltar o venir de otra versión. */
export function leerUbicaciones(valor: unknown): UbicacionesDocumento | null {
  if (!valor || typeof valor !== "object") return null;
  const v = valor as Record<string, unknown>;
  const codigos: Record<string, number> = {};
  if (v.codigos && typeof v.codigos === "object") {
    for (const [c, p] of Object.entries(v.codigos as Record<string, unknown>)) {
      if (typeof p === "number" && Number.isInteger(p) && p > 0) codigos[c] = p;
    }
  }
  const indice = typeof v.indice === "number" && Number.isInteger(v.indice) && v.indice > 0 ? v.indice : null;
  return { indice, codigos };
}

/**
 * Dónde abrir el documento para una sesión. Si el documento no desarrolla esa
 * sesión, se abre en el índice y `desarrollada` lo dice, para avisar al lector
 * en vez de dejarlo buscando un apartado que no está.
 */
export function paginaDeSesion(
  ubicaciones: UbicacionesDocumento | null,
  codigo: string
): { pagina: number | null; desarrollada: boolean } {
  const pagina = ubicaciones?.codigos[codigo];
  if (pagina) return { pagina, desarrollada: true };
  return { pagina: ubicaciones?.indice ?? null, desarrollada: false };
}

/** La dirección del PDF, abierta en la página indicada. */
export function enlaceDeCartilla(documentoId: string, pagina: number | null) {
  return `/api/documentos/${documentoId}${pagina ? `#page=${pagina}` : ""}`;
}

export type Cartilla = {
  id: string;
  titulo: string;
  soloDocentes: boolean;
  ubicaciones: UbicacionesDocumento | null;
};

export type CartillaDeSesion = {
  id: string;
  titulo: string;
  /** «Cartilla del estudiante» o «Guía para maestros». */
  tipo: string;
  soloDocentes: boolean;
  pagina: number | null;
  desarrollada: boolean;
  enlace: string;
};

/**
 * Las cartillas que ve cada rol en una sesión, abiertas en su apartado. El
 * estudiante no ve la guía para maestros, que trae las respuestas esperadas;
 * el docente ve las dos, la del estudiante primero, que es la que se lee en clase.
 */
export function cartillasDeSesion(
  cartillas: Cartilla[],
  codigo: string,
  rol: "ESTUDIANTE" | "DOCENTE" | "ADMIN"
): CartillaDeSesion[] {
  const unicas = [...new Map(cartillas.map((c) => [c.id, c])).values()];
  return unicas
    .filter((c) => rol !== "ESTUDIANTE" || !c.soloDocentes)
    .sort((a, b) => Number(a.soloDocentes) - Number(b.soloDocentes) || a.titulo.localeCompare(b.titulo, "es"))
    .map((c) => {
      const { pagina, desarrollada } = paginaDeSesion(c.ubicaciones, codigo);
      return {
        id: c.id,
        titulo: c.titulo,
        tipo: c.soloDocentes ? "Guía para maestros" : "Cartilla del estudiante",
        soloDocentes: c.soloDocentes,
        pagina,
        desarrollada,
        enlace: enlaceDeCartilla(c.id, pagina),
      };
    });
}
