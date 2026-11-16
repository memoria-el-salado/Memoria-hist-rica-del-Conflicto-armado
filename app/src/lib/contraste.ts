/**
 * Contraste de color según las WCAG 2.1.
 *
 * Cada eje y cada flor del jardín tiene su color, y encima va texto blanco: el
 * número del eje, la etiqueta «EJE 2». Algunos de esos colores (el amarillo de
 * la paleta, el gris) no dejan leer el blanco, así que se oscurecen lo justo
 * para llegar al contraste 4.5:1 que piden las WCAG para el texto (AA).
 */

function canales(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminancia([r, g, b]: [number, number, number]) {
  const lineal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

/** Razón de contraste entre dos colores, de 1 a 21. */
export function contraste(a: string, b: string): number {
  const ca = canales(a);
  const cb = canales(b);
  if (!ca || !cb) return 1;
  const [l1, l2] = [luminancia(ca), luminancia(cb)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * El mismo color, oscurecido lo necesario para que el texto blanco encima se
 * lea con un contraste de al menos `minimo`. Un color que ya cumple no cambia;
 * uno que no se entiende se deja como está.
 */
export function fondoParaTextoBlanco(hex: string, minimo = 4.5): string {
  const c = canales(hex);
  if (!c) return hex;
  for (let k = 1; k > 0; k -= 0.02) {
    const oscuro = `#${c.map((v) => Math.round(v * k).toString(16).padStart(2, "0")).join("")}`;
    if (contraste(oscuro, "#ffffff") >= minimo) return k === 1 ? hex : oscuro;
  }
  return "#000000";
}

/**
 * Un color de gráfica usado como texto sobre blanco: se oscurece igual, porque
 * leerse sobre blanco y dejar leer el blanco encima piden el mismo contraste.
 */
export const textoSobreBlanco = fondoParaTextoBlanco;
