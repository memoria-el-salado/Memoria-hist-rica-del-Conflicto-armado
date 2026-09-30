import { describe, expect, it } from "vitest";
import {
  armarHilos,
  LIMITES,
  posturaParaNuevo,
  puedeEscribir,
  puedeVerForo,
  repartirPosturas,
  validarMensaje,
  type Postura,
} from "./foros";

const ARGUMENTO =
  "La Ley 135 buscaba repartir las tierras incultas entre quienes las trabajaban sin poseerlas.";

describe("validarMensaje", () => {
  it("acepta un argumento desarrollado y con fuente", () => {
    expect(
      validarMensaje({ texto: ARGUMENTO, fuente: "Ley 135 de 1961, artículo 1", esRespuesta: false, esDocente: false })
    ).toBeNull();
  });

  it("exige la fuente en un argumento, como pide la guía", () => {
    expect(validarMensaje({ texto: ARGUMENTO, fuente: "", esRespuesta: false, esDocente: false })).toBe(
      "Indica la fuente en la que se apoya tu argumento."
    );
    expect(validarMensaje({ texto: ARGUMENTO, fuente: "   ", esRespuesta: false, esDocente: false })).not.toBeNull();
  });

  it("exige desarrollar el argumento", () => {
    expect(validarMensaje({ texto: "Estoy de acuerdo.", fuente: "Ley 135", esRespuesta: false, esDocente: false })).toBe(
      `Desarrolla tu argumento: escribe al menos ${LIMITES.argumentoMinimo} caracteres.`
    );
  });

  it("deja responder brevemente y sin fuente", () => {
    expect(validarMensaje({ texto: "¿En qué artículo lo dice?", esRespuesta: true, esDocente: false })).toBeNull();
  });

  it("deja al docente mediar sin fuente ni extensión mínima", () => {
    expect(validarMensaje({ texto: "Recuerden citar la ley.", esRespuesta: false, esDocente: true })).toBeNull();
  });

  it("rechaza mensajes vacíos o demasiado largos", () => {
    expect(validarMensaje({ texto: "  ", esRespuesta: true, esDocente: false })).toBe("Escribe tu mensaje.");
    expect(
      validarMensaje({ texto: "a".repeat(LIMITES.maximo + 1), esRespuesta: true, esDocente: false })
    ).toContain("supera");
  });
});

describe("reparto de roles", () => {
  it("quien entra sin rol va al bando con menos gente", () => {
    expect(posturaParaNuevo([])).toBe("A");
    expect(posturaParaNuevo(["A"])).toBe("B");
    expect(posturaParaNuevo(["A", "B", "B"])).toBe("A");
  });

  it("reparte a los que faltan sin mover a los que ya tienen rol", () => {
    const existentes = new Map<string, Postura>([
      ["ana", "A"],
      ["beto", "A"],
    ]);
    const reparto = repartirPosturas(["ana", "beto", "caro", "dani", "eli"], existentes);

    expect(reparto.has("ana")).toBe(false);
    expect(reparto.has("beto")).toBe(false);
    // Tras ana y beto en A, los tres nuevos equilibran: B, B y luego A o B.
    const todos = [...existentes.values(), ...reparto.values()];
    const a = todos.filter((p) => p === "A").length;
    expect(Math.abs(a - (todos.length - a))).toBeLessThanOrEqual(1);
    expect(reparto.get("caro")).toBe("B");
    expect(reparto.get("dani")).toBe("B");
  });

  it("ignora roles de estudiantes que ya no están en la lista", () => {
    const existentes = new Map<string, Postura>([["otro.curso", "A"]]);
    const reparto = repartirPosturas(["ana", "beto"], existentes);
    expect([...reparto.values()].sort()).toEqual(["A", "B"]);
  });
});

describe("armarHilos", () => {
  const t = (min: number) => new Date(2026, 8, 1, 10, min);
  const mensajes = [
    { id: "r2", respuestaAId: "a1", creadoEn: t(5) },
    { id: "a1", respuestaAId: null, creadoEn: t(1) },
    { id: "a2", respuestaAId: null, creadoEn: t(2) },
    { id: "r1", respuestaAId: "a1", creadoEn: t(3) },
    { id: "rr", respuestaAId: "r1", creadoEn: t(4) },
  ];

  it("deja cada argumento con sus respuestas, en orden de publicación", () => {
    const hilos = armarHilos(mensajes);
    expect(hilos.map((h) => h.id)).toEqual(["a1", "a2"]);
    expect(hilos[0].respuestas.map((r) => r.id)).toEqual(["r1", "rr", "r2"]);
    expect(hilos[1].respuestas).toEqual([]);
  });

  it("no se queda en un bucle si los datos traen un ciclo", () => {
    const ciclo = [
      { id: "x", respuestaAId: "y", creadoEn: t(1) },
      { id: "y", respuestaAId: "x", creadoEn: t(2) },
    ];
    expect(() => armarHilos(ciclo)).not.toThrow();
  });
});

describe("quién ve y escribe en un foro", () => {
  const docente = { rol: "DOCENTE" as const, id: "doc1", creadoPorId: "admin" };
  const suEstudiante = { rol: "ESTUDIANTE" as const, id: "est1", creadoPorId: "doc1" };
  const otroEstudiante = { rol: "ESTUDIANTE" as const, id: "est2", creadoPorId: "doc2" };
  const otroDocente = { rol: "DOCENTE" as const, id: "doc2", creadoPorId: "admin" };
  const foro = { autorId: "doc1", abierto: true };

  it("lo ven su docente y los estudiantes de ese docente", () => {
    expect(puedeVerForo(docente, foro)).toBe(true);
    expect(puedeVerForo(suEstudiante, foro)).toBe(true);
  });

  it("no lo ven otros docentes ni sus estudiantes", () => {
    expect(puedeVerForo(otroDocente, foro)).toBe(false);
    expect(puedeVerForo(otroEstudiante, foro)).toBe(false);
  });

  it("un foro sin autor no lo ve nadie", () => {
    expect(puedeVerForo(docente, { autorId: null })).toBe(false);
  });

  it("cerrado, el estudiante lo lee pero ya no escribe; el docente sí", () => {
    const cerrado = { autorId: "doc1", abierto: false };
    expect(puedeVerForo(suEstudiante, cerrado)).toBe(true);
    expect(puedeEscribir(suEstudiante, cerrado)).toBe(false);
    expect(puedeEscribir(docente, cerrado)).toBe(true);
  });
});
