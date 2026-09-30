import { describe, expect, it } from "vitest";
import {
  esGuiada,
  leerDatosGuiada,
  leerDilema,
  MINIMO_RESPUESTA,
  repartoDeOpciones,
  validarPlanteamiento,
  validarRespuestaGuiada,
} from "./actividades";

const DILEMA = { pregunta: "¿Qué camino tomarías frente a una injusticia en tu vereda?", opciones: ["Organizarse y denunciar", "Callar por miedo", "Irse del territorio"] };
const largo = (n: number) => "a".repeat(n);

describe("esGuiada", () => {
  it("reconoce los cinco formatos", () => {
    for (const t of ["meubico", "dilema", "investigar", "testimonios", "compromiso"]) expect(esGuiada(t)).toBe(true);
    expect(esGuiada("cartografia")).toBe(false);
  });
});

describe("validarPlanteamiento", () => {
  it("un dilema con pregunta y opciones", () => {
    expect(validarPlanteamiento("dilema", { pregunta: `  ${DILEMA.pregunta} `, opciones: [...DILEMA.opciones, "  "] })).toEqual({ datos: DILEMA });
  });

  it("pide al menos dos opciones distintas, y no más de cuatro", () => {
    expect(validarPlanteamiento("dilema", { pregunta: DILEMA.pregunta, opciones: ["Una sola"] })).toEqual({ error: "Un dilema necesita al menos dos opciones." });
    expect(validarPlanteamiento("dilema", { pregunta: DILEMA.pregunta, opciones: ["Callar", "callar"] })).toEqual({ error: "Hay dos opciones iguales." });
    expect("error" in validarPlanteamiento("dilema", { pregunta: DILEMA.pregunta, opciones: ["a1", "b2", "c3", "d4", "e5"] })).toBe(true);
  });

  it("una investigación solo lleva su pregunta", () => {
    expect(validarPlanteamiento("investigar", { pregunta: "¿Quién tiene hoy la tierra en tu municipio?" })).toEqual({
      datos: { pregunta: "¿Quién tiene hoy la tierra en tu municipio?" },
    });
    expect(validarPlanteamiento("investigar", { pregunta: "¿Y?" })).toEqual({ error: "Escribe la pregunta que van a investigar." });
  });

  it("los demás formatos no se plantean", () => {
    expect(validarPlanteamiento("compromiso", { pregunta: DILEMA.pregunta })).toEqual({ error: "Esta actividad no se plantea." });
  });
});

describe("leerDilema", () => {
  it("lee un planteamiento guardado o nada", () => {
    expect(leerDilema(DILEMA)).toEqual(DILEMA);
    expect(leerDilema(null)).toBeNull();
    expect(leerDilema({ pregunta: "x" })).toBeNull();
  });
});

describe("validarRespuestaGuiada", () => {
  it("me ubico: una reflexión con extensión", () => {
    expect(validarRespuestaGuiada("meubico", { texto: largo(MINIMO_RESPUESTA.meubico) }, null)).toEqual({ datos: {} });
    expect(validarRespuestaGuiada("meubico", { texto: "corto" }, null)).toEqual({ error: "Escribe tu reflexión (al menos 40 caracteres)." });
  });

  it("dilema: sin planteamiento no se responde", () => {
    expect(validarRespuestaGuiada("dilema", { texto: largo(80), datos: { opcion: "x" } }, null)).toEqual({ error: "Tu docente todavía no ha planteado este dilema." });
  });

  it("dilema: una opción del planteamiento y su justificación", () => {
    expect(validarRespuestaGuiada("dilema", { texto: largo(80), datos: { opcion: "Otra cosa" } }, DILEMA)).toEqual({ error: "Elige una de las opciones." });
    expect(validarRespuestaGuiada("dilema", { texto: "Porque sí", datos: { opcion: DILEMA.opciones[0] } }, DILEMA)).toEqual({
      error: "Justifica tu elección (al menos 60 caracteres).",
    });
    expect(validarRespuestaGuiada("dilema", { texto: largo(80), datos: { opcion: DILEMA.opciones[0] } }, DILEMA)).toEqual({ datos: { opcion: DILEMA.opciones[0] } });
  });

  it("investigar: lo encontrado y al menos una fuente", () => {
    expect(validarRespuestaGuiada("investigar", { texto: largo(130), datos: { fuentes: [" ", ""] } }, null)).toEqual({
      error: "Anota al menos una fuente: un libro, una página, una entrevista.",
    });
    expect(validarRespuestaGuiada("investigar", { texto: largo(130), datos: { fuentes: [" Entrevista a mi abuela ", ""] } }, null)).toEqual({
      datos: { fuentes: ["Entrevista a mi abuela"] },
    });
  });

  it("compromiso: se comparte solo si se pide", () => {
    expect(validarRespuestaGuiada("compromiso", { texto: largo(40) }, null)).toEqual({ datos: { compartido: false } });
    expect(validarRespuestaGuiada("compromiso", { texto: largo(40), datos: { compartido: true } }, null)).toEqual({ datos: { compartido: true } });
  });
});

describe("leerDatosGuiada", () => {
  it("lee lo que haya, ignorando lo que no es", () => {
    expect(leerDatosGuiada({ opcion: "A", fuentes: ["x", 3], compartido: "sí" })).toEqual({ opcion: "A", fuentes: ["x"], compartido: false });
    expect(leerDatosGuiada(null)).toEqual({ opcion: undefined, fuentes: undefined, compartido: false });
  });
});

describe("repartoDeOpciones", () => {
  it("cuenta cada opción, también las que nadie eligió", () => {
    expect(repartoDeOpciones(DILEMA.opciones, [DILEMA.opciones[0], DILEMA.opciones[0], "vieja opción"])).toEqual([
      { opcion: DILEMA.opciones[0], cuantos: 2 },
      { opcion: DILEMA.opciones[1], cuantos: 0 },
      { opcion: DILEMA.opciones[2], cuantos: 0 },
    ]);
  });
});
