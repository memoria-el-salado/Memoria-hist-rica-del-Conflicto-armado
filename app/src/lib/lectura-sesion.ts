/**
 * Arma el texto que el estudiante lee al abrir una sesión.
 *
 * El importador reparte el contenido del documento entre la sesión y sus
 * subsecciones, según dónde estuviera cada párrafo. Una sesión puede no tener
 * texto propio y sin embargo desarrollarse entera en sus subsecciones, así que
 * la lectura se compone de ambas partes; si no, la pantalla diría que no hay
 * contenido teniendo el documento cinco mil caracteres para esa sesión.
 */

export type Subseccion = {
  id: string;
  codigo: string;
  titulo: string;
  contenido: string | null;
};

export type BloqueLectura =
  | { tipo: "parrafo"; id: string; texto: string }
  | { tipo: "subtitulo"; id: string; codigo: string; texto: string };

/** Un párrafo demasiado corto es un resto de maquetación, no contenido. */
const LARGO_MINIMO = 60;

function parrafosDe(texto: string | null): string[] {
  return (texto ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length >= LARGO_MINIMO);
}

export function componerLectura(
  contenido: string | null,
  subsecciones: Subseccion[]
): BloqueLectura[] {
  const bloques: BloqueLectura[] = [];

  for (const [i, texto] of parrafosDe(contenido).entries()) {
    bloques.push({ tipo: "parrafo", id: `s-${i}`, texto });
  }

  for (const sub of subsecciones) {
    const parrafos = parrafosDe(sub.contenido);
    if (parrafos.length === 0) continue;

    bloques.push({ tipo: "subtitulo", id: sub.id, codigo: sub.codigo, texto: sub.titulo });
    for (const [i, texto] of parrafos.entries()) {
      bloques.push({ tipo: "parrafo", id: `${sub.id}-${i}`, texto });
    }
  }

  return bloques;
}

/** Subsecciones que no aportaron texto: se listan aparte como índice. */
export function subseccionesSinTexto(subsecciones: Subseccion[]): Subseccion[] {
  return subsecciones.filter((s) => parrafosDe(s.contenido).length === 0);
}
