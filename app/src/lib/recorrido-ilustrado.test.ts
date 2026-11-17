import { describe, expect, it } from "vitest";
import {
  altoVertical,
  estacionDelExplorador,
  estacionVecina,
  estadoDeEstacion,
  LIENZO,
  nombreCorto,
  posicionesDeEstaciones,
  trazoEntre,
} from "./recorrido-ilustrado";

describe("posicionesDeEstaciones", () => {
  it("reparte las estaciones de izquierda a derecha dentro del dibujo", () => {
    const p = posicionesDeEstaciones(6, "horizontal");
    expect(p).toHaveLength(6);
    for (let i = 1; i < p.length; i++) expect(p[i].x).toBeGreaterThan(p[i - 1].x);
    for (const { x, y } of p) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(LIENZO.horizontal.ancho);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(LIENZO.horizontal.alto);
    }
  });

  it("en vertical baja en zigzag y cabe en el alto calculado", () => {
    const p = posicionesDeEstaciones(6, "vertical");
    for (let i = 1; i < p.length; i++) {
      expect(p[i].y).toBeGreaterThan(p[i - 1].y);
      expect(p[i].x).not.toBe(p[i - 1].x);
    }
    expect(p.at(-1)!.y).toBeLessThan(altoVertical(6));
  });

  it("una sola estación queda al centro; ninguna, nada", () => {
    expect(posicionesDeEstaciones(1, "horizontal")[0].x).toBe(LIENZO.horizontal.ancho / 2);
    expect(posicionesDeEstaciones(0, "vertical")).toEqual([]);
  });
});

describe("trazoEntre", () => {
  it("empieza en la primera estación y termina en la última", () => {
    const p = posicionesDeEstaciones(3, "horizontal");
    const d = trazoEntre(p, "horizontal");
    const r = (v: number) => Math.round(v * 10) / 10;
    expect(d.startsWith(`M${r(p[0].x)} ${r(p[0].y)}`)).toBe(true);
    expect(d.endsWith(`${r(p[2].x)} ${r(p[2].y)}`)).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
  });

  it("con menos de dos estaciones no hay camino", () => {
    expect(trazoEntre(posicionesDeEstaciones(1, "vertical"), "vertical")).toBe("");
  });
});

describe("estadoDeEstacion", () => {
  it("el cierre manda sobre el avance", () => {
    expect(estadoDeEstacion({ bloqueo: "Se abre al…", progreso: 50 })).toBe("CERRADO");
    expect(estadoDeEstacion({ bloqueo: null, progreso: 100 })).toBe("COMPLETO");
    expect(estadoDeEstacion({ bloqueo: null, progreso: 30 })).toBe("EN CURSO");
    expect(estadoDeEstacion({ bloqueo: null, progreso: 0 })).toBe("SIN INICIAR");
  });
});

describe("estacionDelExplorador", () => {
  const ejes = [
    { id: "a", progreso: 100 },
    { id: "b", progreso: 40 },
    { id: "c", progreso: 0 },
  ];

  it("está en el eje por donde sigue el viaje", () => {
    expect(estacionDelExplorador(ejes, "b")).toBe(1);
  });

  it("si ya hizo todo, en la última estación con avance", () => {
    expect(estacionDelExplorador(ejes, null)).toBe(1);
  });

  it("si no ha empezado, en la primera", () => {
    expect(estacionDelExplorador([{ id: "a", progreso: 0 }], null)).toBe(0);
    expect(estacionDelExplorador([], null)).toBe(-1);
  });
});

describe("nombreCorto", () => {
  it("corta en los dos puntos", () => {
    expect(nombreCorto("Identidad, espacio y tierra: arraigos y disputas")).toBe("Identidad, espacio y tierra");
  });

  it("conserva la pregunta completa", () => {
    expect(nombreCorto("¿Por qué retornar? Arraigos, reencuentros")).toBe("¿Por qué retornar?");
  });

  it("acorta en una palabra lo que no cabe", () => {
    const corto = nombreCorto("Los dilemas que plantea la acción colectiva violenta");
    expect(corto.endsWith("…")).toBe(true);
    expect(corto.length).toBeLessThanOrEqual(35);
    expect(corto).toBe("Los dilemas que plantea la acción…");
  });
});

describe("estacionVecina", () => {
  it("las flechas avanzan y retroceden, y dan la vuelta", () => {
    expect(estacionVecina(0, 6, "ArrowRight")).toBe(1);
    expect(estacionVecina(5, 6, "ArrowDown")).toBe(0);
    expect(estacionVecina(0, 6, "ArrowLeft")).toBe(5);
    expect(estacionVecina(3, 6, "Home")).toBe(0);
    expect(estacionVecina(3, 6, "End")).toBe(5);
  });

  it("otras teclas no mueven", () => {
    expect(estacionVecina(2, 6, "Enter")).toBeNull();
  });
});
