import { describe, expect, it } from "vitest";
import { COLUMNAS_PLANO, FILAS_PLANO, LOTES, aAsignaciones, asignarLote, duenoDe, estadoDeFamilia, hectareasDe, riesgoDe, validarReparto, type Reparto } from "./simulador-lotes";
import { HECTAREAS_TOTALES, type Familia } from "./simulador";

const familia = (id: string, cambios: Partial<Familia> = {}): Familia => ({
  id,
  nombre: id,
  personas: 4,
  menores: 1,
  cabezaMujer: false,
  etnica: false,
  retornada: true,
  prioridad: "MEDIA",
  ...cambios,
});

describe("el plano", () => {
  it("los lotes suman las hectáreas del simulador, y hay uno por familia", () => {
    expect(LOTES.reduce((s, l) => s + l.hectareas, 0)).toBe(HECTAREAS_TOTALES);
    expect(LOTES).toHaveLength(20);
  });

  it("cada lote ocupa sus celdas de 5 ha, sin pisarse ni dejar huecos", () => {
    const ocupadas = new Set<string>();
    for (const l of LOTES) {
      expect(l.ancho * l.alto * 5).toBe(l.hectareas);
      for (let c = l.col; c < l.col + l.ancho; c++)
        for (let f = l.fila; f < l.fila + l.alto; f++) {
          expect(ocupadas.has(`${c},${f}`)).toBe(false);
          ocupadas.add(`${c},${f}`);
        }
    }
    expect(ocupadas.size).toBe(COLUMNAS_PLANO * FILAS_PLANO);
  });
});

describe("asignarLote", () => {
  const vacio: Reparto = {};

  it("da el lote y suma sus hectáreas", () => {
    const r = asignarLote(vacio, "L01", "f1");
    expect("reparto" in r && hectareasDe(r.reparto.f1.lotes)).toBe(20);
  });

  it("un lote pasa de una familia a otra, no se duplica", () => {
    const a = asignarLote(vacio, "L03", "f1");
    const b = "reparto" in a ? asignarLote(a.reparto, "L03", "f2") : a;
    expect("reparto" in b && duenoDe(b.reparto).get("L03")).toBe("f2");
    expect("reparto" in b && b.reparto.f1.lotes).toEqual([]);
  });

  it("no deja pasar del tope por familia", () => {
    let r: ReturnType<typeof asignarLote> = { reparto: vacio };
    for (const l of ["L01", "L02"]) r = "reparto" in r ? asignarLote(r.reparto, l, "f1") : r;
    expect("reparto" in r && hectareasDe(r.reparto.f1.lotes)).toBe(40);
    expect("reparto" in r && asignarLote(r.reparto, "L05", "f1")).toEqual({ error: "Una familia puede recibir hasta 40 ha; con este lote tendría 45." });
  });

  it("con null, el lote queda libre", () => {
    const a = asignarLote(vacio, "L13", "f1");
    const b = "reparto" in a ? asignarLote(a.reparto, "L13", null) : a;
    expect("reparto" in b && duenoDe(b.reparto).size).toBe(0);
  });

  it("un lote que no existe, no", () => {
    expect(asignarLote(vacio, "L99", "f1")).toEqual({ error: "Ese lote no existe." });
  });
});

describe("aAsignaciones y validarReparto", () => {
  it("traduce lotes a hectáreas para las reglas de equidad", () => {
    expect(aAsignaciones({ f1: { lotes: ["L05", "L06"], subsidio: "RIEGO" } })).toEqual({ f1: { hectareas: 10, subsidio: "RIEGO" } });
  });

  it("rechaza lotes repetidos, inexistentes o de más", () => {
    expect(validarReparto({ f1: { lotes: ["L01"], subsidio: "NINGUNO" }, f2: { lotes: ["L01"], subsidio: "NINGUNO" } })).toBe("Un lote no puede ser de dos familias.");
    expect(validarReparto({ f1: { lotes: ["X"], subsidio: "NINGUNO" } })).toBe("Hay un lote que no existe.");
    expect(validarReparto({ f1: { lotes: ["L01", "L02", "L05"], subsidio: "NINGUNO" } })).toMatch(/hasta 40/);
    expect(validarReparto({ f1: { lotes: ["L01"], subsidio: "NINGUNO" } })).toBeNull();
  });
});

describe("riesgoDe", () => {
  const familias = [familia("a", { prioridad: "ALTA" }), familia("b", { cabezaMujer: true }), familia("c")];

  it("bajo si las prioritarias y las de enfoque diferencial tienen tierra", () => {
    expect(riesgoDe(familias, { a: { hectareas: 20, subsidio: "NINGUNO" }, b: { hectareas: 10, subsidio: "NINGUNO" } })).toBe("BAJO");
  });

  it("medio si alguna queda sin tierra", () => {
    expect(riesgoDe(familias, { a: { hectareas: 20, subsidio: "NINGUNO" } })).toBe("MEDIO");
  });

  it("alto si se excede el presupuesto", () => {
    const caras = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`x${i}`, { hectareas: 1, subsidio: "RIEGO" as const }]));
    const muchas = Array.from({ length: 13 }, (_, i) => familia(`x${i}`));
    expect(riesgoDe(muchas, caras)).toBe("ALTO");
  });
});

describe("estadoDeFamilia", () => {
  it("unas 2 ha por persona, hasta el tope", () => {
    expect(estadoDeFamilia(familia("a", { personas: 4 }), { hectareas: 5, subsidio: "NINGUNO" }).tierra).toBe("POCA");
    expect(estadoDeFamilia(familia("a", { personas: 4 }), { hectareas: 10, subsidio: "NINGUNO" }).tierra).toBe("SUFICIENTE");
    expect(estadoDeFamilia(familia("a", { personas: 20 }), undefined)).toEqual({ tierra: "SIN_TIERRA", subsidio: "NINGUNO", minimo: 40 });
  });

  it("la prioridad alta o el enfoque diferencial piden subsidio", () => {
    expect(estadoDeFamilia(familia("a", { prioridad: "ALTA" }), { hectareas: 20, subsidio: "NINGUNO" }).subsidio).toBe("INSUFICIENTE");
    expect(estadoDeFamilia(familia("a", { etnica: true }), { hectareas: 20, subsidio: "RIEGO" }).subsidio).toBe("JUSTO");
    expect(estadoDeFamilia(familia("a"), { hectareas: 20, subsidio: "NINGUNO" }).subsidio).toBe("NINGUNO");
  });
});
