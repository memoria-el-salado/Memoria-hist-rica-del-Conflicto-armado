import { describe, expect, it } from "vitest";
import { avisosDeDocente, avisosDeEstudiante, contarNuevos, MAXIMO_AVISOS } from "./avisos";

const dia = (n: number) => new Date(Date.UTC(2026, 8, n));

describe("avisosDeEstudiante", () => {
  const comentarios = [
    { id: "c1", creadoEn: dia(10), leidoEn: null, docente: "Ana Pérez", sesion: { id: "s2", codigo: "1.2" }, enDiario: false },
    { id: "c2", creadoEn: dia(5), leidoEn: dia(6), docente: "Ana Pérez", sesion: null, enDiario: true },
  ];
  const sesiones = [
    { id: "s3", codigo: "1.3", titulo: "Los dos modelos", publicadaEn: dia(8) },
    { id: "s1", codigo: "1.1", titulo: "Me ubico", publicadaEn: dia(2) },
  ];

  it("un comentario sin leer es nuevo y lleva a la sesión comentada", () => {
    const [primero] = avisosDeEstudiante({ comentarios, sesiones, vistosEn: dia(9) });
    expect(primero).toMatchObject({ tipo: "COMENTARIO", nuevo: true, enlace: "/estudiante/sesion/s2", texto: "Ana Pérez comentó tu trabajo en la sesión 1.2." });
  });

  it("uno al diario lleva al diario", () => {
    const avisos = avisosDeEstudiante({ comentarios, sesiones, vistosEn: dia(9) });
    expect(avisos.find((a) => a.id === "comentario-c2")).toMatchObject({ enlace: "/estudiante/diario", nuevo: false });
  });

  it("una sesión es nueva si se publicó después de mirar la campana", () => {
    const avisos = avisosDeEstudiante({ comentarios: [], sesiones, vistosEn: dia(5) });
    expect(avisos.map((a) => [a.id, a.nuevo])).toEqual([
      ["sesion-s3", true],
      ["sesion-s1", false],
    ]);
  });

  it("quien nunca miró la campana tiene todo por ver", () => {
    expect(contarNuevos(avisosDeEstudiante({ comentarios, sesiones, vistosEn: null }))).toBe(3);
  });

  it("de lo más reciente a lo más antiguo, con un tope", () => {
    const muchas = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}`, codigo: `${i}`, titulo: "x", publicadaEn: dia(1 + (i % 28)) }));
    const avisos = avisosDeEstudiante({ comentarios: [], sesiones: muchas, vistosEn: null });
    expect(avisos).toHaveLength(MAXIMO_AVISOS);
    expect(avisos[0].fecha.getTime()).toBeGreaterThanOrEqual(avisos[1].fecha.getTime());
  });
});

describe("avisosDeDocente", () => {
  it("los pedidos de acompañamiento siempre son nuevos; las entregas, desde la última vez", () => {
    const avisos = avisosDeDocente({
      solicitudes: [{ id: "p1", estudiante: "Luis", creadoEn: dia(1) }],
      entregas: [
        { id: "r1", estudiante: "Marta", sesion: "3.1", fecha: dia(9) },
        { id: "r2", estudiante: "Juan", sesion: "2.2", fecha: dia(3) },
      ],
      vistosEn: dia(5),
    });
    expect(avisos.map((a) => [a.id, a.nuevo])).toEqual([
      ["entrega-r1", true],
      ["entrega-r2", false],
      ["solicitud-p1", true],
    ]);
    expect(avisos[2]).toMatchObject({ texto: "Luis pidió acompañamiento.", enlace: "/docente/panel#acompanamiento" });
    expect(contarNuevos(avisos)).toBe(2);
  });

  it("una entrada del diario, sin sesión, se dice como tal", () => {
    const [aviso] = avisosDeDocente({ solicitudes: [], entregas: [{ id: "d1", estudiante: "Marta", sesion: null, fecha: dia(2) }], vistosEn: null });
    expect(aviso.texto).toBe("Marta compartió contigo una entrada de su diario.");
  });
});
