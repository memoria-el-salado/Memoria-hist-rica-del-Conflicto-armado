import { describe, expect, it } from "vitest";
import { esExplorador, EXPLORADORES } from "./exploradores";

describe("exploradores", () => {
  it("son los cuatro del mockup", () => {
    expect(EXPLORADORES.map((e) => e.nombre)).toEqual(["Curioso", "Investigador", "Guardián", "Semillero"]);
  });

  it("solo se acepta uno de ellos", () => {
    expect(esExplorador("GUARDIAN")).toBe(true);
    expect(esExplorador("guardian")).toBe(false);
    expect(esExplorador(null)).toBe(false);
  });
});
