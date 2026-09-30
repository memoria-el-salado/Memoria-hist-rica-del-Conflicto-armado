/**
 * Quién ve lo que aporta un estudiante en una actividad colectiva —un lugar de
 * la cartografía, una flor del jardín— junto con su voz, su foto o su dibujo.
 *
 * Lo ven sus compañeros del mismo curso (o, sin curso, los estudiantes de su
 * docente que tampoco lo tienen) y su docente. No toda la plataforma: son
 * creaciones de menores.
 */

export type Persona = { rol: string; id: string; creadoPorId: string | null; cursoId: string | null };
export type Autor = { id: string; creadoPorId: string | null; cursoId: string | null };

/** Sin autor, el aporte es contenido curado del archivo y lo ve cualquiera. */
export function puedeVerAporte(quien: Persona, autor: Autor | null): boolean {
  if (!autor) return true;
  if (quien.id === autor.id) return true;
  if (quien.rol === "DOCENTE") return autor.creadoPorId === quien.id;
  if (quien.rol === "ESTUDIANTE") {
    return Boolean(quien.creadoPorId) && autor.creadoPorId === quien.creadoPorId && autor.cursoId === quien.cursoId;
  }
  return false;
}

/**
 * La misma regla como condición de consulta, para traer de la base solo los
 * aportes que el estudiante puede ver: los suyos y los de sus compañeros.
 */
export function aportesVisiblesPara(yo: { id: string; creadoPorId: string | null; cursoId: string | null }) {
  return [
    { autorId: yo.id },
    ...(yo.creadoPorId ? [{ autor: { creadoPorId: yo.creadoPorId, cursoId: yo.cursoId } }] : []),
  ];
}
