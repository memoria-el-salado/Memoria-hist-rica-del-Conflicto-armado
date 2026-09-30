import { describe, expect, it } from "vitest";
import {
  coplaCompleta,
  leerDatosCopla,
  limpiarUbicaciones,
  LUGARES,
  MINIMO_UBICACIONES,
  PRODUCTOS,
  resumenDelCurso,
  validarCopla,
} from "./copla";

const cuatro = { aguacate: "carmen", tabaco: "ovejas", hamacas: "jacinto", name: "salado" };
const EXPLICACION = "Porque en sus municipios se siembra y se produce casi todo lo que come la región.";

describe("datos de la actividad", () => {
  it("no repite lugares ni productos", () => {
    expect(new Set(LUGARES.map((l) => l.id)).size).toBe(LUGARES.length);
    expect(new Set(PRODUCTOS.map((p) => p.id)).size).toBe(PRODUCTOS.length);
  });

  it("las coordenadas caen en los Montes de María", () => {
    for (const l of LUGARES.filter((x) => x.coordenada)) {
      const [lat, lon] = l.coordenada!;
      expect(lat).toBeGreaterThan(9.2);
      expect(lat).toBeLessThan(10.1);
      expect(lon).toBeGreaterThan(-75.7);
      expect(lon).toBeLessThan(-74.7);
    }
  });
});

describe("limpiarUbicaciones", () => {
  it("se queda con los pares conocidos", () => {
    expect(limpiarUbicaciones({ ...cuatro, platano: "carmen", cafe: "marte", gaitas: 3 })).toEqual(cuatro);
  });

  it("ignora lo que no es un objeto", () => {
    expect(limpiarUbicaciones(null)).toEqual({});
    expect(limpiarUbicaciones(["aguacate"])).toEqual({});
    expect(limpiarUbicaciones("aguacate")).toEqual({});
  });
});

describe("leerDatosCopla", () => {
  it("lee lo guardado", () => {
    expect(leerDatosCopla({ ubicaciones: cuatro, versos: "Mi tierra" })).toEqual({ ubicaciones: cuatro, versos: "Mi tierra" });
  });

  it("sin datos, vacío", () => {
    expect(leerDatosCopla(null)).toEqual({ ubicaciones: {}, versos: "" });
  });
});

describe("validarCopla", () => {
  it("con el mapa y la explicación, sí", () => {
    expect(validarCopla({ ubicaciones: cuatro, texto: EXPLICACION, versos: "" })).toBeNull();
  });

  it("pide ubicar suficientes productos, diciendo cuántos lleva", () => {
    expect(validarCopla({ ubicaciones: { aguacate: "carmen" }, texto: EXPLICACION, versos: "" })).toBe(
      `Ubica al menos ${MINIMO_UBICACIONES} productos en el mapa (llevas 1).`
    );
  });

  it("pide la explicación de la despensa", () => {
    expect(validarCopla({ ubicaciones: cuatro, texto: "Porque sí.", versos: "" })).toMatch(/despensa del Caribe/);
  });
});

describe("coplaCompleta", () => {
  it("hace falta el mapa y la respuesta", () => {
    expect(coplaCompleta(MINIMO_UBICACIONES, true)).toBe(true);
    expect(coplaCompleta(MINIMO_UBICACIONES - 1, true)).toBe(false);
    expect(coplaCompleta(10, false)).toBe(false);
  });
});

describe("resumenDelCurso", () => {
  it("cuenta, por producto, dónde lo ubicó cada quien", () => {
    const resumen = resumenDelCurso([
      { aguacate: "carmen", tabaco: "ovejas" },
      { aguacate: "carmen", tabaco: "carmen" },
      { aguacate: "jacinto" },
    ]);
    expect(resumen.get("aguacate")).toEqual([
      { lugarId: "carmen", cuantos: 2 },
      { lugarId: "jacinto", cuantos: 1 },
    ]);
    expect(resumen.get("tabaco")).toEqual([
      { lugarId: "carmen", cuantos: 1 },
      { lugarId: "ovejas", cuantos: 1 },
    ]);
    expect(resumen.has("cafe")).toBe(false);
  });
});
