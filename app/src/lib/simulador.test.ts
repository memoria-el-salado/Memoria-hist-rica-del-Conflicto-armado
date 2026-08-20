import { describe, expect, it } from "vitest";
import {
  HECTAREAS_TOTALES,
  PRESUPUESTO_TOTAL,
  calcularEquidad,
  calcularTotales,
  validarDistribucion,
  type Asignacion,
  type Familia,
} from "./simulador";

function familia(id: string, extra: Partial<Familia> = {}): Familia {
  return {
    id,
    nombre: `Familia ${id}`,
    personas: 4,
    menores: 1,
    cabezaMujer: false,
    etnica: false,
    retornada: false,
    prioridad: "MEDIA",
    ...extra,
  };
}

const sinAsignar = (familias: Familia[]): Record<string, Asignacion> =>
  Object.fromEntries(familias.map((f) => [f.id, { hectareas: 0, subsidio: "NINGUNO" as const }]));

describe("calcularTotales", () => {
  it("suma hectáreas y cuenta solo las familias con tierra asignada", () => {
    const familias = [familia("a"), familia("b"), familia("c")];
    const totales = calcularTotales(familias, {
      a: { hectareas: 20, subsidio: "NINGUNO" },
      b: { hectareas: 0, subsidio: "NINGUNO" },
      c: { hectareas: 15, subsidio: "NINGUNO" },
    });

    expect(totales.hectareas).toBe(35);
    expect(totales.atendidas).toBe(2);
  });

  it("cobra cada subsidio según su tarifa", () => {
    const familias = [familia("a"), familia("b")];
    const totales = calcularTotales(familias, {
      a: { hectareas: 10, subsidio: "RIEGO" },
      b: { hectareas: 10, subsidio: "AGRICULTURA" },
    });

    expect(totales.gasto).toBe(8000 + 5000);
  });

  it("no cuenta prioridad ni enfoque diferencial si la familia quedó sin tierra", () => {
    const familias = [familia("a", { prioridad: "ALTA", cabezaMujer: true })];
    const totales = calcularTotales(familias, { a: { hectareas: 0, subsidio: "RIEGO" } });

    expect(totales.prioritariasAtendidas).toBe(0);
    expect(totales.diferencialAtendidas).toBe(0);
    // El subsidio sí se cobra aunque no haya adjudicación de tierra.
    expect(totales.gasto).toBe(8000);
  });
});

describe("calcularEquidad", () => {
  it("da cero cuando no se asignó nada", () => {
    const familias = [familia("a"), familia("b")];
    expect(calcularEquidad(familias, sinAsignar(familias))).toBe(0);
  });

  it("llega a 100 con cobertura total, prelación, enfoque diferencial y tierra repartida", () => {
    const familias = [
      familia("a", { prioridad: "ALTA", cabezaMujer: true }),
      familia("b", { etnica: true }),
    ];
    const equidad = calcularEquidad(familias, {
      a: { hectareas: 100, subsidio: "NINGUNO" },
      b: { hectareas: 100, subsidio: "NINGUNO" },
    });

    expect(equidad).toBe(100);
  });

  it("penaliza exceder el presupuesto", () => {
    const familias = Array.from({ length: 20 }, (_, i) => familia(String(i)));
    const derrochador = Object.fromEntries(
      familias.map((f) => [f.id, { hectareas: 10, subsidio: "RIEGO" as const }])
    );
    const austero = Object.fromEntries(
      familias.map((f) => [f.id, { hectareas: 10, subsidio: "NINGUNO" as const }])
    );

    expect(calcularTotales(familias, derrochador).gasto).toBeGreaterThan(PRESUPUESTO_TOTAL);
    expect(calcularEquidad(familias, derrochador)).toBeLessThan(calcularEquidad(familias, austero));
  });

  it("penaliza repartir más tierra de la disponible", () => {
    const familias = Array.from({ length: 20 }, (_, i) => familia(String(i)));
    const excedido = Object.fromEntries(
      familias.map((f) => [f.id, { hectareas: 40, subsidio: "NINGUNO" as const }])
    );

    expect(calcularTotales(familias, excedido).hectareas).toBeGreaterThan(HECTAREAS_TOTALES);
    expect(calcularEquidad(familias, excedido)).toBeLessThan(100);
  });

  it("nunca devuelve un índice negativo", () => {
    const familias = [familia("a", { prioridad: "ALTA" })];
    const equidad = calcularEquidad(familias, { a: { hectareas: 0, subsidio: "RIEGO" } });
    expect(equidad).toBeGreaterThanOrEqual(0);
  });
});

describe("validarDistribucion", () => {
  it("avisa cuando queda tierra sin repartir", () => {
    const familias = [familia("a")];
    const criterios = validarDistribucion(familias, { a: { hectareas: 50, subsidio: "NINGUNO" } });

    expect(criterios.some((c) => c.titulo.includes("Quedan 150 ha sin repartir"))).toBe(true);
  });

  it("exige prelación para las familias de prioridad alta (Ley 135 de 1961)", () => {
    const familias = [familia("a", { prioridad: "ALTA" }), familia("b")];
    const criterios = validarDistribucion(familias, {
      a: { hectareas: 0, subsidio: "NINGUNO" },
      b: { hectareas: 200, subsidio: "NINGUNO" },
    });

    expect(criterios.some((c) => c.titulo.includes("prioridad alta sin tierra"))).toBe(true);
  });

  it("señala el enfoque diferencial incompleto", () => {
    const familias = [familia("a", { cabezaMujer: true }), familia("b")];
    const criterios = validarDistribucion(familias, {
      a: { hectareas: 0, subsidio: "NINGUNO" },
      b: { hectareas: 200, subsidio: "NINGUNO" },
    });

    expect(criterios.some((c) => c.titulo === "Enfoque diferencial incompleto")).toBe(true);
  });

  it("reporta presupuesto excedido con el monto exacto", () => {
    const familias = Array.from({ length: 20 }, (_, i) => familia(String(i)));
    const criterios = validarDistribucion(
      familias,
      Object.fromEntries(familias.map((f) => [f.id, { hectareas: 10, subsidio: "RIEGO" as const }]))
    );

    const excedido = criterios.find((c) => c.titulo === "Presupuesto excedido");
    expect(excedido).toBeDefined();
    // 20 familias × $8.000 = $160.000, es decir $60.000 por encima del tope.
    expect(excedido!.detalle).toContain("60.000");
  });

  it("reconoce una distribución completa y equitativa", () => {
    const familias = [
      familia("a", { prioridad: "ALTA", cabezaMujer: true }),
      familia("b", { etnica: true }),
    ];
    const criterios = validarDistribucion(familias, {
      a: { hectareas: 100, subsidio: "NINGUNO" },
      b: { hectareas: 100, subsidio: "NINGUNO" },
    });

    expect(criterios.some((c) => c.titulo === "Distribución completa")).toBe(true);
    expect(criterios.some((c) => c.titulo === "Enfoque diferencial cumplido")).toBe(true);
    expect(criterios.some((c) => c.titulo === "Presupuesto dentro del límite")).toBe(true);
  });
});
