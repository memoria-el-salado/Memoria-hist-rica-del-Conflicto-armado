import { describe, expect, it } from "vitest";
import {
  esRepeticion,
  limpiarMensaje,
  ordenarSolicitudes,
  sesionDeRuta,
  TEXTO_ALERTA_PREDETERMINADO,
  unirMensajes,
  validarTextoAlerta,
} from "./cuidado";

describe("validarTextoAlerta", () => {
  it("acepta el texto propuesto", () => {
    expect(validarTextoAlerta(TEXTO_ALERTA_PREDETERMINADO)).toBeNull();
  });

  it("pide explicar qué trae la sesión", () => {
    expect(validarTextoAlerta("Cuidado.")).toBe("Escribe qué trae la sesión y cómo cuidarse al verla.");
  });

  it("limita la extensión", () => {
    expect(validarTextoAlerta("a".repeat(1201))).toContain("supera");
  });
});

describe("limpiarMensaje", () => {
  it("el mensaje es opcional: vacío no es un error", () => {
    expect(limpiarMensaje("")).toEqual({ mensaje: null });
    expect(limpiarMensaje(undefined)).toEqual({ mensaje: null });
    expect(limpiarMensaje("   ")).toEqual({ mensaje: null });
  });

  it("guarda lo que el estudiante quiso decir", () => {
    expect(limpiarMensaje("  Me removió lo de mi abuelo.  ")).toEqual({ mensaje: "Me removió lo de mi abuelo." });
  });

  it("limita la extensión", () => {
    expect(limpiarMensaje("a".repeat(1001)).error).toContain("supera");
  });
});

describe("esRepeticion", () => {
  const hace = (min: number) => new Date(Date.now() - min * 60_000);

  it("una segunda solicitud de la misma sesión al poco es la misma", () => {
    expect(esRepeticion({ sesionId: "s1", creadoEn: new Date() }, [{ sesionId: "s1", creadoEn: hace(2) }])).toBe(true);
  });

  it("de otra sesión, o pasado un rato, es una nueva", () => {
    expect(esRepeticion({ sesionId: "s2", creadoEn: new Date() }, [{ sesionId: "s1", creadoEn: hace(2) }])).toBe(false);
    expect(esRepeticion({ sesionId: "s1", creadoEn: new Date() }, [{ sesionId: "s1", creadoEn: hace(30) }])).toBe(false);
  });

  it("también cuenta la solicitud general, sin sesión", () => {
    expect(esRepeticion({ sesionId: null, creadoEn: new Date() }, [{ sesionId: null, creadoEn: hace(1) }])).toBe(true);
  });
});

describe("ordenarSolicitudes", () => {
  it("pone arriba lo que espera respuesta, lo más reciente primero", () => {
    const d = (h: number) => new Date(2026, 8, 30, h);
    const orden = ordenarSolicitudes([
      { id: "atendida", creadoEn: d(12), atendidaEn: d(13) },
      { id: "vieja", creadoEn: d(8), atendidaEn: null },
      { id: "nueva", creadoEn: d(11), atendidaEn: null },
    ]);
    expect(orden.map((s) => s.id)).toEqual(["nueva", "vieja", "atendida"]);
  });
});

describe("sesionDeRuta", () => {
  it("reconoce la sesión en que está el estudiante", () => {
    expect(sesionDeRuta("/estudiante/sesion/abc123")).toBe("abc123");
    expect(sesionDeRuta("/estudiante/sesion/abc123?x=1")).toBe("abc123");
    expect(sesionDeRuta("/estudiante/mapa")).toBeNull();
  });
});

describe("unirMensajes", () => {
  it("suma lo nuevo a lo que ya esperaba", () => {
    expect(unirMensajes("No me siento bien.", "Prefiero hablar en el descanso.")).toBe(
      "No me siento bien.\n\nPrefiero hablar en el descanso."
    );
  });

  it("sin mensaje nuevo, deja el anterior", () => {
    expect(unirMensajes("No me siento bien.", null)).toBe("No me siento bien.");
  });

  it("no repite el mismo texto enviado dos veces", () => {
    expect(unirMensajes("No me siento bien.", "No me siento bien.")).toBe("No me siento bien.");
  });

  it("si antes no había mensaje, queda el nuevo", () => {
    expect(unirMensajes(null, "Necesito salir un momento.")).toBe("Necesito salir un momento.");
  });
});
