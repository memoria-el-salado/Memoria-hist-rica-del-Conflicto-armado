/**
 * El recorrido del mapa. Por defecto es libre: el estudiante abre cualquier
 * sesión publicada, como hasta ahora. El docente puede pedir, para su curso,
 * que los ejes se abran en orden: cada eje se abre cuando el anterior llega al
 * avance que él fije, o cuando él mismo lo abre.
 */

export const RECORRIDOS = ["LIBRE", "EN_ORDEN"] as const;
export type Recorrido = (typeof RECORRIDOS)[number];

export const UMBRALES = [50, 60, 75, 100];
export const UMBRAL_PREDETERMINADO = 60;

type EjeParaDesbloqueo = {
  id: string;
  /** El preámbulo «Me cuido y nos cuidamos» siempre está abierto. */
  esPreambulo: boolean;
  /** Avance del estudiante en el eje, 0 a 100. */
  progreso: number;
  /** Sesiones publicadas del eje: uno sin ninguna no puede bloquear al siguiente. */
  publicadas: number;
};

export type EstadoEje = { id: string; abierto: boolean; motivo: "LIBRE" | "PRIMERO" | "AVANCE" | "DOCENTE" | "BLOQUEADO"; requiereDe: string | null };

/**
 * Qué ejes tiene abiertos un estudiante. `ejes` va en el orden del recorrido.
 * Un eje sin sesiones publicadas no bloquea: se salta al buscar el anterior.
 */
export function estadoDeEjes(
  ejes: EjeParaDesbloqueo[],
  curso: { recorrido: Recorrido; umbral: number; abiertos: string[] } | null
): EstadoEje[] {
  if (!curso || curso.recorrido === "LIBRE") {
    return ejes.map((e) => ({ id: e.id, abierto: true, motivo: "LIBRE", requiereDe: null }));
  }

  const estados: EstadoEje[] = [];
  let anterior: EjeParaDesbloqueo | null = null;
  for (const eje of ejes) {
    if (eje.esPreambulo) {
      estados.push({ id: eje.id, abierto: true, motivo: "PRIMERO", requiereDe: null });
      continue;
    }
    let estado: EstadoEje;
    if (!anterior) estado = { id: eje.id, abierto: true, motivo: "PRIMERO", requiereDe: null };
    else if (curso.abiertos.includes(eje.id)) estado = { id: eje.id, abierto: true, motivo: "DOCENTE", requiereDe: null };
    else {
      const previo = estados.find((x) => x.id === anterior!.id)!;
      const llego = previo.abierto && anterior.progreso >= curso.umbral;
      estado = { id: eje.id, abierto: llego, motivo: llego ? "AVANCE" : "BLOQUEADO", requiereDe: llego ? null : anterior.id };
    }
    estados.push(estado);
    if (eje.publicadas > 0) anterior = eje;
  }
  return estados;
}

export function validarRecorrido(entrada: { recorrido: unknown; umbral: unknown }): { recorrido: Recorrido; umbral: number } | null {
  const recorrido = RECORRIDOS.find((r) => r === entrada.recorrido);
  const umbral = Number(entrada.umbral);
  if (!recorrido || !UMBRALES.includes(umbral)) return null;
  return { recorrido, umbral };
}
