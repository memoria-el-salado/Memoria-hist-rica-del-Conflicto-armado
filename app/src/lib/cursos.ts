/**
 * Cursos y grupos de trabajo.
 *
 * El docente sigue creando las cuentas de sus estudiantes (decisión 1 de la
 * ruta de la v2); el curso solo las organiza: con nombre y año lectivo, y con
 * grupos dentro para las actividades colectivas de la guía.
 */

export const LIMITES_CURSO = { nombreMinimo: 2, nombreMaximo: 40, anioMinimo: 2024 };

type Revision<T> = { datos: T } | { error: string };

function nombreValido(nombre: unknown, que: string): Revision<string> {
  const limpio = String(nombre ?? "").trim().replace(/\s+/g, " ");
  if (limpio.length < LIMITES_CURSO.nombreMinimo) return { error: `Escribe el nombre del ${que}.` };
  if (limpio.length > LIMITES_CURSO.nombreMaximo) {
    return { error: `El nombre del ${que} no puede pasar de ${LIMITES_CURSO.nombreMaximo} caracteres.` };
  }
  return { datos: limpio };
}

/**
 * El año lectivo va desde el primero en que se usó la plataforma hasta el
 * siguiente al actual, para poder preparar el curso que viene.
 */
export function validarCurso(
  entrada: { nombre: unknown; anio: unknown },
  anioActual: number
): Revision<{ nombre: string; anio: number }> {
  const nombre = nombreValido(entrada.nombre, "curso");
  if ("error" in nombre) return nombre;
  const anio = Number(entrada.anio);
  if (!Number.isInteger(anio) || anio < LIMITES_CURSO.anioMinimo || anio > anioActual + 1) {
    return { error: `El año lectivo debe estar entre ${LIMITES_CURSO.anioMinimo} y ${anioActual + 1}.` };
  }
  return { datos: { nombre: nombre.datos, anio } };
}

export function validarGrupo(nombre: unknown): Revision<string> {
  return nombreValido(nombre, "grupo");
}

export function etiquetaCurso(curso: { nombre: string; anio: number }): string {
  return `${curso.nombre} · ${curso.anio}`;
}

/**
 * Reparte entre los grupos a los estudiantes que no tienen: cada uno va al
 * grupo con menos miembros en ese momento, de modo que los grupos quedan
 * parejos sin mover a nadie que ya estuviera en uno.
 */
export function repartirEnGrupos(
  sinGrupo: string[],
  grupos: { id: string; miembros: number }[]
): Map<string, string> {
  const reparto = new Map<string, string>();
  if (!grupos.length) return reparto;
  const tallas = grupos.map((g) => ({ ...g }));
  for (const estudiante of sinGrupo) {
    const menor = tallas.reduce((a, b) => (b.miembros < a.miembros ? b : a));
    reparto.set(estudiante, menor.id);
    menor.miembros += 1;
  }
  return reparto;
}

/**
 * El curso por el que se filtra una pantalla, leído de la dirección. Solo vale
 * si es uno de los cursos del docente; cualquier otro valor muestra todos.
 */
export function cursoElegido(parametro: string | string[] | undefined, cursos: { id: string }[]): string | null {
  const id = Array.isArray(parametro) ? parametro[0] : parametro;
  return id && cursos.some((c) => c.id === id) ? id : null;
}

/**
 * Un estudiante solo puede ir a un curso de su propio docente, y a un grupo
 * de su propio curso.
 */
export function puedeAsignar(
  docenteId: string,
  estudiante: { rol: string; creadoPorId: string | null; cursoId?: string | null },
  destino: { curso?: { docenteId: string } | null; grupo?: { cursoId: string; curso: { docenteId: string } } | null }
): boolean {
  if (estudiante.rol !== "ESTUDIANTE" || estudiante.creadoPorId !== docenteId) return false;
  if (destino.curso && destino.curso.docenteId !== docenteId) return false;
  if (destino.grupo) {
    return destino.grupo.curso.docenteId === docenteId && destino.grupo.cursoId === estudiante.cursoId;
  }
  return true;
}
