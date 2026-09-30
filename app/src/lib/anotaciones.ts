/**
 * Anotaciones conversadas sobre el texto de una sesión (mockup de la Ley 135,
 * página 11 del avance): cada anotación puede recibir respuestas en hilo, un
 * «me sirve» de cada lector, y el docente puede destacarla. Los hilos se arman
 * como los del foro (`armarHilos` en foros.ts).
 */

export const LIMITES_ANOTACION = { maximo: 2000 };

export type ModoOrden = "RECIENTES" | "DESTACADOS";

type Hilo = { creadoEn: Date; destacada: boolean; meSirve: number };

/**
 * «Recientes»: todos, lo último arriba. «Destacados»: solo los que el docente
 * destacó, y entre ellos primero los que más sirvieron a los demás.
 */
export function ordenarHilos<T extends Hilo>(hilos: T[], modo: ModoOrden): T[] {
  const porFecha = (a: T, b: T) => b.creadoEn.getTime() - a.creadoEn.getTime();
  if (modo === "RECIENTES") return [...hilos].sort(porFecha);
  return hilos.filter((h) => h.destacada).sort((a, b) => b.meSirve - a.meSirve || porFecha(a, b));
}

export function validarAnotacion(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return "Escribe tu anotación antes de publicar.";
  if (limpio.length > LIMITES_ANOTACION.maximo) return `La anotación no puede pasar de ${LIMITES_ANOTACION.maximo} caracteres.`;
  return null;
}
