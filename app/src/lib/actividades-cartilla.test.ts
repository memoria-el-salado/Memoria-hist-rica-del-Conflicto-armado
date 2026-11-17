import { describe, expect, it } from "vitest";
import {
  actividadDeSesion,
  actividadesDeSesion,
  CATALOGO,
  evaluar,
  leerDatosCartilla,
  pasosMezclados,
  validarRespuestaCartilla,
  type ActividadClasificar,
  type ActividadOrdenar,
  type ActividadPreguntas,
} from "./actividades-cartilla";

// Los apartados del Eje 1 tal como están en el módulo importado de la cartilla.
const S12 = { codigo: "1.2", titulo: "Arraigos campesinos, una tierra de abundancia y los conflictos que se desatan" };
const SUB12 = [
  { codigo: "1.2.1", titulo: "Tierra de abundancia" },
  { codigo: "1.2.2", titulo: "Poblamiento de la región y conflictos sociales" },
];
const S13 = { codigo: "1.3", titulo: "Los dos modelos del campo enfrentados" };
const SUB13 = [
  { codigo: "1.3.1", titulo: "Los argumentos a favor de la redistribución de la tierra" },
  { codigo: "1.3.2", titulo: "Los argumentos a favor del enfoque productivista" },
  { codigo: "1.3.3", titulo: "La aprobación de la Ley 135 de 1961, la Reforma Agraria" },
  { codigo: "1.3.4", titulo: "A investigar: la tierra en Colombia hoy en día" },
];

const porId = <T,>(id: string) => CATALOGO.find((a) => a.id === id) as T;

describe("el catálogo", () => {
  it("no repite identificadores", () => {
    const ids = CATALOGO.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cada clasificación usa solo sus categorías y cada orden tiene al menos dos pasos", () => {
    for (const a of CATALOGO) {
      if (a.tipo === "clasificar") {
        const cats = new Set(a.categorias.map((c) => c.id));
        expect(a.tarjetas.every((t) => cats.has(t.categoria))).toBe(true);
      }
      if (a.tipo === "ordenar") expect(a.pasos.length).toBeGreaterThan(1);
    }
  });

  it("toda actividad es del Preámbulo o del Eje 1, que es lo que traen las cartillas recortadas", () => {
    expect(CATALOGO.every((a) => a.codigo.startsWith("1."))).toBe(true);
  });
});

describe("actividadesDeSesion", () => {
  it("ubica cada actividad en su apartado de la cartilla, en orden", () => {
    const enLa12 = actividadesDeSesion(S12, SUB12).map((x) => `${x.apartado.codigo}:${x.actividad.id}`);
    expect(enLa12).toEqual([
      "1.2.1:dia-campesino",
      "1.2.2:ley-tres-pasos",
      "1.2.2:tierra-1960",
      "1.2.2:campesinos-terratenientes",
      "1.2.2:glosario-tierra",
    ]);
    const enLa13 = actividadesDeSesion(S13, SUB13).map((x) => x.actividad.id);
    expect(enLa13).toEqual(["quien-lo-dijo", "ley-135", "exequias", "tierra-hoy"]);
  });

  it("la 1.1 trae la reconstrucción del conflicto por un espacio", () => {
    const s11 = { codigo: "1.1", titulo: "Me ubico: espacios y lugares cotidianos significativos y las disputas en torno a ellos" };
    expect(actividadesDeSesion(s11, []).map((x) => x.actividad.id)).toEqual(["conflicto-espacio"]);
  });

  it("no aparece en otro módulo con la misma numeración", () => {
    expect(actividadesDeSesion({ codigo: "1.2", titulo: "La pesca en el río Atrato" }, [{ codigo: "1.2.2", titulo: "Los peces del río" }])).toEqual([]);
  });

  it("un «A investigar» de otro eje recibe una investigación genérica", () => {
    const s22 = { codigo: "2.2", titulo: "Asociación Nacional de Usuarios Campesinos, ANUC" };
    const [x] = actividadesDeSesion(s22, [{ codigo: "2.2.4", titulo: "A investigar: movilizaciones campesinas hoy" }]);
    expect(x.actividad.id).toBe("investigar-2.2.4");
    expect(x.actividad.titulo).toBe("A investigar: movilizaciones campesinas hoy");
  });

  it("encuentra una actividad solo si la sesión la trae", () => {
    expect(actividadDeSesion("ley-135", S13, SUB13)?.id).toBe("ley-135");
    expect(actividadDeSesion("ley-135", S12, SUB12)).toBeNull();
  });
});

