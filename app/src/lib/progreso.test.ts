import { describe, expect, it } from "vitest";
import {
  TRABAJO_VACIO,
  progresoDeEje,
  progresoDelCurso,
  repartirEquitativo,
  revisarPesos,
  sesionCompletada,
  type TrabajoEnSesion,
} from "./progreso";

const con = (cambios: Partial<TrabajoEnSesion>): TrabajoEnSesion => ({ ...TRABAJO_VACIO, ...cambios });

describe("cuándo se da una sesión por hecha", () => {
  it("cada actividad se completa con el trabajo que pide", () => {
    expect(sesionCompletada("cartografia", con({ marcas: 1 }))).toBe(true);
    expect(sesionCompletada("copla", con({ respondio: true }))).toBe(true);
    expect(sesionCompletada("simulador", con({ simulacionValidada: true }))).toBe(true);
    expect(sesionCompletada("jardin", con({ flores: 2 }))).toBe(true);
    expect(sesionCompletada("diario", con({ entradasDiario: 1 }))).toBe(true);
    expect(sesionCompletada("zona", con({ anotaciones: 1 }))).toBe(true);
  });

  it("el trabajo de otra actividad no la completa", () => {
    // Marcar el mapa no completa una sesión de anotaciones.
    expect(sesionCompletada("zona", con({ marcas: 5 }))).toBe(false);
    expect(sesionCompletada("cartografia", con({ anotaciones: 3 }))).toBe(false);
    expect(sesionCompletada("simulador", con({ respondio: true }))).toBe(false);
  });

  it("una simulación sin validar todavía no cuenta", () => {
    expect(sesionCompletada("simulador", con({ simulacionValidada: false }))).toBe(false);
  });

  it("sin trabajo, ninguna actividad está hecha", () => {
    for (const actividad of ["zona", "copla", "cartografia", "simulador", "jardin", "diario"]) {
      expect(sesionCompletada(actividad, TRABAJO_VACIO)).toBe(false);
    }
  });
});

describe("avance dentro de un eje", () => {
  it("es la proporción de sesiones publicadas que están hechas", () => {
    expect(
      progresoDeEje([
        { publicada: true, completada: true },
        { publicada: true, completada: true },
        { publicada: true, completada: false },
        { publicada: true, completada: false },
      ])
    ).toBe(50);
  });

  it("las sesiones sin publicar no cuentan", () => {
    // Dos publicadas, una hecha: 50%, aunque haya tres sin publicar.
    expect(
      progresoDeEje([
        { publicada: true, completada: true },
        { publicada: true, completada: false },
        { publicada: false, completada: false },
        { publicada: false, completada: false },
        { publicada: false, completada: false },
      ])
    ).toBe(50);
  });

  it("un eje sin sesiones publicadas está en cero, no completo", () => {
    expect(progresoDeEje([{ publicada: false, completada: false }])).toBe(0);
    expect(progresoDeEje([])).toBe(0);
  });

  it("llega a 100 cuando están todas", () => {
    expect(
      progresoDeEje([
        { publicada: true, completada: true },
        { publicada: true, completada: true },
      ])
    ).toBe(100);
  });
});

describe("avance del curso según el peso de cada eje", () => {
  it("pondera cada eje por lo que vale", () => {
    // Cuatro ejes al 10% y dos al 30%. Solo uno de los pesados está hecho.
    const ejes = [
      { peso: 10, progreso: 0 },
      { peso: 10, progreso: 0 },
      { peso: 10, progreso: 0 },
      { peso: 10, progreso: 0 },
      { peso: 30, progreso: 100 },
      { peso: 30, progreso: 0 },
    ];
    expect(progresoDelCurso(ejes)).toBe(30);
  });

  it("completar un eje ligero mueve menos que uno pesado", () => {
    const ligero = [{ peso: 10, progreso: 100 }, { peso: 90, progreso: 0 }];
    const pesado = [{ peso: 10, progreso: 0 }, { peso: 90, progreso: 100 }];

    expect(progresoDelCurso(ligero)).toBe(10);
    expect(progresoDelCurso(pesado)).toBe(90);
  });

  it("un eje a medias aporta la mitad de su peso", () => {
    expect(progresoDelCurso([{ peso: 40, progreso: 50 }, { peso: 60, progreso: 0 }])).toBe(20);
  });

  it("si los pesos no suman 100, se normaliza sobre lo repartido", () => {
    // El docente solo repartió 50 puntos; el avance se mide sobre esos 50.
    expect(progresoDelCurso([{ peso: 25, progreso: 100 }, { peso: 25, progreso: 0 }])).toBe(50);
  });

  it("un eje con peso cero no aporta nada", () => {
    expect(progresoDelCurso([{ peso: 0, progreso: 100 }, { peso: 100, progreso: 40 }])).toBe(40);
  });

  it("sin pesos repartidos el avance es cero, no un error", () => {
    expect(progresoDelCurso([{ peso: 0, progreso: 100 }])).toBe(0);
    expect(progresoDelCurso([])).toBe(0);
  });
});

describe("reparto de los 100 puntos", () => {
  it("acepta un reparto que suma exactamente 100", () => {
    const revision = revisarPesos([10, 10, 10, 10, 30, 30]);
    expect(revision.valida).toBe(true);
    expect(revision.suma).toBe(100);
  });

  it("avisa de cuánto falta o cuánto sobra", () => {
    expect(revisarPesos([10, 10, 10]).mensaje).toContain("Faltan 70");
    expect(revisarPesos([60, 60]).mensaje).toContain("pasado en 20");
  });

  it("rechaza un peso negativo", () => {
    expect(revisarPesos([-10, 110]).valida).toBe(false);
  });

  it("reparte a partes iguales sin perder puntos por el redondeo", () => {
    for (const cantidad of [1, 3, 6, 7, 9]) {
      const pesos = repartirEquitativo(cantidad);
      expect(pesos).toHaveLength(cantidad);
      expect(pesos.reduce((s, p) => s + p, 0)).toBe(100);
    }
  });

  it("con seis ejes deja 17, 17, 17, 17, 16, 16", () => {
    expect(repartirEquitativo(6)).toEqual([17, 17, 17, 17, 16, 16]);
  });
});
