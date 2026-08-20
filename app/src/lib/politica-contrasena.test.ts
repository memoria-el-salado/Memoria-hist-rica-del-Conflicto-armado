import { describe, expect, it } from "vitest";
import { evaluarContrasena, generarContrasenaTemporal, LONGITUD_MINIMA } from "./politica-contrasena";

/** Contraseña que cumple todas las reglas, para partir de una base válida. */
const VALIDA = "Kd7#pRvm.Zq";

describe("evaluarContrasena", () => {
  it("acepta una contraseña que cumple la política", () => {
    const r = evaluarContrasena(VALIDA);
    expect(r.valida).toBe(true);
    expect(r.errores).toEqual([]);
  });

  it("exige la longitud mínima", () => {
    const r = evaluarContrasena("Kd7#pR");
    expect(r.valida).toBe(false);
    expect(r.errores).toContain(`Debe tener al menos ${LONGITUD_MINIMA} caracteres.`);
  });

  it("exige minúscula, mayúscula, número y símbolo", () => {
    expect(evaluarContrasena("KD7#PRVM.ZQ").errores).toContain(
      "Debe incluir al menos una letra minúscula."
    );
    expect(evaluarContrasena("kd7#prvm.zq").errores).toContain(
      "Debe incluir al menos una letra mayúscula."
    );
    expect(evaluarContrasena("Kdx#pRvm.Zq").errores).toContain(
      "Debe incluir al menos un número."
    );
    expect(evaluarContrasena("Kd7xpRvm8Zq").errores).toContain(
      "Debe incluir al menos un símbolo, por ejemplo . - _ # $ %"
    );
  });

  it("rechaza los espacios", () => {
    expect(evaluarContrasena("Kd7# pRvm.Zq").errores).toContain("No puede contener espacios.");
  });

  it("rechaza palabras comunes y el nombre de la plataforma", () => {
    const mensaje = "No puede contener palabras comunes ni el nombre de la plataforma.";
    expect(evaluarContrasena("Password9#xy").errores).toContain(mensaje);
    expect(evaluarContrasena("ElSalado9#xy").errores).toContain(mensaje);
  });

  it("ignora los acentos al buscar palabras prohibidas", () => {
    expect(evaluarContrasena("Contraseña9#x").errores).toContain(
      "No puede contener palabras comunes ni el nombre de la plataforma."
    );
  });

  it("rechaza que la contraseña contenga el nombre o el usuario", () => {
    const r = evaluarContrasena("Rivera7#xkqm", ["prof.rivera", "Profesor Rivera"]);
    expect(r.valida).toBe(false);
    expect(r.errores).toContain("No puede contener el nombre ni el usuario de la persona.");
  });

  it("no confunde un dato personal demasiado corto", () => {
    // "Ana" tiene tres letras: es tan común que exigirlo daría falsos positivos.
    expect(evaluarContrasena(VALIDA, ["Ana"]).valida).toBe(true);
  });

  it("rechaza repetir el mismo carácter tres veces", () => {
    expect(evaluarContrasena("Kdaaa7#pRvm").errores).toContain(
      "No puede repetir el mismo carácter tres veces seguidas."
    );
  });

  it("rechaza secuencias ascendentes y descendentes", () => {
    const mensaje = "No puede contener secuencias como 1234 o abcd.";
    expect(evaluarContrasena("Kd1234#pRvm").errores).toContain(mensaje);
    expect(evaluarContrasena("Kdedcba#pRv9").errores).toContain(mensaje);
  });

  it("acumula todos los incumplimientos en una sola revisión", () => {
    const r = evaluarContrasena("abc");
    expect(r.valida).toBe(false);
    expect(r.errores.length).toBeGreaterThan(2);
  });

  it("rechaza la contraseña vacía", () => {
    const r = evaluarContrasena("");
    expect(r.valida).toBe(false);
    expect(r.fuerza).toBe(0);
  });

  it("califica la fuerza de menor a mayor", () => {
    expect(evaluarContrasena("abc").fuerza).toBeLessThan(evaluarContrasena(VALIDA).fuerza);
    expect(evaluarContrasena("Kd7#pRvm.ZqTgW5").fuerza).toBe(4);
  });
});

describe("generarContrasenaTemporal", () => {
  it("propone contraseñas que ya cumplen la política", () => {
    for (let i = 0; i < 200; i++) {
      const resultado = evaluarContrasena(generarContrasenaTemporal());
      expect(resultado.errores).toEqual([]);
      expect(resultado.valida).toBe(true);
    }
  });

  it("no repite la misma contraseña una y otra vez", () => {
    const generadas = new Set(Array.from({ length: 50 }, () => generarContrasenaTemporal()));
    expect(generadas.size).toBeGreaterThan(40);
  });

  it("se puede dictar: sin espacios ni tildes", () => {
    for (let i = 0; i < 50; i++) {
      expect(generarContrasenaTemporal()).toMatch(/^[A-Za-z0-9#$%.\-_+=]+$/);
    }
  });
});
