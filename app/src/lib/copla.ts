/**
 * Copla interactiva (sesión 1.2.1, «Tierra de abundancia»).
 *
 * La guía pide escuchar y leer la copla y, «de acuerdo con las referencias de
 * la copla», ubicar en el mapa de los Montes de María las actividades
 * económicas y los productos de cada lugar; después, explicar por qué a la
 * región se le llama «la despensa del Caribe». No trae una clave de
 * respuestas: la puesta en común se hace en plenaria. Por eso aquí no se
 * califica cada ubicación; al guardar, el estudiante ve cómo ubicó su curso
 * cada producto, que es lo que se discute en clase.
 *
 * La letra no está en el código: es la que el administrador importó con la
 * guía, y el audio lo carga el docente como recurso de la sesión.
 */

export type Lugar = {
  id: string;
  nombre: string;
  /** Qué es y dónde queda, cuando no es una cabecera municipal. */
  detalle?: string;
  /** Solo los lugares con coordenadas conocidas se dibujan en el mapa. */
  coordenada?: [number, number];
};

/**
 * Cabeceras de los Montes de María y los lugares que, según la guía para
 * maestros, nombra la copla. La Cansona y Macayepo no tienen coordenadas
 * aquí: van en la lista, con su ubicación administrativa, pero no se dibujan
 * en un punto que podría no ser el suyo.
 */
export const LUGARES: Lugar[] = [
  { id: "carmen", nombre: "El Carmen de Bolívar", coordenada: [9.7174, -75.1202] },
  { id: "salado", nombre: "El Salado", detalle: "Corregimiento de El Carmen de Bolívar", coordenada: [9.62, -75.13] },
  { id: "macayepo", nombre: "Macayepo", detalle: "Corregimiento de El Carmen de Bolívar" },
  { id: "cansona", nombre: "La Cansona", detalle: "Vereda de Caracolí Grande, El Carmen de Bolívar" },
  { id: "jacinto", nombre: "San Jacinto", coordenada: [9.8306, -75.1219] },
  { id: "nepomuceno", nombre: "San Juan Nepomuceno", coordenada: [9.9528, -75.0817] },
  { id: "mariabaja", nombre: "María La Baja", coordenada: [9.9822, -75.3006] },
  { id: "zambrano", nombre: "Zambrano", coordenada: [9.7461, -74.8172] },
  { id: "ovejas", nombre: "Ovejas", coordenada: [9.5264, -75.2269] },
  { id: "chalan", nombre: "Chalán", coordenada: [9.5456, -75.3117] },
  { id: "coloso", nombre: "Colosó", coordenada: [9.4944, -75.3528] },
  { id: "sanonofre", nombre: "San Onofre", coordenada: [9.7361, -75.5262] },
];

/** Productos y oficios de la región, entre ellos los que nombra la copla. */
export const PRODUCTOS = [
  { id: "aguacate", nombre: "Aguacate" },
  { id: "tabaco", nombre: "Tabaco" },
  { id: "name", nombre: "Ñame" },
  { id: "yuca", nombre: "Yuca" },
  { id: "maiz", nombre: "Maíz" },
  { id: "ajonjoli", nombre: "Ajonjolí" },
  { id: "queso", nombre: "Queso costeño" },
  { id: "ganado", nombre: "Ganadería" },
  { id: "hamacas", nombre: "Hamacas y artesanías" },
  { id: "gaitas", nombre: "Gaitas y música" },
  { id: "bocachico", nombre: "Bocachico y pesca" },
  { id: "cafe", nombre: "Café" },
] as const;

export type IdProducto = (typeof PRODUCTOS)[number]["id"];

/** Cuántos productos hay que ubicar para dar la actividad por hecha. */
export const MINIMO_UBICACIONES = 4;

export const LIMITES_COPLA = { respuestaMinima: 40, respuestaMaxima: 3000, versosMaximo: 1200 };

const ID_LUGAR = new Set(LUGARES.map((l) => l.id));
const ID_PRODUCTO = new Set<string>(PRODUCTOS.map((p) => p.id));

/** Se queda solo con pares producto → lugar conocidos; lo demás se ignora. */
export function limpiarUbicaciones(entrada: unknown): Record<string, string> {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) return {};
  const limpio: Record<string, string> = {};
  for (const [producto, lugar] of Object.entries(entrada)) {
    if (ID_PRODUCTO.has(producto) && typeof lugar === "string" && ID_LUGAR.has(lugar)) limpio[producto] = lugar;
  }
  return limpio;
}

/** Los datos guardados de una respuesta de copla, sean cuales sean. */
export function leerDatosCopla(datos: unknown): { ubicaciones: Record<string, string>; versos: string } {
  const d = datos && typeof datos === "object" ? (datos as Record<string, unknown>) : {};
  return { ubicaciones: limpiarUbicaciones(d.ubicaciones), versos: typeof d.versos === "string" ? d.versos : "" };
}

export function validarCopla(entrada: { ubicaciones: Record<string, string>; texto: string; versos: string }): string | null {
  const ubicadas = Object.keys(entrada.ubicaciones).length;
  if (ubicadas < MINIMO_UBICACIONES) {
    return `Ubica al menos ${MINIMO_UBICACIONES} productos en el mapa (llevas ${ubicadas}).`;
  }
  const texto = entrada.texto.trim();
  if (texto.length < LIMITES_COPLA.respuestaMinima) {
    return "Explica con tus palabras por qué a los Montes de María les dicen «la despensa del Caribe».";
  }
  if (texto.length > LIMITES_COPLA.respuestaMaxima) return "La respuesta es demasiado larga.";
  if (entrada.versos.trim().length > LIMITES_COPLA.versosMaximo) return "Los versos son demasiado largos.";
  return null;
}

/** La copla cuenta como hecha con el mapa y la explicación. */
export function coplaCompleta(ubicadas: number, respondio: boolean): boolean {
  return respondio && ubicadas >= MINIMO_UBICACIONES;
}

export type LugarVotado = { lugarId: string; cuantos: number };

/**
 * Cómo ubicó el curso cada producto: para cada uno, los lugares elegidos,
 * del más al menos repetido. Es la base de la puesta en común.
 */
export function resumenDelCurso(respuestas: Record<string, string>[]): Map<string, LugarVotado[]> {
  const conteo = new Map<string, Map<string, number>>();
  for (const ubicaciones of respuestas) {
    for (const [producto, lugar] of Object.entries(ubicaciones)) {
      const porLugar = conteo.get(producto) ?? new Map<string, number>();
      porLugar.set(lugar, (porLugar.get(lugar) ?? 0) + 1);
      conteo.set(producto, porLugar);
    }
  }
  const resumen = new Map<string, LugarVotado[]>();
  for (const [producto, porLugar] of conteo) {
    resumen.set(
      producto,
      [...porLugar].map(([lugarId, cuantos]) => ({ lugarId, cuantos })).sort((a, b) => b.cuantos - a.cuantos || a.lugarId.localeCompare(b.lugarId))
    );
  }
  return resumen;
}
