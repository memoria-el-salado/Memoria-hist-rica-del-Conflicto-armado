/**
 * Reglas del Simulador de Repartición de Tierras (CU03).
 * Se mantienen puras y sin dependencias de React o Prisma para poder verificarlas
 * con pruebas automatizadas (objetivo específico 5 del documento).
 */

export const HECTAREAS_TOTALES = 200;
export const PRESUPUESTO_TOTAL = 100000;
export const HECTAREAS_MAX_POR_FAMILIA = 40;

export const COSTO_SUBSIDIO = {
  NINGUNO: 0,
  RIEGO: 8000,
  AGRICULTURA: 5000,
} as const;

export type Subsidio = keyof typeof COSTO_SUBSIDIO;

export type Familia = {
  id: string;
  nombre: string;
  personas: number;
  menores: number;
  cabezaMujer: boolean;
  etnica: boolean;
  retornada: boolean;
  prioridad: "ALTA" | "MEDIA" | "BAJA";
};

export type Asignacion = { hectareas: number; subsidio: Subsidio };

export type Totales = {
  hectareas: number;
  gasto: number;
  atendidas: number;
  prioritariasAtendidas: number;
  diferencialAtendidas: number;
};

export function calcularTotales(
  familias: Familia[],
  asignaciones: Record<string, Asignacion>
): Totales {
  return familias.reduce<Totales>(
    (acc, f) => {
      const a = asignaciones[f.id] ?? { hectareas: 0, subsidio: "NINGUNO" as Subsidio };
      acc.hectareas += a.hectareas;
      acc.gasto += COSTO_SUBSIDIO[a.subsidio];
      if (a.hectareas > 0) {
        acc.atendidas += 1;
        if (f.prioridad === "ALTA") acc.prioritariasAtendidas += 1;
        if (f.cabezaMujer || f.etnica) acc.diferencialAtendidas += 1;
      }
      return acc;
    },
    { hectareas: 0, gasto: 0, atendidas: 0, prioritariasAtendidas: 0, diferencialAtendidas: 0 }
  );
}

/**
 * Índice de equidad: combina cobertura (35), prelación legal (25),
 * enfoque diferencial (20) y uso de la tierra (20), con penalizaciones
 * por exceder presupuesto o hectáreas disponibles.
 */
export function calcularEquidad(
  familias: Familia[],
  asignaciones: Record<string, Asignacion>
): number {
  const t = calcularTotales(familias, asignaciones);
  const totalPrioritarias = familias.filter((f) => f.prioridad === "ALTA").length;
  const totalDiferencial = familias.filter((f) => f.cabezaMujer || f.etnica).length;

  const cobertura = Math.min(1, t.atendidas / (familias.length || 1));

  // Si un grupo no existe en el conjunto, su criterio no puede fallar: se acredita
  // en proporción a la cobertura lograda, para que "no asignar nada" siga dando cero.
  let puntaje = 0;
  puntaje += cobertura * 35;
  puntaje += (totalPrioritarias ? Math.min(1, t.prioritariasAtendidas / totalPrioritarias) : cobertura) * 25;
  puntaje += (totalDiferencial ? Math.min(1, t.diferencialAtendidas / totalDiferencial) : cobertura) * 20;
  puntaje += Math.min(1, t.hectareas / HECTAREAS_TOTALES) * 20;

  if (t.gasto > PRESUPUESTO_TOTAL) puntaje -= 25;
  if (t.hectareas > HECTAREAS_TOTALES) puntaje -= 20;

  return Math.max(0, Math.round(puntaje));
}

export type Criterio = { color: string; titulo: string; detalle: string };

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");

export function validarDistribucion(
  familias: Familia[],
  asignaciones: Record<string, Asignacion>
): Criterio[] {
  const t = calcularTotales(familias, asignaciones);
  const criterios: Criterio[] = [];

  const sinTierra = (f: Familia) => (asignaciones[f.id]?.hectareas ?? 0) === 0;
  const prioritariasSinTierra = familias.filter((f) => f.prioridad === "ALTA" && sinTierra(f)).length;
  const diferencialSinTierra = familias.filter(
    (f) => (f.cabezaMujer || f.etnica) && sinTierra(f)
  ).length;

  if (t.gasto > PRESUPUESTO_TOTAL) {
    criterios.push({
      color: "#C0392B",
      titulo: "Presupuesto excedido",
      detalle: `Superas los ${pesos(PRESUPUESTO_TOTAL)} en ${pesos(t.gasto - PRESUPUESTO_TOTAL)}. Retira subsidios de riego en zonas fértiles.`,
    });
  } else {
    criterios.push({
      color: "#177575",
      titulo: "Presupuesto dentro del límite",
      detalle: `Te quedan ${pesos(PRESUPUESTO_TOTAL - t.gasto)} sin ejecutar.`,
    });
  }

  if (t.hectareas > HECTAREAS_TOTALES) {
    criterios.push({
      color: "#C0392B",
      titulo: "Tierra insuficiente",
      detalle: `Asignaste ${t.hectareas} ha de un latifundio de ${HECTAREAS_TOTALES} ha.`,
    });
  } else if (t.hectareas < HECTAREAS_TOTALES) {
    criterios.push({
      color: "#A8791C",
      titulo: `Quedan ${HECTAREAS_TOTALES - t.hectareas} ha sin repartir`,
      detalle: "La tierra ociosa reproduce la concentración que la ley buscaba evitar.",
    });
  } else {
    criterios.push({
      color: "#177575",
      titulo: "Distribución completa",
      detalle: `Las ${HECTAREAS_TOTALES} hectáreas quedaron adjudicadas.`,
    });
  }

  if (prioritariasSinTierra) {
    criterios.push({
      color: "#C0392B",
      titulo: `${prioritariasSinTierra} familias de prioridad alta sin tierra`,
      detalle: "La Ley 135 exige prelación para quienes trabajan la tierra sin poseerla.",
    });
  }

  if (diferencialSinTierra) {
    criterios.push({
      color: "#A8791C",
      titulo: "Enfoque diferencial incompleto",
      detalle: `${diferencialSinTierra} familias con mujer cabeza de hogar o pertenencia étnica quedaron sin adjudicación.`,
    });
  }

  if (!prioritariasSinTierra && !diferencialSinTierra) {
    criterios.push({
      color: "#177575",
      titulo: "Enfoque diferencial cumplido",
      detalle: "Todas las familias priorizadas y con enfoque diferencial recibieron tierra.",
    });
  }

  criterios.push({
    color: "#33302C",
    titulo: `Índice de equidad: ${calcularEquidad(familias, asignaciones)}%`,
    detalle: "Combina cobertura, prelación, enfoque diferencial y uso del presupuesto.",
  });

  return criterios;
}
