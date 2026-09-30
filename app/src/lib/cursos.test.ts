import { describe, expect, it } from "vitest";
import { cursoElegido, etiquetaCurso, puedeAsignar, repartirEnGrupos, validarCurso, validarGrupo } from "./cursos";

describe("validarCurso", () => {
  it("acepta un curso del año en curso y limpia los espacios", () => {
    expect(validarCurso({ nombre: "  Grado   10A ", anio: "2026" }, 2026)).toEqual({ datos: { nombre: "Grado 10A", anio: 2026 } });
  });

  it("deja preparar el curso del año siguiente, no el de dentro de dos", () => {
    expect(validarCurso({ nombre: "10A", anio: 2027 }, 2026)).toEqual({ datos: { nombre: "10A", anio: 2027 } });
    expect(validarCurso({ nombre: "10A", anio: 2028 }, 2026)).toEqual({ error: "El año lectivo debe estar entre 2024 y 2027." });
  });

  it("rechaza años que no son años", () => {
    expect("error" in validarCurso({ nombre: "10A", anio: "dos mil" }, 2026)).toBe(true);
    expect("error" in validarCurso({ nombre: "10A", anio: 2026.5 }, 2026)).toBe(true);
    expect("error" in validarCurso({ nombre: "10A", anio: 2019 }, 2026)).toBe(true);
  });

  it("pide un nombre con sentido", () => {
    expect(validarCurso({ nombre: " ", anio: 2026 }, 2026)).toEqual({ error: "Escribe el nombre del curso." });
    expect("error" in validarCurso({ nombre: "x".repeat(41), anio: 2026 }, 2026)).toBe(true);
  });
});

describe("validarGrupo", () => {
  it("acepta un nombre corto", () => {
    expect(validarGrupo("Los Robles")).toEqual({ datos: "Los Robles" });
  });

  it("rechaza uno vacío", () => {
    expect(validarGrupo(null)).toEqual({ error: "Escribe el nombre del grupo." });
  });
});

describe("etiquetaCurso", () => {
  it("junta nombre y año", () => {
    expect(etiquetaCurso({ nombre: "10A", anio: 2026 })).toBe("10A · 2026");
  });
});

describe("repartirEnGrupos", () => {
  it("empareja los grupos sin mover a quien ya estaba", () => {
    const reparto = repartirEnGrupos(["e1", "e2", "e3"], [
      { id: "g1", miembros: 2 },
      { id: "g2", miembros: 0 },
    ]);
    expect([...reparto.entries()]).toEqual([
      ["e1", "g2"],
      ["e2", "g2"],
      ["e3", "g1"],
    ]);
  });

  it("en empate va al primer grupo", () => {
    const reparto = repartirEnGrupos(["e1", "e2"], [
      { id: "g1", miembros: 1 },
      { id: "g2", miembros: 1 },
    ]);
    expect(reparto.get("e1")).toBe("g1");
    expect(reparto.get("e2")).toBe("g2");
  });

  it("sin grupos no reparte a nadie", () => {
    expect(repartirEnGrupos(["e1"], []).size).toBe(0);
  });
});

describe("cursoElegido", () => {
  const cursos = [{ id: "c1" }, { id: "c2" }];

  it("acepta un curso del docente", () => {
    expect(cursoElegido("c2", cursos)).toBe("c2");
    expect(cursoElegido(["c1", "c2"], cursos)).toBe("c1");
  });

  it("ignora un curso ajeno o ninguno", () => {
    expect(cursoElegido("otro", cursos)).toBeNull();
    expect(cursoElegido(undefined, cursos)).toBeNull();
  });
});

describe("puedeAsignar", () => {
  const mio = { rol: "ESTUDIANTE", creadoPorId: "d1", cursoId: "c1" };

  it("a un curso propio, sí", () => {
    expect(puedeAsignar("d1", mio, { curso: { docenteId: "d1" } })).toBe(true);
  });

  it("sacarlo de su curso también", () => {
    expect(puedeAsignar("d1", mio, { curso: null })).toBe(true);
  });

  it("no a un estudiante de otro docente", () => {
    expect(puedeAsignar("d1", { ...mio, creadoPorId: "d2" }, { curso: { docenteId: "d1" } })).toBe(false);
  });

  it("no a un curso de otro docente", () => {
    expect(puedeAsignar("d1", mio, { curso: { docenteId: "d2" } })).toBe(false);
  });

  it("a un grupo solo si es de su propio curso", () => {
    expect(puedeAsignar("d1", mio, { grupo: { cursoId: "c1", curso: { docenteId: "d1" } } })).toBe(true);
    expect(puedeAsignar("d1", mio, { grupo: { cursoId: "c2", curso: { docenteId: "d1" } } })).toBe(false);
    expect(puedeAsignar("d1", { ...mio, cursoId: null }, { grupo: { cursoId: "c1", curso: { docenteId: "d1" } } })).toBe(false);
  });

  it("no se asigna a un docente como si fuera estudiante", () => {
    expect(puedeAsignar("d1", { ...mio, rol: "DOCENTE" }, { curso: { docenteId: "d1" } })).toBe(false);
  });
});
