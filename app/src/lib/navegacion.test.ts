import { describe, expect, it } from "vitest";
import { INICIO_POR_ROL, NAV_POR_ROL, PREFIJO_POR_ROL, tituloDeRuta } from "./navegacion";

const ROLES = ["ESTUDIANTE", "DOCENTE", "ADMIN"] as const;

describe("separación de funcionalidades por rol", () => {
  it("cada rol solo navega dentro de su propia área", () => {
    for (const rol of ROLES) {
      for (const item of NAV_POR_ROL[rol]) {
        expect(item.href.startsWith(PREFIJO_POR_ROL[rol])).toBe(true);
      }
    }
  });

  it("ningún rol comparte pantallas con otro", () => {
    const rutas = ROLES.flatMap((r) => NAV_POR_ROL[r].map((i) => i.href));
    expect(new Set(rutas).size).toBe(rutas.length);
  });

  it("el inicio de cada rol es una de sus propias pantallas", () => {
    for (const rol of ROLES) {
      expect(NAV_POR_ROL[rol].map((i) => i.href)).toContain(INICIO_POR_ROL[rol]);
    }
  });

  it("el estudiante navega por el mapa, no por una lista fija de actividades", () => {
    // Las actividades dependen de la sesión que se abra, así que no pueden ser
    // destinos fijos del menú. Sí lo son lo que existe aunque cambie el módulo
    // activo: el mapa, los debates que abre el docente y el diario personal.
    expect(NAV_POR_ROL.ESTUDIANTE.map((i) => i.href)).toEqual([
      "/estudiante/mapa",
      "/estudiante/foros",
      "/estudiante/diario",
    ]);
  });

  it("el docente concentra las funciones LMS y LCMS", () => {
    const rutas = NAV_POR_ROL.DOCENTE.map((i) => i.href);
    expect(rutas).toContain("/docente/panel");
    expect(rutas).toContain("/docente/contenidos");
    expect(rutas).toContain("/docente/foros");
    expect(rutas).toContain("/docente/subpoblaciones");
    expect(rutas).toContain("/docente/revision");
  });

  it("cada rol crea únicamente las cuentas del nivel siguiente", () => {
    // El administrador da de alta docentes; el docente, sus estudiantes.
    expect(NAV_POR_ROL.ADMIN.map((i) => i.href)).toContain("/admin/docentes");
    expect(NAV_POR_ROL.DOCENTE.map((i) => i.href)).toContain("/docente/estudiantes");
    // Y los organiza en cursos y grupos; el estudiante no ve esa gestión.
    expect(NAV_POR_ROL.DOCENTE.map((i) => i.href)).toContain("/docente/cursos");
    expect(NAV_POR_ROL.ESTUDIANTE.some((i) => /cursos/.test(i.href))).toBe(false);
    expect(NAV_POR_ROL.ESTUDIANTE.some((i) => /docentes|estudiantes/.test(i.href))).toBe(false);
  });

  it("el administrador ve cuentas, escalabilidad, importación y accesibilidad", () => {
    expect(NAV_POR_ROL.ADMIN.map((i) => i.href)).toEqual([
      "/admin/docentes",
      "/admin/casos",
      "/admin/importar",
      "/admin/accesibilidad",
    ]);
  });

  it("resuelve el título de la ruta activa y devuelve vacío para rutas ajenas", () => {
    expect(tituloDeRuta("ESTUDIANTE", "/estudiante/mapa")).toBe("Ruta Pedagógica · Mapa del Viaje");
    expect(tituloDeRuta("ESTUDIANTE", "/docente/panel")).toBe("");
  });

  it("una página interior lleva el título de su sección", () => {
    expect(tituloDeRuta("DOCENTE", "/docente/cursos/abc123")).toBe("Organización · Cursos y grupos");
    expect(tituloDeRuta("DOCENTE", "/docente/foros/xyz")).toBe("LMS · Mediación de debates");
    // Sin confundir una sección con otra que empieza igual.
    expect(tituloDeRuta("DOCENTE", "/docente/cursosviejos")).toBe("");
  });
});
