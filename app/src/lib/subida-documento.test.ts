import { describe, expect, it } from "vitest";
import {
  enMegas,
  esIdentificadorDeSubida,
  MAXIMO_DIRECTO,
  MAXIMO_SERVIDOR,
  validarPdf,
} from "./subida-documento";

const MB = 1024 * 1024;

/** La guía completa de El Salado del CNMH: la que hoy no cabe por Vercel. */
const GUIA_COMPLETA = { nombre: "el-salado.pdf", tipo: "application/pdf", tamano: 15.94 * MB };

describe("validarPdf", () => {
  it("acepta la guía completa del CNMH por la subida directa", () => {
    expect(validarPdf(GUIA_COMPLETA, MAXIMO_DIRECTO)).toBeNull();
  });

  it("acepta un PDF aunque el sistema no informe el tipo", () => {
    expect(validarPdf({ ...GUIA_COMPLETA, tipo: "" }, MAXIMO_DIRECTO)).toBeNull();
    expect(validarPdf({ ...GUIA_COMPLETA, nombre: "GUIA.PDF", tipo: "" }, MAXIMO_DIRECTO)).toBeNull();
  });

  it("rechaza lo que no es PDF", () => {
    expect(validarPdf({ nombre: "guia.docx", tipo: "application/msword", tamano: MB }, MAXIMO_DIRECTO)).toBe(
      "El archivo debe ser un PDF."
    );
  });

  it("pide un archivo cuando no hay ninguno", () => {
    expect(validarPdf({ nombre: "", tipo: "", tamano: 0 }, MAXIMO_DIRECTO)).toBe("Selecciona un archivo PDF.");
    expect(validarPdf({ nombre: "vacio.pdf", tipo: "application/pdf", tamano: 0 }, MAXIMO_DIRECTO)).toBe(
      "Selecciona un archivo PDF."
    );
  });

  it("aplica el límite del camino por el que viaja el archivo", () => {
    const grande = { ...GUIA_COMPLETA, tamano: 30 * MB };
    expect(validarPdf(grande, MAXIMO_DIRECTO)).toBeNull();
    expect(validarPdf(grande, MAXIMO_SERVIDOR)).toBe("El PDF pesa 30 MB y el máximo es 25 MB.");
  });

  it("acepta justo el máximo y rechaza un byte más", () => {
    expect(validarPdf({ ...GUIA_COMPLETA, tamano: MAXIMO_DIRECTO }, MAXIMO_DIRECTO)).toBeNull();
    expect(validarPdf({ ...GUIA_COMPLETA, tamano: MAXIMO_DIRECTO + 1 }, MAXIMO_DIRECTO)).not.toBeNull();
  });
});

describe("enMegas", () => {
  it("usa coma decimal por debajo de 10 MB y redondea por encima", () => {
    expect(enMegas(3.47 * MB)).toBe("3,5 MB");
    expect(enMegas(15.94 * MB)).toBe("16 MB");
  });
});

describe("esIdentificadorDeSubida", () => {
  it("acepta los identificadores que genera randomUUID", () => {
    expect(esIdentificadorDeSubida(crypto.randomUUID())).toBe(true);
  });

  it("rechaza rutas y cualquier otra cosa", () => {
    expect(esIdentificadorDeSubida("../otro/archivo")).toBe(false);
    expect(esIdentificadorDeSubida("documentos/abc.pdf")).toBe(false);
    expect(esIdentificadorDeSubida("")).toBe(false);
    expect(esIdentificadorDeSubida("0f8c2c3e-7a3b-4c1d-9e2f-1a2b3c4d5e6f/../x")).toBe(false);
  });
});
