/**
 * El plano de la finca «La Esperanza» (mockup de la página 13 del avance): las
 * 200 hectáreas del simulador divididas en lotes que el estudiante asigna a
 * las familias. Las reglas de equidad siguen siendo las de `simulador.ts`; aquí
 * solo se traduce lote a hectáreas y se calcula el riesgo que muestra el
 * mockup.
 *
 * El plano es una rejilla de 8 × 5 celdas de 5 ha: cada lote ocupa tantas
 * celdas como hectáreas tiene, divididas por cinco. Hay 20 lotes, uno por
 * familia si se quiere, pero de tamaños distintos: la discusión es a quién le
 * toca cuál, y si conviene dar dos lotes a una familia grande.
 */

import {
  calcularTotales,
  HECTAREAS_MAX_POR_FAMILIA,
  HECTAREAS_TOTALES,
  PRESUPUESTO_TOTAL,
  type Asignacion,
  type Familia,
  type Subsidio,
} from "./simulador";

export type Lote = { id: string; hectareas: number; col: number; ancho: number; fila: number; alto: number };

export const COLUMNAS_PLANO = 8;
export const FILAS_PLANO = 5;

export const LOTES: Lote[] = [
  { id: "L01", hectareas: 20, col: 1, ancho: 2, fila: 1, alto: 2 },
  { id: "L02", hectareas: 20, col: 3, ancho: 2, fila: 1, alto: 2 },
  { id: "L03", hectareas: 15, col: 5, ancho: 3, fila: 1, alto: 1 },
  { id: "L04", hectareas: 15, col: 5, ancho: 3, fila: 2, alto: 1 },
  { id: "L05", hectareas: 5, col: 8, ancho: 1, fila: 1, alto: 1 },
  { id: "L06", hectareas: 5, col: 8, ancho: 1, fila: 2, alto: 1 },
  { id: "L07", hectareas: 10, col: 1, ancho: 2, fila: 3, alto: 1 },
  { id: "L08", hectareas: 10, col: 3, ancho: 2, fila: 3, alto: 1 },
  { id: "L09", hectareas: 10, col: 5, ancho: 2, fila: 3, alto: 1 },
  { id: "L10", hectareas: 10, col: 7, ancho: 2, fila: 3, alto: 1 },
  { id: "L11", hectareas: 10, col: 1, ancho: 2, fila: 4, alto: 1 },
  { id: "L12", hectareas: 10, col: 3, ancho: 2, fila: 4, alto: 1 },
  { id: "L13", hectareas: 10, col: 5, ancho: 2, fila: 4, alto: 1 },
  { id: "L14", hectareas: 10, col: 7, ancho: 2, fila: 4, alto: 1 },
  { id: "L15", hectareas: 10, col: 1, ancho: 2, fila: 5, alto: 1 },
  { id: "L16", hectareas: 10, col: 3, ancho: 2, fila: 5, alto: 1 },
  { id: "L17", hectareas: 5, col: 5, ancho: 1, fila: 5, alto: 1 },
  { id: "L18", hectareas: 5, col: 6, ancho: 1, fila: 5, alto: 1 },
  { id: "L19", hectareas: 5, col: 7, ancho: 1, fila: 5, alto: 1 },
  { id: "L20", hectareas: 5, col: 8, ancho: 1, fila: 5, alto: 1 },
];

const HECTAREAS_LOTE = new Map(LOTES.map((l) => [l.id, l.hectareas]));

/** Lo que el estudiante decidió para cada familia: sus lotes y su subsidio. */
export type Reparto = Record<string, { lotes: string[]; subsidio: Subsidio }>;

export function hectareasDe(lotes: string[]): number {
  return lotes.reduce((s, l) => s + (HECTAREAS_LOTE.get(l) ?? 0), 0);
}

/** Quién tiene cada lote. */
export function duenoDe(reparto: Reparto): Map<string, string> {
  const duenos = new Map<string, string>();
  for (const [familia, r] of Object.entries(reparto)) for (const l of r.lotes) duenos.set(l, familia);
  return duenos;
}

/**
 * Da un lote a una familia (o lo deja libre con `null`). Si otra familia lo
 * tenía, lo pierde. No deja pasar del tope de hectáreas por familia.
 */
