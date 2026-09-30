import { describe, expect, it } from "vitest";
import { APORTES, avanceDeCompetencias, COMPETENCIAS, promedioDeCompetencias } from "./competencias";
import { ACTIVIDADES } from "./importador-pdf";

describe("aportes de cada actividad", () => {
  it("toda actividad del importador trabaja al menos una competencia", () => {
    for (const a of ACTIVIDADES) expect(APORTES[a.valor]?.length ?? 0).toBeGreaterThan(0);
  });

  it("cada competencia tiene actividades que la trabajan", () => {
    for (const c of COMPETENCIAS) expect(Object.values(APORTES).some((l) => l.includes(c.id))).toBe(true);
  });
});

describe("avanceDeCompetencias", () => {
  const sesiones = [
    { pantalla: "testimonios", publicada: true, completada: true },
    { pantalla: "jardin", publicada: true, completada: false },
    { pantalla: "dilema", publicada: true, completada: true },
    { pantalla: "compromiso", publicada: false, completada: false },
  ];

  it("cuenta las sesiones publicadas que alimentan cada competencia", () => {
    const avance = Object.fromEntries(avanceDeCompetencias(sesiones).map((c) => [c.id, [c.hechas, c.total, c.porcentaje]]));
    expect(avance).toEqual({
      EMPATIA: [1, 2, 50],
      ESCUCHA: [1, 1, 100],
      CRITICO: [1, 1, 100],
      ASERTIVIDAD: [1, 1, 100],
    });
  });

  it("sin sesiones publicadas, todo en cero", () => {
    expect(avanceDeCompetencias([]).every((c) => c.total === 0 && c.porcentaje === 0)).toBe(true);
  });

  it("una actividad desconocida cuenta como archivo y anotaciones", () => {
    const [, , critico] = avanceDeCompetencias([{ pantalla: "futura", publicada: true, completada: true }]);
    expect(critico).toMatchObject({ id: "CRITICO", hechas: 1, total: 1 });
  });
});

describe("promedioDeCompetencias", () => {
  it("promedia al grupo", () => {
    const a = avanceDeCompetencias([{ pantalla: "jardin", publicada: true, completada: true }]);
    const b = avanceDeCompetencias([{ pantalla: "jardin", publicada: true, completada: false }]);
    expect(promedioDeCompetencias([a, b]).find((c) => c.id === "EMPATIA")?.porcentaje).toBe(50);
    expect(promedioDeCompetencias([])[0].porcentaje).toBe(0);
  });
});
