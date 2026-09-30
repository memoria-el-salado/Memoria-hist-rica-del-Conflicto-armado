import { describe, expect, it } from "vitest";
import {
  duracion,
  extensionDe,
  LIMITES_MARCA,
  mimeBase,
  quienesCuentan,
  tipoDeAdjuntoCoincide,
  validarAdjunto,
  validarMarca,
} from "./cartografia";

describe("formatos de adjunto", () => {
  it("reconoce lo que graba cada navegador", () => {
    expect(extensionDe("audio", "audio/webm;codecs=opus")).toBe("webm");
    expect(extensionDe("audio", "audio/mp4")).toBe("m4a");
    expect(extensionDe("audio", "audio/ogg; codecs=opus")).toBe("ogg");
  });

  it("no confunde un audio con una foto", () => {
    expect(extensionDe("foto", "audio/webm")).toBeNull();
    expect(extensionDe("audio", "image/jpeg")).toBeNull();
    expect(tipoDeAdjuntoCoincide("foto", "image/jpeg")).toBe(true);
    expect(tipoDeAdjuntoCoincide("foto", "text/html")).toBe(false);
  });

  it("quita los parámetros del tipo", () => {
    expect(mimeBase("Audio/WebM; codecs=opus")).toBe("audio/webm");
  });
});

describe("validarAdjunto", () => {
  it("acepta una grabación corta y una foto reducida", () => {
    expect(validarAdjunto("audio", { mime: "audio/webm;codecs=opus", tamano: 400_000 })).toBeNull();
    expect(validarAdjunto("foto", { mime: "image/jpeg", tamano: 350_000 })).toBeNull();
  });

  it("rechaza formatos que no se pueden guardar", () => {
    expect(validarAdjunto("foto", { mime: "image/heic", tamano: 1000 })).toBe("Esa imagen no se puede usar. Prueba con una foto JPG o PNG.");
    expect(validarAdjunto("audio", { mime: "video/webm", tamano: 1000 })).toMatch(/formato/);
  });

  it("rechaza archivos vacíos o demasiado pesados", () => {
    expect(validarAdjunto("audio", { mime: "audio/webm", tamano: 0 })).toBe("El archivo está vacío.");
    expect(validarAdjunto("audio", { mime: "audio/webm", tamano: LIMITES_MARCA.audioBytes + 1 })).toBe("La grabación es demasiado larga.");
    expect(validarAdjunto("foto", { mime: "image/png", tamano: LIMITES_MARCA.fotoBytes + 1 })).toBe("La foto pesa demasiado aun reducida.");
  });
});

describe("validarMarca", () => {
  it("con lugar y relato escrito, sí", () => {
    expect(validarMarca({ lugar: "El patio de mi abuela", relato: "Olía a leña.", conAudio: false })).toBeNull();
  });

  it("el relato puede ser solo grabado", () => {
    expect(validarMarca({ lugar: "La plaza", relato: "  ", conAudio: true })).toBeNull();
  });

  it("sin relato de ninguna clase, no", () => {
    expect(validarMarca({ lugar: "La plaza", relato: "", conAudio: false })).toBe("Cuenta qué te evoca el lugar: escríbelo o grábalo.");
  });

  it("el lugar siempre lleva nombre", () => {
    expect(validarMarca({ lugar: " ", relato: "algo", conAudio: false })).toBe("Escribe el nombre del lugar.");
  });
});

describe("duracion", () => {
  it("minutos y segundos", () => {
    expect(duracion(18)).toBe("0:18");
    expect(duracion(65.4)).toBe("1:05");
    expect(duracion(180)).toBe("3:00");
  });
});

describe("quienesCuentan", () => {
  const miembros = new Map([["g1", ["e1", "e2", "e3"]]]);

  it("una marca personal cuenta solo para su autor", () => {
    expect(quienesCuentan({ autorId: "e1", grupoId: null }, miembros)).toEqual(["e1"]);
  });

  it("una de grupo cuenta para todos sus miembros, sin repetir al autor", () => {
    expect(quienesCuentan({ autorId: "e1", grupoId: "g1" }, miembros)).toEqual(["e1", "e2", "e3"]);
  });

  it("si el autor ya no está en el grupo, cuenta para él y para el grupo", () => {
    expect(quienesCuentan({ autorId: "e9", grupoId: "g1" }, miembros)).toEqual(["e9", "e1", "e2", "e3"]);
  });
});
