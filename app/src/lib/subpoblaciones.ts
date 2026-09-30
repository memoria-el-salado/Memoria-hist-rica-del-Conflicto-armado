/**
 * Subpoblaciones (CU07). Que un estudiante sea víctima directa, desplazado o
 * retornado es un dato sensible de un menor (Ley 1581 de 2012). Por decisión
 * del equipo:
 *
 *   · la declaración es voluntaria y solo cuenta si el docente registró que el
 *     acudiente la autorizó; sin eso, el estudiante cuenta como «Sin declarar»;
 *   · los reportes son solo agregados, y ningún grupo sensible de menos de
 *     cinco estudiantes se muestra, para que nadie pueda ser identificado.
 */

export const CATEGORIAS = ["Víctimas directas", "Población desplazada", "Retornados", "Sin vínculo directo"] as const;
export const SIN_DECLARAR = "Sin declarar";
export const MINIMO_GRUPO = 5;

/** La categoría con la que cuenta un estudiante en los reportes. */
export function categoriaDeReporte(estudiante: { subpoblacion: string | null; consentidaEn: Date | null }): string {
  const valida = (CATEGORIAS as readonly string[]).includes(estudiante.subpoblacion ?? "");
  return valida && estudiante.consentidaEn ? estudiante.subpoblacion! : SIN_DECLARAR;
}

export function validarDeclaracion(entrada: { categoria: unknown; consentimiento: unknown }): { subpoblacion: string | null } | { error: string } {
  const categoria = String(entrada.categoria ?? "");
  if (!categoria) return { subpoblacion: null };
  if (!(CATEGORIAS as readonly string[]).includes(categoria)) return { error: "Esa categoría no existe." };
  if (entrada.consentimiento !== true) return { error: "Registra primero que el acudiente autorizó este dato." };
  return { subpoblacion: categoria };
}

export type FilaSubpoblacion = { nombre: string; estudiantes: number; avance: number; entregas: number };

/**
 * Agrupa por categoría y oculta los grupos sensibles de menos de cinco. Los
 * ocultos no se suman en otra fila: juntos también podrían ser pocos. Se
 * informa cuántos estudiantes quedaron fuera, sin decir de qué grupos.
 */
export function agregarPorSubpoblacion(
  estudiantes: { categoria: string; avance: number; entregas: number }[]
): { filas: FilaSubpoblacion[]; ocultos: number } {
  const grupos = new Map<string, { avances: number[]; entregas: number }>();
  for (const e of estudiantes) {
    const g = grupos.get(e.categoria) ?? { avances: [], entregas: 0 };
    g.avances.push(e.avance);
    g.entregas += e.entregas;
    grupos.set(e.categoria, g);
  }

  let ocultos = 0;
  const filas: FilaSubpoblacion[] = [];
  for (const [nombre, g] of grupos) {
    // «Sin declarar» no revela nada de nadie: se muestra aunque sean pocos.
    if (nombre !== SIN_DECLARAR && g.avances.length < MINIMO_GRUPO) {
      ocultos += g.avances.length;
      continue;
    }
    filas.push({
      nombre,
      estudiantes: g.avances.length,
      avance: Math.round(g.avances.reduce((s, v) => s + v, 0) / g.avances.length),
      entregas: g.entregas,
    });
  }
  const orden = (n: string) => (n === SIN_DECLARAR ? CATEGORIAS.length : CATEGORIAS.indexOf(n as (typeof CATEGORIAS)[number]));
  return { filas: filas.sort((a, b) => orden(a.nombre) - orden(b.nombre)), ocultos };
}
