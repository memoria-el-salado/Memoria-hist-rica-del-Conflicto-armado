import { describe, expect, it } from "vitest";
import { estadoDeEjes, validarRecorrido } from "./desbloqueo";

const eje = (id: string, progreso: number, publicadas = 2, esPreambulo = false) => ({ id, progreso, publicadas, esPreambulo });
const enOrden = { recorrido: "EN_ORDEN" as const, umbral: 60, abiertos: [] as string[] };
const abiertos = (estados: { id: string; abierto: boolean }[]) => estados.filter((e) => e.abierto).map((e) => e.id);

describe("estadoDeEjes", () => {
  it("libre o sin curso: todo abierto", () => {
    expect(abiertos(estadoDeEjes([eje("e1", 0), eje("e2", 0)], null))).toEqual(["e1", "e2"]);
    expect(abiertos(estadoDeEjes([eje("e1", 0), eje("e2", 0)], { ...enOrden, recorrido: "LIBRE" }))).toEqual(["e1", "e2"]);
  });

  it("en orden: el primero abierto y el siguiente al llegar al umbral", () => {
    expect(abiertos(estadoDeEjes([eje("e1", 40), eje("e2", 0), eje("e3", 0)], enOrden))).toEqual(["e1"]);
    expect(abiertos(estadoDeEjes([eje("e1", 60), eje("e2", 70), eje("e3", 0)], enOrden))).toEqual(["e1", "e2", "e3"]);
  });

  it("dice de qué eje depende uno cerrado", () => {
    const [, segundo] = estadoDeEjes([eje("e1", 10), eje("e2", 0)], enOrden);
    expect(segundo).toMatchObject({ abierto: false, motivo: "BLOQUEADO", requiereDe: "e1" });
  });

  it("el docente puede abrir un eje sin esperar el avance", () => {
    const estados = estadoDeEjes([eje("e1", 0), eje("e2", 0), eje("e3", 0)], { ...enOrden, abiertos: ["e2"] });
    expect(abiertos(estados)).toEqual(["e1", "e2"]);
    expect(estados[1].motivo).toBe("DOCENTE");
  });

  it("un eje abierto a mano sin avance no abre el siguiente", () => {
    expect(abiertos(estadoDeEjes([eje("e1", 100), eje("e2", 0), eje("e3", 0)], { ...enOrden, abiertos: ["e2"] }))).toEqual(["e1", "e2"]);
  });

  it("un eje sin sesiones publicadas no bloquea al siguiente", () => {
    expect(abiertos(estadoDeEjes([eje("e1", 80), eje("e2", 0, 0), eje("e3", 0)], enOrden))).toEqual(["e1", "e2", "e3"]);
  });

  it("el preámbulo siempre está abierto y no cuenta como anterior", () => {
    expect(abiertos(estadoDeEjes([eje("p", 0, 3, true), eje("e1", 0), eje("e2", 0)], enOrden))).toEqual(["p", "e1"]);
  });
});

describe("validarRecorrido", () => {
  it("acepta los recorridos y umbrales previstos", () => {
    expect(validarRecorrido({ recorrido: "EN_ORDEN", umbral: "75" })).toEqual({ recorrido: "EN_ORDEN", umbral: 75 });
    expect(validarRecorrido({ recorrido: "EN_ORDEN", umbral: 33 })).toBeNull();
    expect(validarRecorrido({ recorrido: "AL_REVES", umbral: 60 })).toBeNull();
  });
});
