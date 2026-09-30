import { describe, expect, it } from "vitest";
import { ordenarHilos, validarAnotacion } from "./anotaciones";
import { armarHilos } from "./foros";

const dia = (n: number) => new Date(Date.UTC(2026, 8, n));

describe("ordenarHilos", () => {
  const hilos = [
    { id: "a", creadoEn: dia(1), destacada: true, meSirve: 2 },
    { id: "b", creadoEn: dia(3), destacada: false, meSirve: 9 },
    { id: "c", creadoEn: dia(2), destacada: true, meSirve: 5 },
  ];

  it("recientes: todos, lo último arriba", () => {
    expect(ordenarHilos(hilos, "RECIENTES").map((h) => h.id)).toEqual(["b", "c", "a"]);
  });

  it("destacados: solo los del docente, primero los que más sirvieron", () => {
    expect(ordenarHilos(hilos, "DESTACADOS").map((h) => h.id)).toEqual(["c", "a"]);
  });
});

describe("hilos de anotaciones", () => {
  it("una respuesta a una respuesta se queda en el hilo de la anotación", () => {
    const hilos = armarHilos([
      { id: "r", respuestaAId: null, creadoEn: dia(1) },
      { id: "r1", respuestaAId: "r", creadoEn: dia(2) },
      { id: "r2", respuestaAId: "r1", creadoEn: dia(3) },
    ]);
    expect(hilos).toHaveLength(1);
    expect(hilos[0].respuestas.map((x) => x.id)).toEqual(["r1", "r2"]);
  });
});

describe("validarAnotacion", () => {
  it("pide texto y pone un tope", () => {
    expect(validarAnotacion("  ")).toBe("Escribe tu anotación antes de publicar.");
    expect(validarAnotacion("a".repeat(2001))).toMatch(/no puede pasar/);
    expect(validarAnotacion("¿Esto pasó también en Ovejas?")).toBeNull();
  });
});
