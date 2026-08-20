import { describe, expect, it } from "vitest";
import { componerLectura, subseccionesSinTexto, type Subseccion } from "./lectura-sesion";

const LARGO =
  "El territorio no es solamente un espacio físico donde ocurren los hechos: " +
  "es el resultado de las relaciones que las comunidades tejen con la tierra.";

const OTRO =
  "La abundancia de la región sostuvo durante décadas una economía campesina " +
  "diversa, con tabaco, ñame, maíz y aguacate repartidos por los municipios.";

const sub = (id: string, codigo: string, titulo: string, contenido: string | null): Subseccion => ({
  id,
  codigo,
  titulo,
  contenido,
});

describe("texto que lee el estudiante", () => {
  it("junta el texto propio de la sesión con el de sus subsecciones", () => {
    const bloques = componerLectura(LARGO, [sub("a", "1.3.1", "Los argumentos", OTRO)]);

    expect(bloques.map((b) => b.tipo)).toEqual(["parrafo", "subtitulo", "parrafo"]);
    expect(bloques[0]).toMatchObject({ texto: LARGO });
    expect(bloques[1]).toMatchObject({ codigo: "1.3.1", texto: "Los argumentos" });
  });

  it("una sesión sin texto propio se lee entera desde sus subsecciones", () => {
    // Es el caso corriente: el documento desarrolla la sesión en sus apartados.
    const bloques = componerLectura(null, [
      sub("a", "1.3.1", "Los argumentos a favor", LARGO),
      sub("b", "1.3.3", "La aprobación de la Ley", OTRO),
    ]);

    expect(bloques.filter((b) => b.tipo === "parrafo")).toHaveLength(2);
    expect(bloques.filter((b) => b.tipo === "subtitulo")).toHaveLength(2);
  });

  it("no titula una subsección que no aportó texto", () => {
    const bloques = componerLectura(LARGO, [
      sub("a", "1.3.1", "Con texto", OTRO),
      sub("b", "1.3.2", "Sin texto", null),
      sub("c", "1.3.3", "Resto de maquetación", "Analiza"),
    ]);

    const subtitulos = bloques.filter((b) => b.tipo === "subtitulo");
    expect(subtitulos).toHaveLength(1);
    expect(subtitulos[0]).toMatchObject({ codigo: "1.3.1" });
  });

  it("las subsecciones sin texto quedan listadas aparte", () => {
    const subsecciones = [
      sub("a", "1.3.1", "Con texto", LARGO),
      sub("b", "1.3.2", "Sin texto", null),
      sub("c", "1.3.4", "A investigar", "  "),
    ];

    expect(subseccionesSinTexto(subsecciones).map((s) => s.codigo)).toEqual(["1.3.2", "1.3.4"]);
  });

  it("una sesión sin nada devuelve una lectura vacía", () => {
    expect(componerLectura(null, [])).toEqual([]);
  });
});
