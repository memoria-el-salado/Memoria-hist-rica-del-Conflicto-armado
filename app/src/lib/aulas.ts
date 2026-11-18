/**
 * Aulas: cómo la administración conecta a los estudiantes con su docente.
 *
 * Como en Canvas, un estudiante ve los contenidos solo cuando está en el aula
 * de un docente. La conexión es la misma que ya usaba la plataforma: el
 * docente a cargo del estudiante (`User.creadoPorId`, el docente que lo dio de
 * alta o al que la administración se lo asignó) y, si lo hay, su curso. Por eso
 * asignar no cambia el esquema: todo lo que ya filtraba por docente (avance,
 * revisión, cartografía, mensajes) sigue funcionando igual.
 */

/** Lo que elige el administrador en el selector de un estudiante. */
export type Destino = { docenteId: string | null; cursoId: string | null };

/**
 * Lee el valor del selector: "" deja al estudiante sin docente, "d:<id>" lo
 * pone con un docente sin curso y "c:<id>" en un curso (el docente es el del
 * curso, que el servidor busca). Devuelve null si el valor no se entiende.
 */
export function leerDestino(valor: unknown): { docenteId: string | null; cursoId: null } | { cursoId: string } | null {
  const v = String(valor ?? "").trim();
  if (v === "") return { docenteId: null, cursoId: null };
  const m = v.match(/^([dc]):([A-Za-z0-9_-]{1,64})$/);
  if (!m) return null;
  return m[1] === "d" ? { docenteId: m[2], cursoId: null } : { cursoId: m[2] };
}

/** El valor del selector que corresponde a la situación actual del estudiante. */
export function valorDeDestino(estudiante: { creadoPorId: string | null; cursoId: string | null }, docentes: Set<string>): string {
  if (estudiante.cursoId) return `c:${estudiante.cursoId}`;
  if (estudiante.creadoPorId && docentes.has(estudiante.creadoPorId)) return `d:${estudiante.creadoPorId}`;
  return "";
}

/**
 * Los cambios que hay que guardar para llevar al estudiante a su destino.
 * Cambiar de curso o de docente lo saca de su grupo de trabajo, que es del
 * curso anterior. Devuelve null si no hay nada que cambiar.
 */
export function cambiosDeAsignacion(
  estudiante: { creadoPorId: string | null; cursoId: string | null; grupoId: string | null },
  destino: Destino
): { creadoPorId: string | null; cursoId: string | null; grupoId: string | null } | null {
  if (estudiante.creadoPorId === destino.docenteId && estudiante.cursoId === destino.cursoId) return null;
  return { creadoPorId: destino.docenteId, cursoId: destino.cursoId, grupoId: null };
}

/** Si el estudiante está conectado con un docente y, por tanto, ve los contenidos. */
export function tieneAula(docenteACargo: { rol: string } | null | undefined): boolean {
  return docenteACargo?.rol === "DOCENTE";
}
