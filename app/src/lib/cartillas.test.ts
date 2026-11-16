import { describe, expect, it } from "vitest";
import { cartillasDeSesion, codigosDePagina, leerUbicaciones, paginaDeSesion, ubicarCodigos } from "./cartillas";

// Un índice como el «Mapa del viaje» de la cartilla: nombra todas las sesiones.
const INDICE = Array.from({ length: 6 }, (_, e) => [1, 2, 3, 4].map((s) => `${e + 1}.${s} Sesión`).join(" ")).join(" ");

describe("codigosDePagina", () => {
  it("reconoce sesiones y subsecciones sin confundirlas", () => {
    expect([...codigosDePagina("1.2 Arraigos 1.2.1 Tierra de abundancia")].sort()).toEqual(["1.2", "1.2.1"]);
  });

  it("no toma el «1.» de los títulos de eje ni los años", () => {
    expect([...codigosDePagina("1. IDENTIDAD, ESPACIO Y TIERRA. Ley 135 de 1961, p. 19.")]).toEqual([]);
  });
});

describe("ubicarCodigos", () => {
  // Así es, en esencia, la cartilla recortada del estudiante.
  const paginas = [
    "Portada",
    INDICE,
    "1 Identidad, espacio y tierra 1.1 Me ubico 1.2 Arraigos 1.3 Los dos modelos 1.4 Repartición",
    "Habla de tu experiencia 1.1 Me ubico",
    "1.2 Arraigos campesinos 1.2.1 Tierra de abundancia",
    "Sigue la copla, sin códigos",
    "1.3 Los dos modelos 1.3.1 Argumentos",
    "1.4.1 Actividad 1.4 Ejercicios de repartición",
  ];
  const u = ubicarCodigos(paginas);

  it("encuentra el índice", () => {
    expect(u.indice).toBe(2);
  });

  it("prefiere la página donde se desarrolla el apartado a la portada del eje", () => {
    expect(u.codigos["1.1"]).toBe(4);
    expect(u.codigos["1.2"]).toBe(5);
    expect(u.codigos["1.3"]).toBe(7);
    expect(u.codigos["1.4"]).toBe(8);
  });

  it("ubica también las subsecciones", () => {
    expect(u.codigos["1.2.1"]).toBe(5);
    expect(u.codigos["1.4.1"]).toBe(8);
  });

  it("no inventa páginas para lo que solo aparece en el índice", () => {
    expect(u.codigos["3.4"]).toBeUndefined();
  });

  it("si solo hay portada de eje, la usa", () => {
    expect(ubicarCodigos(["2.1 A 2.2 B 2.3 C 2.4 D"]).codigos["2.3"]).toBe(1);
  });

  it("un documento sin índice no lo inventa", () => {
    expect(ubicarCodigos(["1.1 Me ubico"]).indice).toBeNull();
  });
});

describe("paginaDeSesion", () => {
  const u = { indice: 6, codigos: { "1.2": 9 } };

  it("abre en el apartado si el documento lo desarrolla", () => {
    expect(paginaDeSesion(u, "1.2")).toEqual({ pagina: 9, desarrollada: true });
  });

  it("si no, abre en el índice y lo dice", () => {
    expect(paginaDeSesion(u, "4.3")).toEqual({ pagina: 6, desarrollada: false });
  });

  it("sin ubicaciones abre en la portada", () => {
    expect(paginaDeSesion(null, "1.2")).toEqual({ pagina: null, desarrollada: false });
  });
});

describe("leerUbicaciones", () => {
  it("descarta lo que no es una página válida", () => {
    expect(leerUbicaciones({ indice: 0, codigos: { "1.1": 3, "1.2": "x", "1.3": -1, "1.4": 2.5 } })).toEqual({
      indice: null,
      codigos: { "1.1": 3 },
    });
  });

  it("tolera valores vacíos", () => {
    expect(leerUbicaciones(null)).toBeNull();
    expect(leerUbicaciones("texto")).toBeNull();
  });
});

describe("cartillasDeSesion", () => {
  const estudiante = { id: "e", titulo: "Cartilla", soloDocentes: false, ubicaciones: { indice: 6, codigos: { "1.2": 9 } } };
  const maestros = { id: "m", titulo: "Guía para maestros", soloDocentes: true, ubicaciones: { indice: 8, codigos: { "1.2": 15 } } };

  it("el estudiante no ve la guía para maestros", () => {
    expect(cartillasDeSesion([maestros, estudiante], "1.2", "ESTUDIANTE").map((c) => c.id)).toEqual(["e"]);
  });

  it("el docente ve las dos, primero la del estudiante, cada una en su página", () => {
    const vistas = cartillasDeSesion([maestros, estudiante], "1.2", "DOCENTE");
    expect(vistas.map((c) => [c.id, c.enlace])).toEqual([
      ["e", "/api/documentos/e#page=9"],
      ["m", "/api/documentos/m#page=15"],
    ]);
    expect(vistas.map((c) => c.tipo)).toEqual(["Cartilla del estudiante", "Guía para maestros"]);
  });

  it("no repite un documento que llega dos veces", () => {
    expect(cartillasDeSesion([estudiante, estudiante], "1.2", "ESTUDIANTE")).toHaveLength(1);
  });

  it("para una sesión que no desarrolla, abre el índice y lo marca", () => {
    const [c] = cartillasDeSesion([estudiante], "5.2", "ESTUDIANTE");
    expect(c).toMatchObject({ pagina: 6, desarrollada: false, enlace: "/api/documentos/e#page=6" });
  });
});