export function asignarLote(reparto: Reparto, loteId: string, familiaId: string | null): { reparto: Reparto } | { error: string } {
  if (!HECTAREAS_LOTE.has(loteId)) return { error: "Ese lote no existe." };
  const nuevo: Reparto = Object.fromEntries(
    Object.entries(reparto).map(([f, r]) => [f, { ...r, lotes: r.lotes.filter((l) => l !== loteId) }])
  );
  if (familiaId) {
    const actual = nuevo[familiaId] ?? { lotes: [], subsidio: "NINGUNO" as Subsidio };
    const total = hectareasDe(actual.lotes) + HECTAREAS_LOTE.get(loteId)!;
    if (total > HECTAREAS_MAX_POR_FAMILIA) {
      return { error: `Una familia puede recibir hasta ${HECTAREAS_MAX_POR_FAMILIA} ha; con este lote tendría ${total}.` };
    }
    nuevo[familiaId] = { ...actual, lotes: [...actual.lotes, loteId].sort() };
  }
  return { reparto: nuevo };
}

/** Lo que entienden las reglas de `simulador.ts`: hectáreas y subsidio por familia. */
export function aAsignaciones(reparto: Reparto): Record<string, Asignacion> {
  return Object.fromEntries(Object.entries(reparto).map(([f, r]) => [f, { hectareas: hectareasDe(r.lotes), subsidio: r.subsidio }]));
}

/** Comprueba un reparto que llega de fuera: lotes que existen y ninguno repetido. */
export function validarReparto(reparto: Reparto): string | null {
  const vistos = new Set<string>();
  for (const r of Object.values(reparto)) {
    for (const l of r.lotes) {
      if (!HECTAREAS_LOTE.has(l)) return "Hay un lote que no existe.";
      if (vistos.has(l)) return "Un lote no puede ser de dos familias.";
      vistos.add(l);
    }
    if (hectareasDe(r.lotes) > HECTAREAS_MAX_POR_FAMILIA) return `Una familia puede recibir hasta ${HECTAREAS_MAX_POR_FAMILIA} ha.`;
  }
  return null;
}

export type Riesgo = "BAJO" | "MEDIO" | "ALTO";

/**
 * El riesgo del mockup: alto si el reparto no se sostiene (presupuesto o
 * tierra excedidos, o tres o más familias prioritarias sin tierra); medio si
 * queda alguna prioritaria o con enfoque diferencial sin tierra; bajo si no.
 */
export function riesgoDe(familias: Familia[], asignaciones: Record<string, Asignacion>): Riesgo {
  const t = calcularTotales(familias, asignaciones);
  const sinTierra = (f: Familia) => (asignaciones[f.id]?.hectareas ?? 0) === 0;
  const prioritarias = familias.filter((f) => f.prioridad === "ALTA" && sinTierra(f)).length;
  const diferencial = familias.filter((f) => (f.cabezaMujer || f.etnica) && sinTierra(f)).length;
  if (t.gasto > PRESUPUESTO_TOTAL || t.hectareas > HECTAREAS_TOTALES || prioritarias >= 3) return "ALTO";
  if (prioritarias > 0 || diferencial > 0) return "MEDIO";
  return "BAJO";
}

export type EstadoTierra = "SIN_TIERRA" | "POCA" | "SUFICIENTE";
export type EstadoSubsidio = "NINGUNO" | "INSUFICIENTE" | "JUSTO";

/**
 * Lo que dice la tarjeta de cada lote asignado en el mockup («Hectáreas OK»,
 * «Subsidio insuficiente»). Es una referencia para la discusión, no una regla
 * de la ley: unas 2 ha por persona, hasta el tope por familia (las 20 familias
 * suman cerca de 212, un poco más de lo que hay); y quien tiene
 * prioridad alta o enfoque diferencial necesita algún subsidio para trabajar
 * la tierra que recibe.
 */
export function estadoDeFamilia(familia: Familia, asignacion: Asignacion | undefined): { tierra: EstadoTierra; subsidio: EstadoSubsidio; minimo: number } {
  const minimo = Math.min(HECTAREAS_MAX_POR_FAMILIA, familia.personas * 2);
  const hectareas = asignacion?.hectareas ?? 0;
  const tierra: EstadoTierra = hectareas === 0 ? "SIN_TIERRA" : hectareas < minimo ? "POCA" : "SUFICIENTE";
  const necesita = familia.prioridad === "ALTA" || familia.cabezaMujer || familia.etnica;
  const tiene = (asignacion?.subsidio ?? "NINGUNO") !== "NINGUNO";
  const subsidio: EstadoSubsidio = tiene ? "JUSTO" : necesita ? "INSUFICIENTE" : "NINGUNO";
  return { tierra, subsidio, minimo };
}
