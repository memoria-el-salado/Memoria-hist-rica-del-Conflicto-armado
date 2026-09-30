/**
 * Las competencias ciudadanas que la guía para maestros fija en cada eje:
 * empatía, escucha activa, pensamiento crítico y asertividad. Cada tipo de
 * actividad trabaja una o varias, y el avance de cada competencia sale de las
 * sesiones hechas que la alimentan. Como el avance, no se guarda: se deduce.
 */

export const COMPETENCIAS = [
  { id: "EMPATIA", nombre: "Empatía", descripcion: "Ponerse en el lugar de quienes vivieron lo que cuenta la historia." },
  { id: "ESCUCHA", nombre: "Escucha activa", descripcion: "Escuchar testimonios, coplas y a los compañeros antes de responder." },
  { id: "CRITICO", nombre: "Pensamiento crítico", descripcion: "Contrastar fuentes, argumentar y preguntarse por qué pasó lo que pasó." },
  { id: "ASERTIVIDAD", nombre: "Asertividad", descripcion: "Decir lo que se piensa y se siente, con respeto por los demás." },
] as const;

export type Competencia = (typeof COMPETENCIAS)[number]["id"];

/** Qué competencias trabaja cada actividad. */
export const APORTES: Record<string, Competencia[]> = {
  zona: ["CRITICO"],
  cartografia: ["EMPATIA", "ESCUCHA"],
  copla: ["ESCUCHA", "CRITICO"],
  despensa: ["ESCUCHA", "CRITICO"],
  simulador: ["CRITICO", "EMPATIA"],
  jardin: ["EMPATIA"],
  diario: ["ASERTIVIDAD", "EMPATIA"],
  meubico: ["EMPATIA", "ASERTIVIDAD"],
  dilema: ["CRITICO", "ASERTIVIDAD"],
  investigar: ["CRITICO"],
  testimonios: ["ESCUCHA", "EMPATIA"],
  compromiso: ["ASERTIVIDAD", "EMPATIA"],
};

export type AvanceCompetencia = { id: Competencia; nombre: string; descripcion: string; hechas: number; total: number; porcentaje: number };

/**
 * Para cada competencia: cuántas de las sesiones publicadas que la trabajan
 * hizo el estudiante. Una competencia sin sesiones publicadas queda en 0 de 0.
 */
export function avanceDeCompetencias(sesiones: { pantalla: string; publicada: boolean; completada: boolean }[]): AvanceCompetencia[] {
  return COMPETENCIAS.map((c) => {
    const suyas = sesiones.filter((s) => s.publicada && (APORTES[s.pantalla] ?? APORTES.zona).includes(c.id));
    const hechas = suyas.filter((s) => s.completada).length;
    return { ...c, hechas, total: suyas.length, porcentaje: suyas.length ? Math.round((hechas / suyas.length) * 100) : 0 };
  });
}

/** El promedio de un grupo, competencia por competencia. */
export function promedioDeCompetencias(porEstudiante: AvanceCompetencia[][]): { id: Competencia; nombre: string; porcentaje: number }[] {
  return COMPETENCIAS.map((c) => {
    const valores = porEstudiante.map((lista) => lista.find((x) => x.id === c.id)?.porcentaje ?? 0);
    return { id: c.id, nombre: c.nombre, porcentaje: valores.length ? Math.round(valores.reduce((s, v) => s + v, 0) / valores.length) : 0 };
  });
}
