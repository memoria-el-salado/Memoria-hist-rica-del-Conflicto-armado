import { describe, expect, it } from "vitest";
import { cambiosDeAsignacion, leerDestino, tieneAula, valorDeDestino } from "./aulas";

describe("leerDestino", () => {
  it("entiende sin docente, con docente y en un curso", () => {
    expect(leerDestino("")).toEqual({ docenteId: null, cursoId: null });
    expect(leerDestino("d:abc123")).toEqual({ docenteId: "abc123", cursoId: null });
    expect(leerDestino("c:cur_9")).toEqual({ cursoId: "cur_9" });
  });

  it("rechaza lo que no reconoce", () => {
    expect(leerDestino("x:abc")).toBeNull();
    expect(leerDestino("d:")).toBeNull();
    expect(leerDestino("c:a b")).toBeNull();
  });
});

describe("valorDeDestino", () => {
  const docentes = new Set(["doc1"]);
  it("el curso manda; sin curso, el docente; si no, sin docente", () => {
    expect(valorDeDestino({ creadoPorId: "doc1", cursoId: "c1" }, docentes)).toBe("c:c1");
    expect(valorDeDestino({ creadoPorId: "doc1", cursoId: null }, docentes)).toBe("d:doc1");
    expect(valorDeDestino({ creadoPorId: "admin", cursoId: null }, docentes)).toBe("");
    expect(valorDeDestino({ creadoPorId: null, cursoId: null }, docentes)).toBe("");
  });
});

describe("cambiosDeAsignacion", () => {
  const est = { creadoPorId: "doc1", cursoId: "c1", grupoId: "g1" };

  it("no cambia nada si ya está ahí", () => {
    expect(cambiosDeAsignacion(est, { docenteId: "doc1", cursoId: "c1" })).toBeNull();
  });

  it("al cambiar de curso o de docente sale de su grupo", () => {
    expect(cambiosDeAsignacion(est, { docenteId: "doc1", cursoId: "c2" })).toEqual({ creadoPorId: "doc1", cursoId: "c2", grupoId: null });
    expect(cambiosDeAsignacion(est, { docenteId: "doc2", cursoId: null })).toEqual({ creadoPorId: "doc2", cursoId: null, grupoId: null });
  });

  it("quitarle el docente lo deja sin aula", () => {
    expect(cambiosDeAsignacion(est, { docenteId: null, cursoId: null })).toEqual({ creadoPorId: null, cursoId: null, grupoId: null });
  });
});

describe("tieneAula", () => {
  it("solo un docente a cargo conecta al estudiante con los contenidos", () => {
    expect(tieneAula({ rol: "DOCENTE" })).toBe(true);
    expect(tieneAula({ rol: "ADMIN" })).toBe(false);
    expect(tieneAula(null)).toBe(false);
  });
});
