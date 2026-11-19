import { describe, expect, it } from "vitest";
import { leerTema, otroTema, SCRIPT_TEMA, temaEfectivo } from "./tema";

describe("tema claro u oscuro", () => {
  it("la elección guardada manda sobre el sistema", () => {
    expect(temaEfectivo("claro", true)).toBe("claro");
    expect(temaEfectivo("oscuro", false)).toBe("oscuro");
  });

  it("sin elección, sigue al sistema", () => {
    expect(temaEfectivo(null, true)).toBe("oscuro");
    expect(temaEfectivo("otro", false)).toBe("claro");
  });

  it("solo acepta temas válidos y alterna entre los dos", () => {
    expect(leerTema("oscuro")).toBe("oscuro");
    expect(leerTema("azul")).toBeNull();
    expect(otroTema("claro")).toBe("oscuro");
    expect(otroTema("oscuro")).toBe("claro");
  });

  it("el script del <head> aplica la misma regla", () => {
    const html = { dataset: {} as Record<string, string> };
    const correr = (guardado: string | null, oscuro: boolean) => {
      new Function("localStorage", "matchMedia", "document", SCRIPT_TEMA)(
        { getItem: () => guardado },
        () => ({ matches: oscuro }),
        { documentElement: html }
      );
      return html.dataset.tema;
    };
    expect(correr("claro", true)).toBe("claro");
    expect(correr(null, true)).toBe("oscuro");
    expect(correr(null, false)).toBe("claro");
  });
});
