import { describe, expect, it } from "vitest";
import {
  aWebVtt,
  cumple,
  estadoAccesibilidad,
  leerTranscripcion,
  requisitoDe,
  serializar,
} from "./transcripcion";

const VTT = `WEBVTT

NOTE Grabado en el retorno, 2010

1
00:00:00.000 --> 00:00:04.500
Nosotros vivíamos de la tierra.

00:00:04.500 --> 00:00:09.000 align:start
El tabaco se secaba
en los caneyes.
`;

describe("leerTranscripcion · WebVTT", () => {
  it("lee los subtítulos, con o sin identificador y ajustes", () => {
    const { transcripcion } = leerTranscripcion(VTT);
    expect(transcripcion?.sincronizada).toBe(true);
    expect(transcripcion?.cues).toEqual([
      { inicio: 0, fin: 4.5, texto: "Nosotros vivíamos de la tierra." },
      { inicio: 4.5, fin: 9, texto: "El tabaco se secaba en los caneyes." },
    ]);
  });

  it("ignora la marca de orden de bytes y los saltos de línea de Windows", () => {
    const { transcripcion } = leerTranscripcion("﻿" + VTT.replace(/\n/g, "\r\n"));
    expect(transcripcion?.cues).toHaveLength(2);
  });

  it("explica qué falla en un WebVTT mal escrito", () => {
    expect(leerTranscripcion("WEBVTT\n\n00:00:05.000 --> 00:00:02.000\nAl revés").error).toBe(
      "Línea 3: el subtítulo termina antes de empezar."
    );
    expect(leerTranscripcion("WEBVTT\n\nNOTE solo una nota").error).toBe("El archivo WebVTT no trae ningún subtítulo.");
  });
});

describe("leerTranscripcion · líneas con su minuto", () => {
  it("cada línea dura hasta que empieza la siguiente", () => {
    const { transcripcion } = leerTranscripcion("0:00 Nosotros vivíamos de la tierra.\n0:07 El tabaco se secaba en los caneyes.");
    expect(transcripcion?.sincronizada).toBe(true);
    expect(transcripcion?.cues[0]).toEqual({ inicio: 0, fin: 7, texto: "Nosotros vivíamos de la tierra." });
    expect(transcripcion?.cues[1].inicio).toBe(7);
    expect(transcripcion?.cues[1].fin).toBeGreaterThan(7);
  });

  it("admite corchetes, horas y separadores", () => {
    const { transcripcion } = leerTranscripcion("[00:00] Uno\n[1:02:03] - Dos");
    expect(transcripcion?.cues.map((c) => c.inicio)).toEqual([0, 3723]);
    expect(transcripcion?.cues[1].texto).toBe("Dos");
  });

  it("una línea sin tiempo continúa la anterior", () => {
    const { transcripcion } = leerTranscripcion("0:00 Nosotros vivíamos\nde la tierra.\n0:05 Y del tabaco.");
    expect(transcripcion?.cues[0].texto).toBe("Nosotros vivíamos de la tierra.");
  });

  it("avisa si un tiempo va antes que el anterior", () => {
    expect(leerTranscripcion("0:10 Primero\n0:05 Después").error).toBe("El tiempo 0:05 va antes que el de la línea anterior.");
  });
});

describe("leerTranscripcion · texto corrido", () => {
  it("sin tiempos es una transcripción, pero no sincronizada", () => {
    const { transcripcion } = leerTranscripcion("Nosotros vivíamos de la tierra. El tabaco se secaba en los caneyes.");
    expect(transcripcion).toEqual({
      sincronizada: false,
      cues: [],
      texto: "Nosotros vivíamos de la tierra. El tabaco se secaba en los caneyes.",
    });
  });

  it("pide algo si llega vacía", () => {
    expect(leerTranscripcion("   \n ").error).toBe("Escribe o sube la transcripción.");
  });
});

describe("WebVTT de salida", () => {
  it("se genera con el formato de tiempos del estándar y vuelve a leerse igual", () => {
    const { transcripcion } = leerTranscripcion("0:00 Uno\n1:05.5 Dos");
    const vtt = aWebVtt(transcripcion!.cues);
    expect(vtt.startsWith("WEBVTT\n\n00:00:00.000 --> 00:01:05.500\nUno")).toBe(true);
    expect(leerTranscripcion(vtt).transcripcion?.cues).toEqual(transcripcion?.cues);
  });

  it("se guarda como WebVTT si trae tiempos y como texto si no", () => {
    expect(serializar(leerTranscripcion("0:00 Uno").transcripcion!).startsWith("WEBVTT")).toBe(true);
    expect(serializar(leerTranscripcion("Solo texto").transcripcion!)).toBe("Solo texto");
  });
});

describe("qué exige cada recurso", () => {
  it("video subido: subtítulos sincronizados; video enlazado y audio: texto", () => {
    expect(requisitoDe("VIDEO", false)).toBe("sincronizada");
    expect(requisitoDe("VIDEO", true)).toBe("texto");
    expect(requisitoDe("AUDIO", false)).toBe("texto");
    expect(requisitoDe("IMAGEN", false)).toBe("ninguno");
  });

  it("un texto sin tiempos no basta para un video subido", () => {
    const texto = leerTranscripcion("Solo texto").transcripcion!;
    expect(cumple("texto", texto)).toBe(true);
    expect(cumple("sincronizada", texto)).toBe(false);
    expect(cumple("texto", null)).toBe(false);
  });
});

describe("estadoAccesibilidad", () => {
  const base = { tipo: "AUDIO", enlace: null, contexto: "Relato del retorno, 2010.", transcripcion: null };

  it("un audio sin transcripción no se publica", () => {
    const e = estadoAccesibilidad(base);
    expect(e.visibleParaEstudiantes).toBe(false);
    expect(e.pendiente).toBe("Falta la transcripción.");
  });

  it("con transcripción, sí", () => {
    expect(estadoAccesibilidad({ ...base, transcripcion: "Nosotros vivíamos de la tierra." }).visibleParaEstudiantes).toBe(true);
  });

  it("un video subido con texto sin tiempos sigue pendiente, y dice por qué", () => {
    const e = estadoAccesibilidad({ ...base, tipo: "VIDEO", transcripcion: "Solo texto" });
    expect(e.visibleParaEstudiantes).toBe(false);
    expect(e.pendiente).toContain("necesitan tiempos");
  });

  it("una imagen no necesita transcripción, pero sí una descripción de verdad", () => {
    expect(estadoAccesibilidad({ ...base, tipo: "IMAGEN", contexto: "Foto" }).descripcion).toBe(false);
    expect(estadoAccesibilidad({ ...base, tipo: "IMAGEN", contexto: "La plaza de El Salado en 2002." }).visibleParaEstudiantes).toBe(true);
  });
});
