import { describe, expect, it } from "vitest";
import { detalleDeTrabajo, estaPendiente } from "./revision";

describe("detalleDeTrabajo", () => {
  it("el mapa de la despensa dice qué ubicó y dónde", () => {
    expect(
      detalleDeTrabajo({ clase: "RESPUESTA", pantalla: "despensa", datos: { ubicaciones: { aguacate: "carmen" }, versos: "Mi tierra" } })
    ).toEqual({ etiqueta: "Mapa de la despensa", detalle: ["Ubicó: Aguacate → El Carmen de Bolívar", "Versos: Mi tierra"] });
  });

  it("el dilema, qué eligió; la investigación, sus fuentes", () => {
    expect(detalleDeTrabajo({ clase: "RESPUESTA", pantalla: "dilema", datos: { opcion: "Organizarse" } }).detalle).toEqual(["Eligió: Organizarse"]);
    expect(detalleDeTrabajo({ clase: "RESPUESTA", pantalla: "investigar", datos: { fuentes: ["Abuela", "CNMH"] } }).detalle).toEqual([
      "Fuentes: Abuela · CNMH",
    ]);
  });

  it("el compromiso, si lo compartió", () => {
    expect(detalleDeTrabajo({ clase: "RESPUESTA", pantalla: "compromiso", datos: { compartido: true } }).detalle).toEqual([
      "Lo compartió con su curso",
    ]);
  });

  it("la simulación y el diario tienen su propio resumen", () => {
    expect(detalleDeTrabajo({ clase: "SIMULACION", equidad: 82 })).toEqual({ etiqueta: "Simulación de tierras", detalle: ["Índice de equidad: 82 de 100"] });
    expect(detalleDeTrabajo({ clase: "DIARIO", emocion: "Esperanza" })).toEqual({ etiqueta: "Diario compartido", detalle: ["Emoción: Esperanza"] });
  });

  it("una respuesta escrita sin más datos", () => {
    expect(detalleDeTrabajo({ clase: "RESPUESTA", pantalla: "zona" })).toEqual({ etiqueta: "Respuesta escrita", detalle: [] });
  });
});

describe("estaPendiente", () => {
  const dia = (n: number) => new Date(Date.UTC(2026, 8, n));

  it("sin comentarios, pendiente", () => {
    expect(estaPendiente(dia(5), [])).toBe(true);
  });

  it("comentado después de la última versión, al día", () => {
    expect(estaPendiente(dia(5), [{ creadoEn: dia(6) }])).toBe(false);
  });

  it("si el estudiante lo reescribió después del comentario, vuelve a estar pendiente", () => {
    expect(estaPendiente(dia(8), [{ creadoEn: dia(6) }])).toBe(true);
  });
});
