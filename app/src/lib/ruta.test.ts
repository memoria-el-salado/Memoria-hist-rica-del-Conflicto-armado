import { describe, expect, it } from "vitest";
import { pasosDeSesion, sesionPosterior, siguienteDelViaje, type EjeDeRuta } from "./ruta";

const s = (id: string, publicada = true, completada = false) => ({ id, codigo: id, titulo: id, publicada, completada });

describe("siguienteDelViaje", () => {
  it("es la primera sesión publicada y sin hacer, en orden", () => {
    const ejes: EjeDeRuta[] = [
      { id: "e1", nombre: "Uno", bloqueado: false, sesiones: [s("1.1", true, true), s("1.2", false), s("1.3")] },
      { id: "e2", nombre: "Dos", bloqueado: false, sesiones: [s("2.1")] },
    ];
    expect(siguienteDelViaje(ejes)).toEqual({ ejeId: "e1", sesion: s("1.3") });
  });

  it("salta los ejes cerrados para el curso", () => {
    const ejes: EjeDeRuta[] = [
      { id: "e1", nombre: "Uno", bloqueado: false, sesiones: [s("1.1", true, true)] },
      { id: "e2", nombre: "Dos", bloqueado: true, sesiones: [s("2.1")] },
      { id: "e3", nombre: "Tres", bloqueado: false, sesiones: [s("3.1")] },
    ];
    expect(siguienteDelViaje(ejes)?.sesion.id).toBe("3.1");
  });

  it("no hay siguiente si ya hizo todo lo publicado", () => {
    expect(siguienteDelViaje([{ id: "e1", nombre: "Uno", bloqueado: false, sesiones: [s("1.1", true, true), s("1.2", false)] }])).toBeNull();
  });
});

describe("sesionPosterior", () => {
  const lista = [{ id: "a" }, { id: "b" }, { id: "c" }];
  it("la que sigue en el orden del módulo", () => {
    expect(sesionPosterior(lista, "a")).toEqual({ id: "b" });
  });
  it("ninguna después de la última, ni para una que no está", () => {
    expect(sesionPosterior(lista, "c")).toBeNull();
    expect(sesionPosterior(lista, "x")).toBeNull();
  });
});

describe("pasosDeSesion", () => {
  const base = { material: 0, tieneTexto: false, tieneDocumento: false, pregunta: false, hecha: false, comentarios: 0 };

  it("van de la información a la retroalimentación", () => {
    expect(pasosDeSesion(base).map((p) => p.id)).toEqual(["explora", "reflexiona", "actividad", "retroalimentacion"]);
  });

  it("dice qué hay para explorar, en orden de preferencia", () => {
    expect(pasosDeSesion({ ...base, material: 2, tieneTexto: true }).at(0)?.detalle).toBe("2 recursos para leer, ver o escuchar");
    expect(pasosDeSesion({ ...base, tieneTexto: true }).at(0)?.detalle).toBe("El texto de la guía del CNMH");
    expect(pasosDeSesion({ ...base, tieneDocumento: true }).at(0)?.detalle).toBe("El apartado de la guía en PDF");
    expect(pasosDeSesion(base).at(0)?.detalle).toBe("Lo que tu docente presente en clase");
  });

  it("marca la actividad hecha y los comentarios recibidos", () => {
    const pasos = pasosDeSesion({ ...base, hecha: true, comentarios: 1 });
    expect(pasos[2].estado).toBe("LISTO");
    expect(pasos[3]).toMatchObject({ estado: "LISTO", detalle: "1 comentario de tu docente" });
    expect(pasosDeSesion(base)[3].estado).toBe("PENDIENTE");
  });

  it("la reflexión lleva a la pregunta orientadora si la hay", () => {
    expect(pasosDeSesion({ ...base, pregunta: true })[1].ancla).toBe("#pregunta-orientadora");
  });
});
