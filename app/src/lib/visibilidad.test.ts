import { describe, expect, it } from "vitest";
import { anotacionesVisiblesPara, aportesVisiblesPara, puedeVerAnotacion, puedeVerAporte } from "./visibilidad";

describe("puedeVerAporte", () => {
  const autor = { id: "e1", creadoPorId: "d1", cursoId: "c1" };

  it("el autor y sus compañeros de curso", () => {
    expect(puedeVerAporte({ rol: "ESTUDIANTE", id: "e1", creadoPorId: "d1", cursoId: "c1" }, autor)).toBe(true);
    expect(puedeVerAporte({ rol: "ESTUDIANTE", id: "e2", creadoPorId: "d1", cursoId: "c1" }, autor)).toBe(true);
  });

  it("no un estudiante de otro curso, aunque sea del mismo docente", () => {
    expect(puedeVerAporte({ rol: "ESTUDIANTE", id: "e3", creadoPorId: "d1", cursoId: "c2" }, autor)).toBe(false);
    expect(puedeVerAporte({ rol: "ESTUDIANTE", id: "e4", creadoPorId: "d1", cursoId: null }, autor)).toBe(false);
  });

  it("sin curso, los estudiantes del mismo docente que tampoco tienen curso", () => {
    const suelto = { id: "e5", creadoPorId: "d1", cursoId: null };
    expect(puedeVerAporte({ rol: "ESTUDIANTE", id: "e6", creadoPorId: "d1", cursoId: null }, suelto)).toBe(true);
  });

  it("no un estudiante de otro docente", () => {
    expect(puedeVerAporte({ rol: "ESTUDIANTE", id: "x", creadoPorId: "d2", cursoId: "c1" }, autor)).toBe(false);
  });

  it("el docente del autor, sí; otro docente o el administrador, no", () => {
    expect(puedeVerAporte({ rol: "DOCENTE", id: "d1", creadoPorId: "a", cursoId: null }, autor)).toBe(true);
    expect(puedeVerAporte({ rol: "DOCENTE", id: "d2", creadoPorId: "a", cursoId: null }, autor)).toBe(false);
    expect(puedeVerAporte({ rol: "ADMIN", id: "a", creadoPorId: null, cursoId: null }, autor)).toBe(false);
  });

  it("un estudiante sin docente no ve la de otro sin docente", () => {
    expect(puedeVerAporte({ rol: "ESTUDIANTE", id: "y", creadoPorId: null, cursoId: null }, { id: "z", creadoPorId: null, cursoId: null })).toBe(false);
  });
});

describe("aportes sin autor", () => {
  it("el contenido curado, sin autor, lo ve cualquiera", () => {
    expect(puedeVerAporte({ rol: "ESTUDIANTE", id: "e1", creadoPorId: "d1", cursoId: "c1" }, null)).toBe(true);
  });
});

describe("aportesVisiblesPara", () => {
  it("los propios y los del mismo docente y curso", () => {
    expect(aportesVisiblesPara({ id: "e1", creadoPorId: "d1", cursoId: "c1" })).toEqual([
      { autorId: "e1" },
      { autor: { creadoPorId: "d1", cursoId: "c1" } },
    ]);
  });

  it("sin docente, solo los propios", () => {
    expect(aportesVisiblesPara({ id: "e1", creadoPorId: null, cursoId: null })).toEqual([{ autorId: "e1" }]);
  });
});

describe("anotaciones", () => {
  const estudiante = { rol: "ESTUDIANTE", id: "e1", creadoPorId: "d1", cursoId: "c1" };

  it("el estudiante lee lo que anotó su docente", () => {
    expect(puedeVerAnotacion(estudiante, { id: "d1", creadoPorId: "a", cursoId: null })).toBe(true);
  });

  it("pero no lo de otro docente", () => {
    expect(puedeVerAnotacion(estudiante, { id: "d2", creadoPorId: "a", cursoId: null })).toBe(false);
  });

  it("y, como en los aportes, lo de su curso", () => {
    expect(puedeVerAnotacion(estudiante, { id: "e2", creadoPorId: "d1", cursoId: "c1" })).toBe(true);
    expect(puedeVerAnotacion(estudiante, { id: "e3", creadoPorId: "d1", cursoId: "c2" })).toBe(false);
  });

  it("la condición de consulta suma al docente", () => {
    expect(anotacionesVisiblesPara({ id: "e1", creadoPorId: "d1", cursoId: "c1" })).toEqual([
      { autorId: "e1" },
      { autor: { creadoPorId: "d1", cursoId: "c1" } },
      { autorId: "d1" },
    ]);
  });
});
