import { describe, expect, it } from "vitest";
import { agregarPorSubpoblacion, categoriaDeReporte, MINIMO_GRUPO, SIN_DECLARAR, validarDeclaracion } from "./subpoblaciones";

describe("categoriaDeReporte", () => {
  it("una categoría autorizada cuenta como tal", () => {
    expect(categoriaDeReporte({ subpoblacion: "Retornados", consentidaEn: new Date() })).toBe("Retornados");
  });

  it("sin la autorización del acudiente, cuenta como sin declarar", () => {
    expect(categoriaDeReporte({ subpoblacion: "Retornados", consentidaEn: null })).toBe(SIN_DECLARAR);
  });

  it("un texto libre de antes no es una categoría", () => {
    expect(categoriaDeReporte({ subpoblacion: "hijo de víctima", consentidaEn: new Date() })).toBe(SIN_DECLARAR);
    expect(categoriaDeReporte({ subpoblacion: null, consentidaEn: null })).toBe(SIN_DECLARAR);
  });
});

describe("validarDeclaracion", () => {
  it("una categoría exige el consentimiento", () => {
    expect(validarDeclaracion({ categoria: "Retornados", consentimiento: false })).toEqual({ error: "Registra primero que el acudiente autorizó este dato." });
    expect(validarDeclaracion({ categoria: "Retornados", consentimiento: true })).toEqual({ subpoblacion: "Retornados" });
  });

  it("dejarla sin declarar siempre se puede", () => {
    expect(validarDeclaracion({ categoria: "", consentimiento: false })).toEqual({ subpoblacion: null });
  });

  it("no acepta categorías inventadas", () => {
    expect(validarDeclaracion({ categoria: "Otra", consentimiento: true })).toEqual({ error: "Esa categoría no existe." });
  });
});

describe("agregarPorSubpoblacion", () => {
  const varios = (categoria: string, n: number, avance = 50) => Array.from({ length: n }, () => ({ categoria, avance, entregas: 1 }));

  it("muestra los grupos de cinco o más, con su promedio", () => {
    const { filas, ocultos } = agregarPorSubpoblacion([...varios("Retornados", MINIMO_GRUPO, 40), ...varios(SIN_DECLARAR, 2, 80)]);
    expect(filas).toEqual([
      { nombre: "Retornados", estudiantes: 5, avance: 40, entregas: 5 },
      { nombre: SIN_DECLARAR, estudiantes: 2, avance: 80, entregas: 2 },
    ]);
    expect(ocultos).toBe(0);
  });

  it("oculta los grupos sensibles de menos de cinco, sin sumarlos en otra fila", () => {
    const { filas, ocultos } = agregarPorSubpoblacion([...varios("Víctimas directas", 3), ...varios("Retornados", 2), ...varios(SIN_DECLARAR, 6)]);
    expect(filas.map((f) => f.nombre)).toEqual([SIN_DECLARAR]);
    expect(ocultos).toBe(5);
  });

  it("sin estudiantes, nada", () => {
    expect(agregarPorSubpoblacion([])).toEqual({ filas: [], ocultos: 0 });
  });
});
