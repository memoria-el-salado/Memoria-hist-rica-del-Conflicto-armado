/**
 * El explorador que el estudiante elige en su primera entrada (mockup de la
 * página 10 del avance). Lo acompaña en la cabecera en lugar de sus iniciales.
 */
export const EXPLORADORES = [
  { id: "CURIOSO", nombre: "Curioso", lema: "Pregunta por todo lo que encuentra en el camino." },
  { id: "INVESTIGADOR", nombre: "Investigador", lema: "Busca pistas en documentos y testimonios." },
  { id: "GUARDIAN", nombre: "Guardián", lema: "Cuida la memoria para que no se pierda." },
  { id: "SEMILLERO", nombre: "Semillero", lema: "Siembra lo aprendido para el futuro." },
] as const;

export type Explorador = (typeof EXPLORADORES)[number]["id"];

export function esExplorador(valor: unknown): valor is Explorador {
  return EXPLORADORES.some((e) => e.id === valor);
}
