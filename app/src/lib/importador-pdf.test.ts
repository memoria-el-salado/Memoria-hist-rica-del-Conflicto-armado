import { describe, expect, it } from "vitest";
import { armarArbol, detectarEstructura, limpiarTitulo, sugerirActividad } from "./importador-pdf";

// Fragmento representativo del texto que produce la extracción del PDF del CNMH:
// columnas entremezcladas, encabezados repetidos y títulos truncados en el índice.
const TEXTO_CNMH = `
GUÍA PARA
MAESTROS Y
MAESTRAS
EL SALADO, MONTES DE MARÍA: TIERRA DE LUCHAS Y CONTRASTES
    la caja de
  herramientas
20

Eje temático 1: Identidad, espacio y tierra: arraigos y disputas

1.1 Me ubico:
1.1 Me ubico: espacios y lugares cotidianos significativos y las disputas en torno a ellos
1.2 Arraigos campesinos, una
1.2 Arraigos campesinos, una tierra de abundancia y los conflictos que se desatan
1.2.1 Tierra de abundancia
1.2.2 Poblamiento de la
1.2.2 Poblamiento de la región y conflictos sociales
1.3 Los dos modelos del campo enfrentados
1.3.3 La aprobación de la Ley 135 de 1961, la Reforma Agraria     43
1.4 Ejercicios de repartición de tierras: de la tierra al territorio
1.4.1 Actividad: ¿cómo repartir las tierras?

Eje temático 2: Movimientos campesinos: el descubrimiento de los problemas compartidos

2.2.1 El segundo impulso a la Reforma Agraria: Ley 1 de 1968
2.2.2 La ANUC y su esfuerzo por ganar autonomía
`;

describe("limpiarTitulo", () => {
  it("quita el número de página pegado al final", () => {
    expect(limpiarTitulo("La aprobación de la Ley 135 de 1961, la Reforma Agraria     43")).toBe(
      "La aprobación de la Ley 135 de 1961, la Reforma Agraria"
    );
  });

  it("colapsa los espacios que deja la extracción por columnas", () => {
    expect(limpiarTitulo("Tierra   de      abundancia")).toBe("Tierra de abundancia");
  });

  it("no recorta números que forman parte del título", () => {
    expect(limpiarTitulo("El segundo impulso a la Reforma Agraria: Ley 1 de 1968")).toContain(
      "Ley 1 de 1968"
    );
  });
});

