/**
 * El mapa ilustrado del viaje: los ejes como estaciones de un camino que
 * atraviesa los Montes de María, como el «Mapa de viaje» de la cartilla.
 *
 * Las docentes que probaron la plataforma no entendían cómo interactuar con el
 * mapa. Aquí el camino muestra hasta dónde ha llegado el estudiante, el
 * explorador marca por dónde sigue y cada estación se toca para ver sus
 * sesiones al lado, sin que aparezcan fuera de la vista.
 *
 * Lógica pura: coordenadas en el espacio del dibujo (viewBox) y estados.
 */

export type Punto = { x: number; y: number };
export type Orientacion = "horizontal" | "vertical";

/** Tamaño del dibujo. Las estaciones se ubican en porcentajes de él. */
export const LIENZO = {
  horizontal: { ancho: 1000, alto: 500 },
  /** En el celular el camino baja: cada estación ocupa este alto. */
  vertical: { ancho: 400, altoPorEstacion: 150, margen: 115 },
} as const;

/** Alto del dibujo vertical para `n` estaciones. */
export function altoVertical(n: number) {
  return LIENZO.vertical.margen * 2 + Math.max(0, n - 1) * LIENZO.vertical.altoPorEstacion;
}

/**
 * Dónde va cada estación. En horizontal el camino serpentea de izquierda a
 * derecha entre las colinas; en vertical baja en zigzag.
 */
export function posicionesDeEstaciones(n: number, orientacion: Orientacion): Punto[] {
  if (n <= 0) return [];
  if (orientacion === "horizontal") {
    const { ancho, alto } = LIENZO.horizontal;
    // Margen para que la etiqueta de la primera y la última estación no se corte.
    const margen = 115;
    const paso = n === 1 ? 0 : (ancho - margen * 2) / (n - 1);
    return Array.from({ length: n }, (_, i) => ({
      x: n === 1 ? ancho / 2 : margen + paso * i,
      // Arriba y abajo, alternando, para que el camino suba y baje las colinas.
      y: i % 2 === 0 ? alto * 0.68 : alto * 0.36,
    }));
  }
  const { ancho, altoPorEstacion, margen } = LIENZO.vertical;
  return Array.from({ length: n }, (_, i) => ({
    x: i % 2 === 0 ? ancho * 0.3 : ancho * 0.7,
    y: margen + altoPorEstacion * i,
  }));
}

/**
 * El camino que une las estaciones, con curvas suaves. Devuelve el atributo
 * `d` de un <path>; vacío si hay menos de dos puntos.
 */
export function trazoEntre(puntos: Punto[], orientacion: Orientacion): string {
  if (puntos.length < 2) return "";
  const r = (v: number) => Math.round(v * 10) / 10;
  let d = `M${r(puntos[0].x)} ${r(puntos[0].y)}`;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1];
    const b = puntos[i];
    // Las tangentes van en el sentido del viaje, así el camino no hace bucles.
    const [c1, c2] =
      orientacion === "horizontal"
        ? [{ x: a.x + (b.x - a.x) / 2, y: a.y }, { x: a.x + (b.x - a.x) / 2, y: b.y }]
        : [{ x: a.x, y: a.y + (b.y - a.y) / 2 }, { x: b.x, y: a.y + (b.y - a.y) / 2 }];
    d += ` C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(b.x)} ${r(b.y)}`;
  }
  return d;
}

export type EstadoEstacion = "CERRADO" | "COMPLETO" | "EN CURSO" | "SIN INICIAR";

/** En qué va el estudiante en un eje. */
export function estadoDeEstacion(eje: { bloqueo: string | null; progreso: number }): EstadoEstacion {
  if (eje.bloqueo) return "CERRADO";
  if (eje.progreso >= 100) return "COMPLETO";
  if (eje.progreso > 0) return "EN CURSO";
  return "SIN INICIAR";
}

/**
 * La estación donde está el explorador: la del eje por donde sigue el viaje.
 * Si ya hizo todo lo publicado, la última que completó; si aún no empieza, la
 * primera.
 */
export function estacionDelExplorador(
  ejes: { id: string; progreso: number }[],
  siguienteEjeId: string | null
): number {
  if (!ejes.length) return -1;
  const i = siguienteEjeId ? ejes.findIndex((e) => e.id === siguienteEjeId) : -1;
  if (i >= 0) return i;
  for (let j = ejes.length - 1; j >= 0; j--) if (ejes[j].progreso > 0) return j;
  return 0;
}

/**
 * Un nombre que cabe bajo la estación: hasta los dos puntos o el signo de
 * pregunta, y como mucho `max` caracteres, cortando en una palabra.
 */
export function nombreCorto(nombre: string, max = 34): string {
  const limpio = nombre.replace(/\s+/g, " ").trim();
  const cierre = limpio.indexOf("?");
  const base = (cierre >= 0 ? limpio.slice(0, cierre + 1) : limpio.split(":")[0]).trim();
  if (base.length <= max) return base;
  const corte = base.slice(0, max + 1).lastIndexOf(" ");
  return `${base.slice(0, corte > 0 ? corte : max).replace(/[,;.]$/, "")}…`;
}

/** Con las flechas del teclado, a qué estación se pasa (se da la vuelta en los extremos). */
export function estacionVecina(actual: number, total: number, tecla: string): number | null {
  if (total <= 0) return null;
  switch (tecla) {
    case "ArrowRight":
    case "ArrowDown":
      return (actual + 1) % total;
    case "ArrowLeft":
    case "ArrowUp":
      return (actual - 1 + total) % total;
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return null;
  }
}
