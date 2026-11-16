import { describe, expect, it } from "vitest";
import { contraste, fondoParaTextoBlanco } from "./contraste";

describe("contraste", () => {
  it("va de 1 (iguales) a 21 (negro y blanco)", () => {
    expect(contraste("#ffffff", "#ffffff")).toBeCloseTo(1);
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21);
  });

  it("no depende del orden", () => {
    expect(contraste("#1b8a8a", "#ffffff")).toBeCloseTo(contraste("#ffffff", "#1b8a8a"));
  });
});

describe("fondoParaTextoBlanco", () => {
  it("deja igual un color que ya cumple", () => {
    expect(fondoParaTextoBlanco("#177575")).toBe("#177575");
  });

  it("oscurece los colores de los ejes que no dejan leer el blanco", () => {
    for (const tono of ["#D95D39", "#1B8A8A", "#EBB035", "#8C8279"]) {
      const fondo = fondoParaTextoBlanco(tono);
      expect(contraste(fondo, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("deja como está un valor que no es un color", () => {
    expect(fondoParaTextoBlanco("var(--x)")).toBe("var(--x)");
  });
});