describe("detectarEstructura", () => {
  const { titulo, elementos } = detectarEstructura(TEXTO_CNMH);

  it("reconoce el título del documento", () => {
    expect(titulo).toContain("EL SALADO");
  });

  it("detecta los ejes temáticos", () => {
    const ejes = elementos.filter((e) => e.nivel === "EJE");
    expect(ejes).toHaveLength(2);
    expect(ejes[0].titulo).toBe("Identidad, espacio y tierra: arraigos y disputas");
  });

  it("clasifica sesiones y subsecciones en su nivel correcto", () => {
    const porCodigo = new Map(elementos.map((e) => [e.codigo, e]));
    expect(porCodigo.get("1.2")?.nivel).toBe("SESION");
    expect(porCodigo.get("1.2.1")?.nivel).toBe("SUBSECCION");
  });

  it("se queda con la versión completa de un título que el índice trunca", () => {
    const sesion = elementos.find((e) => e.codigo === "1.2");
    expect(sesion?.titulo).toBe(
      "Arraigos campesinos, una tierra de abundancia y los conflictos que se desatan"
    );
    expect(sesion?.apariciones).toBe(2);
  });

  it("no duplica un código que aparece varias veces", () => {
    const codigos = elementos.map((e) => e.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it("descarta encabezados y números de página sueltos", () => {
    const titulos = elementos.map((e) => e.titulo.toLowerCase());
    expect(titulos).not.toContain("herramientas");
    expect(titulos).not.toContain("la caja de");
  });

  it("devuelve los elementos ordenados por código", () => {
    const codigos = elementos.map((e) => e.codigo);
    expect(codigos.indexOf("1.2")).toBeLessThan(codigos.indexOf("1.2.1"));
    expect(codigos.indexOf("1.4")).toBeLessThan(codigos.indexOf("2.2.1"));
  });

  it("no encuentra estructura en un texto sin numeración", () => {
    const { elementos } = detectarEstructura("Un párrafo cualquiera sin estructura curricular.");
    expect(elementos).toHaveLength(0);
  });
});

describe("armarArbol", () => {
  const arbol = armarArbol(detectarEstructura(TEXTO_CNMH).elementos);

  it("agrupa las sesiones bajo su eje", () => {
    expect(arbol).toHaveLength(2);
    expect(arbol[0].titulo).toBe("Identidad, espacio y tierra: arraigos y disputas");
    expect(arbol[0].sesiones.map((s) => s.codigo)).toEqual(["1.1", "1.2", "1.3", "1.4"]);
  });

  it("anida las subsecciones dentro de su sesión", () => {
    const sesion = arbol[0].sesiones.find((s) => s.codigo === "1.2")!;
    expect(sesion.subsecciones.map((s) => s.codigo)).toEqual(["1.2.1", "1.2.2"]);
    expect(sesion.subsecciones[0].titulo).toBe("Tierra de abundancia");
  });

  it("crea la sesión contenedora si el documento solo trae la subsección", () => {
    // 2.2 nunca aparece como línea propia, pero 2.2.1 y 2.2.2 sí.
    const sesion = arbol[1].sesiones.find((s) => s.codigo === "2.2");
    expect(sesion).toBeDefined();
    expect(sesion!.subsecciones).toHaveLength(2);
  });

  it("conserva la sesión 1.3 aunque solo tenga una subsección detectada", () => {
    const sesion = arbol[0].sesiones.find((s) => s.codigo === "1.3")!;
    expect(sesion.titulo).toBe("Los dos modelos del campo enfrentados");
    expect(sesion.subsecciones.map((s) => s.codigo)).toEqual(["1.3.3"]);
  });
});

describe("sugerirActividad", () => {
  it("reconoce el ejercicio de repartición como el simulador de tierras", () => {
    expect(sugerirActividad("Ejercicios de repartición de tierras: de la tierra al territorio")).toBe(
      "simulador"
    );
  });

  it("reconoce la copla por su subsección", () => {
    expect(
      sugerirActividad("Arraigos campesinos, una tierra de abundancia", ["Tierra de abundancia"])
    ).toBe("copla");
  });

  it("reconoce la cartografía social", () => {
    expect(
      sugerirActividad("Me ubico: espacios y lugares cotidianos significativos y las disputas")
    ).toBe("cartografia");
  });

  it("reconoce las iniciativas de memoria como el jardín", () => {
    expect(sugerirActividad("Las iniciativas de memoria de El Salado")).toBe("jardin");
  });

  it("reconoce el compromiso personal como el diario", () => {
    expect(sugerirActividad("Y tú, ¿a qué te comprometes? Las solidaridades con otros")).toBe("diario");
  });

  it("usa el archivo con anotaciones cuando no hay una actividad clara", () => {
    expect(sugerirActividad("La ANUC y su esfuerzo por ganar autonomía")).toBe("zona");
  });

  it("asigna la actividad a cada sesión al armar el árbol", () => {
    const arbol = armarArbol(detectarEstructura(TEXTO_CNMH).elementos);
    const sesiones = new Map(arbol.flatMap((e) => e.sesiones.map((s) => [s.codigo, s.actividad])));

    expect(sesiones.get("1.4")).toBe("simulador");
    expect(sesiones.get("1.2")).toBe("copla");
    expect(sesiones.get("1.1")).toBe("cartografia");
    expect(sesiones.get("2.2")).toBe("zona");
  });
});
