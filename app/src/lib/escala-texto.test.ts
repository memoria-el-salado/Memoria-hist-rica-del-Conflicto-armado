import { describe, expect, it } from "vitest";
import { ETIQUETA_ESCALA, leerEscala, siguienteEscala } from "./escala-texto";

describe("escala de texto", () => {
  it("avanza A → A+ → A++ y vuelve a A", () => {
    expect(siguienteEscala("1")).toBe("1.12");
    expect(siguienteEscala("1.12")).toBe("1.25");
    expect(siguienteEscala("1.25")).toBe("1");
  });

  it("solo acepta lo guardado si es una escala válida", () => {
    expect(leerEscala("1.25")).toBe("1.25");
    expect(leerEscala("2")).toBe("1");
    expect(leerEscala(null)).toBe("1");
    expect(leerEscala(1.12)).toBe("1");
  });

  it("cada escala tiene su etiqueta", () => {
    expect(Object.values(ETIQUETA_ESCALA)).toEqual(["A", "A+", "A++"]);
  });
});