describe("validarRespuestaCartilla · preguntas", () => {
  const exequias = porId<ActividadPreguntas>("exequias");
  const largo = "Una respuesta con suficiente desarrollo para la pregunta.";

  it("exige cada campo y que la opción sea de la lista", () => {
    expect(validarRespuestaCartilla(exequias, { respuestas: { significa: largo } })).toHaveProperty("error");
    const r = validarRespuestaCartilla(exequias, { respuestas: { significa: largo, porque: largo, genera: largo, tipo: "Otra" } });
    expect(r).toEqual({ error: "Esa opción no está en «¿Qué es este mensaje?»." });
  });

  it("guarda las respuestas y un resumen para el docente", () => {
    const r = validarRespuestaCartilla(exequias, { respuestas: { significa: largo, porque: largo, genera: largo, tipo: "Las dos cosas" } });
    expect("datos" in r && r.datos.respuestas?.tipo).toBe("Las dos cosas");
    expect("texto" in r && r.texto).toContain("¿Qué es este mensaje?\nLas dos cosas");
  });

  it("un campo opcional puede quedar vacío", () => {
    const dia = porId<ActividadPreguntas>("dia-campesino");
    const r = validarRespuestaCartilla(dia, { respuestas: { municipio: "Ovejas", dia: largo } });
    expect(r).toHaveProperty("datos");
  });

  it("pide desarrollar una respuesta demasiado corta", () => {
    const dia = porId<ActividadPreguntas>("dia-campesino");
    expect(validarRespuestaCartilla(dia, { respuestas: { municipio: "Ovejas", dia: "Siembra." } })).toHaveProperty("error");
  });
});

describe("validarRespuestaCartilla · clasificar y ordenar", () => {
  const ley = porId<ActividadClasificar>("ley-135");
  const reflexion = "Reformar la estructura agraria y dotar de tierra a quienes no la tienen.";

  it("exige ubicar todas las tarjetas", () => {
    expect(validarRespuestaCartilla(ley, { asignaciones: { l1: "tierras" }, reflexion })).toEqual({ error: "Ubica todas las tarjetas antes de guardar." });
  });

  it("cuenta las correctas y las pone en el resumen", () => {
    const todas = Object.fromEntries(ley.tarjetas.map((t) => [t.id, t.categoria]));
    const r = validarRespuestaCartilla(ley, { asignaciones: { ...todas, l3: "quien" }, reflexion });
    expect("texto" in r && r.texto.startsWith("Clasificación: 4 de 5 correctas.")).toBe(true);
  });

  it("ordenar exige todos los pasos y cuenta los que quedaron en su lugar", () => {
    const tres = porId<ActividadOrdenar>("ley-tres-pasos");
    expect(validarRespuestaCartilla(tres, { orden: ["colono"], reflexion })).toHaveProperty("error");
    const r = validarRespuestaCartilla(tres, { orden: ["colono", "latifundista", "finquero"], reflexion });
    expect("texto" in r && r.texto.startsWith("Orden: 1 de 3 pasos en su lugar.")).toBe(true);
    expect(evaluar(tres, { orden: ["colono", "finquero", "latifundista"] })).toEqual({ correctas: 3, total: 3 });
  });
});

describe("pasosMezclados", () => {
  it("ningún paso queda en su lugar y el resultado no cambia entre llamadas", () => {
    const pasos = porId<ActividadOrdenar>("ley-tres-pasos").pasos;
    const mezclados = pasosMezclados(pasos);
    expect(mezclados.every((p, i) => p.id !== pasos[i].id)).toBe(true);
    expect(pasosMezclados(pasos)).toEqual(mezclados);
  });
});

describe("leerDatosCartilla", () => {
  it("descarta lo que no es texto", () => {
    expect(leerDatosCartilla({ respuestas: { a: "sí", b: 3 }, orden: ["x", 2], reflexion: 5 })).toEqual({
      respuestas: { a: "sí" },
      asignaciones: undefined,
      orden: ["x"],
      reflexion: undefined,
    });
  });
});
