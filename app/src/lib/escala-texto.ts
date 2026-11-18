/**
 * El control de tamaño de texto (A / A+ / A++), WCAG 1.4.4.
 *
 * Todo el texto de la interfaz está en `rem`, así que basta con cambiar el
 * tamaño de letra de la raíz (`<html data-escala>`, en globals.css) para que
 * crezca todo a la vez: contenido, menú y cabecera. En «A» la raíz queda en
 * el tamaño del navegador, de modo que quien ya lo agrandó en su sistema
 * también lo ve más grande.
 */
export const ESCALAS = ["1", "1.12", "1.25"] as const;
export type Escala = (typeof ESCALAS)[number];

export const ETIQUETA_ESCALA: Record<Escala, string> = { "1": "A", "1.12": "A+", "1.25": "A++" };

/** Dónde recuerda el navegador la elección, entre visitas. */
export const CLAVE_ESCALA = "memoria.escala-texto";

/** La que sigue al pulsar el botón; después de A++ vuelve a A. */
export function siguienteEscala(actual: Escala): Escala {
  return ESCALAS[(ESCALAS.indexOf(actual) + 1) % ESCALAS.length];
}

/** Lo guardado, si es una escala válida; si no, el tamaño normal. */
export function leerEscala(valor: unknown): Escala {
  return (ESCALAS as readonly unknown[]).includes(valor) ? (valor as Escala) : "1";
}
