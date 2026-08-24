/**
 * Cálculo del avance del estudiante.
 *
 * El avance no se guarda: se deduce del trabajo que la persona ha producido.
 * Guardarlo obligaría a recalcularlo en cada acción y a mantenerlo sincronizado,
 * y bastaría un olvido para que el número dejara de decir la verdad.
 *
 * El reparto tiene dos niveles:
 *
 *   · El docente reparte 100 puntos entre los ejes, según lo que pese cada uno
 *     en su curso. No todos valen lo mismo.
 *   · Dentro de un eje, sus sesiones publicadas se reparten ese peso a partes
 *     iguales. Así, publicar una sesión nueva no exige repesar nada.
 *
 * El módulo es puro para poder verificarlo con pruebas automatizadas.
 */

/** Actividades que puede llevar una sesión, y qué cuenta como haberla hecho. */
export type Actividad = "zona" | "copla" | "cartografia" | "simulador" | "jardin" | "diario";

/** Lo que el estudiante produjo dentro de una sesión. */
export type TrabajoEnSesion = {
  anotaciones: number;
  marcas: number;
  flores: number;
  entradasDiario: number;
  /** La respuesta escrita es única por sesión. */
  respondio: boolean;
  /** La simulación cuenta cuando se validó, no con solo abrirla. */
  simulacionValidada: boolean;
};

export const TRABAJO_VACIO: TrabajoEnSesion = {
  anotaciones: 0,
  marcas: 0,
  flores: 0,
  entradasDiario: 0,
  respondio: false,
  simulacionValidada: false,
};

/**
 * Una sesión está hecha cuando el estudiante dejó en ella lo que su actividad
 * pedía. No se mide el tiempo ni las visitas: se mide lo que produjo.
 */
export function sesionCompletada(actividad: string, trabajo: TrabajoEnSesion): boolean {
  switch (actividad) {
    case "cartografia":
      return trabajo.marcas > 0;
    case "copla":
      return trabajo.respondio;
    case "simulador":
      return trabajo.simulacionValidada;
    case "jardin":
      return trabajo.flores > 0;
    case "diario":
      return trabajo.entradasDiario > 0;
    default:
      // "zona" y cualquier actividad futura se dan por hechas con una anotación.
      return trabajo.anotaciones > 0;
  }
}

export type SesionParaAvance = { publicada: boolean; completada: boolean };

/**
 * Avance dentro de un eje: qué proporción de sus sesiones publicadas están
 * hechas. Las que el docente no ha publicado no cuentan, ni a favor ni en
 * contra: el estudiante no ha podido abrirlas.
 */
export function progresoDeEje(sesiones: SesionParaAvance[]): number {
  const disponibles = sesiones.filter((s) => s.publicada);
  if (disponibles.length === 0) return 0;

  const hechas = disponibles.filter((s) => s.completada).length;
  return Math.round((hechas / disponibles.length) * 100);
}

export type EjeParaAvance = { peso: number; progreso: number };

/**
 * Avance del curso: la suma de cada eje por lo que pesa.
 *
 * Si los pesos no llegan a 100 —porque el docente aún no los repartió— se
 * normaliza sobre lo repartido, para no mostrar un avance artificialmente bajo.
 * Un eje con peso cero no aporta: es material que el docente dejó fuera de la
 * calificación.
 */
export function progresoDelCurso(ejes: EjeParaAvance[]): number {
  const repartido = ejes.reduce((total, e) => total + Math.max(0, e.peso), 0);
  if (repartido === 0) return 0;

  const logrado = ejes.reduce((total, e) => total + Math.max(0, e.peso) * e.progreso, 0);
  return Math.round(logrado / repartido);
}

export const TOTAL_PESO = 100;

export type RevisionPesos = { valida: boolean; suma: number; mensaje: string };

/** Comprueba que el reparto sume exactamente 100. */
export function revisarPesos(pesos: number[]): RevisionPesos {
  const suma = pesos.reduce((total, p) => total + p, 0);

  if (pesos.some((p) => p < 0)) {
    return { valida: false, suma, mensaje: "Ningún eje puede tener un peso negativo." };
  }
  if (suma === TOTAL_PESO) {
    return { valida: true, suma, mensaje: "El reparto suma 100%." };
  }

  const diferencia = TOTAL_PESO - suma;
  return {
    valida: false,
    suma,
    mensaje:
      diferencia > 0
        ? `Faltan ${diferencia} puntos por repartir.`
        : `Te has pasado en ${-diferencia} puntos.`,
  };
}

/**
 * Reparto a partes iguales entre los ejes, como punto de partida. El resto de
 * la división se suma a los primeros, para que el total sea exactamente 100.
 */
export function repartirEquitativo(cantidad: number): number[] {
  if (cantidad <= 0) return [];

  const base = Math.floor(TOTAL_PESO / cantidad);
  const resto = TOTAL_PESO - base * cantidad;

  return Array.from({ length: cantidad }, (_, i) => base + (i < resto ? 1 : 0));
}
