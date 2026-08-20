import { describe, expect, it } from "vitest";
import {
  aprenderMayusculas,
  detectarEstructura,
  limpiarCuerpo,
  normalizarVersales,
} from "./importador-pdf";

/**
 * El importador no solo reconoce la estructura del documento: también recorta
 * el texto de cada sección, que es lo que el estudiante lee al abrir la
 * actividad. Sin ese texto la pantalla no tendría contenido propio.
 */

// Documento con índice al principio y cuerpo después, como los del CNMH.
const CON_CUERPO = [
  "1.1 Me ubico en el territorio",
  "1.2 Arraigos campesinos",
  "",
  "1.1 Me ubico en el territorio",
  "El territorio no es solamente un espacio físico donde ocurren los hechos:",
  "es el resultado de las relaciones que las comunidades tejen con la tierra",
  "a lo largo de generaciones enteras de trabajo compartido y de disputa.",
  "",
  "Reconocer esos vínculos permite entender por qué el desplazamiento duele",
  "más allá de la pérdida material de una casa o de una parcela concreta.",
  "",
  "1.2 Arraigos campesinos",
  "La abundancia de la tierra en los Montes de María sostuvo durante décadas",
  "una economía campesina diversa, con tabaco, ñame, maíz y aguacate.",
].join("\n");

describe("texto de las secciones", () => {
  it("guarda el cuerpo de cada sección, no solo su título", () => {
    const { elementos } = detectarEstructura(CON_CUERPO);
    const primera = elementos.find((e) => e.codigo === "1.1")!;

    expect(primera.contenido).toContain("El territorio no es solamente");
    expect(primera.contenido).toContain("Reconocer esos vínculos");
    // El cuerpo de la sección siguiente no se cuela en esta.
    expect(primera.contenido).not.toContain("La abundancia de la tierra");
  });

  it("prefiere el cuerpo del documento al renglón suelto del índice", () => {
    const { elementos } = detectarEstructura(CON_CUERPO);
    expect(elementos.find((e) => e.codigo === "1.2")!.contenido).toContain(
      "La abundancia de la tierra"
    );
  });

  it("separa en párrafos y recompone las palabras cortadas por guion", () => {
    const texto = limpiarCuerpo([
      "Las comunidades campesinas de la región cons-",
      "truyeron una economía propia durante muchos años seguidos.",
      "",
      "Ese proceso quedó interrumpido por la violencia que llegó después.",
    ]);

    expect(texto).toContain("construyeron");
    expect(texto.split("\n\n")).toHaveLength(2);
  });

  it("descarta los encabezados que se repiten en cada carilla", () => {
    const texto = limpiarCuerpo([
      "la caja de",
      "herramientas",
      "42",
      "Este párrafo sí es contenido y debe conservarse entero en la sección.",
    ]);

    expect(texto).toBe("Este párrafo sí es contenido y debe conservarse entero en la sección.");
  });
});

describe("títulos en versales", () => {
  it("restituye las mayúsculas que el propio documento usa", () => {
    const cuerpo = [
      "La región de los Montes de María fue poblada por campesinos.",
      "En los Montes de María la tierra se disputó durante décadas.",
      "Las FARC llegaron a los Montes de María en los años noventa.",
      "El repliegue de las FARC dejó a la población entre dos fuegos.",
    ];
    const diccionario = aprenderMayusculas(cuerpo);

    expect(normalizarVersales("LOS MONTES DE MARÍA", diccionario)).toBe("Los Montes de María");
    expect(normalizarVersales("LA LLEGADA DE LAS FARC", diccionario)).toBe("La llegada de las FARC");
  });

  it("no asciende a nombre propio una palabra que suele ir en minúscula", () => {
    const cuerpo = [
      "Tierra y territorio no son lo mismo para la comunidad campesina.",
      "La tierra se mide en hectáreas; el territorio se habita y se recuerda.",
      "Cada familia trabajaba la tierra que había heredado de sus mayores.",
    ];
    const diccionario = aprenderMayusculas(cuerpo);

    expect(normalizarVersales("LA TIERRA EN DISPUTA", diccionario)).toBe("La tierra en disputa");
  });

  it("deja intacto un título que ya venía en caja normal", () => {
    const titulo = "Los dos modelos del campo enfrentados";
    expect(normalizarVersales(titulo, aprenderMayusculas([]))).toBe(titulo);
  });
});

describe("encabezados tal como los maqueta el PDF", () => {
  it("reconoce una sesión precedida por el número de página", () => {
    const { elementos } = detectarEstructura("13 3.4 Los Montes de María en el radar paramilitar");
    expect(elementos.find((e) => e.codigo === "3.4")?.titulo).toBe(
      "Los Montes de María en el radar paramilitar"
    );
  });

  it("reconoce una subsección con el código cerrado en punto", () => {
    const { elementos } = detectarEstructura("3.3.1. Contexto nacional: surgimiento de las FARC");
    expect(elementos.find((e) => e.codigo === "3.3.1")?.titulo).toBe(
      "Contexto nacional: surgimiento de las FARC"
    );
  });

  it("corta el título donde empieza el código siguiente en el mismo renglón", () => {
    const { elementos } = detectarEstructura(
      "2.3 Mujeres y tierras 2.3.1 Mujeres campesinas y discriminación"
    );
    expect(elementos.find((e) => e.codigo === "2.3")?.titulo).toBe("Mujeres y tierras");
  });

  it("toma los ejes de la lista en versales de la guía del estudiante", () => {
    const { elementos } = detectarEstructura(
      [
        "1. IDENTIDAD, ESPACIO Y",
        "TIERRA: ARRAIGOS",
        "Y DISPUTAS.",
        "2. LA MASACRE Y LA ESTIGMATIZACIÓN.",
      ].join("\n")
    );

    const ejes = elementos.filter((e) => e.nivel === "EJE");
    expect(ejes).toHaveLength(2);
    expect(ejes[0].titulo).toMatch(/^Identidad, espacio y tierra/i);
  });
});
