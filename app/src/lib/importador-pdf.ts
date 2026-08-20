/**
 * Detección de la estructura curricular dentro del texto de un documento
 * pedagógico del CNMH (colección "La caja de herramientas").
 *
 * La jerarquía que buscamos es la de la guía para maestros:
 *
 *   Eje temático 1  ·  Identidad, espacio y tierra: arraigos y disputas
 *     └─ 1.2  Arraigos campesinos, una tierra de abundancia…
 *          └─ 1.2.1  Tierra de abundancia
 *
 * El texto extraído de un PDF llega desordenado (columnas, encabezados
 * repetidos, números de página sueltos), así que la detección es heurística
 * y siempre pasa por la revisión del administrador antes de crear nada.
 *
 * Este módulo es puro a propósito: no toca la base de datos ni el sistema de
 * archivos, para poder verificarlo con pruebas automatizadas.
 */

export type NivelDetectado = "EJE" | "SESION" | "SUBSECCION";

export type ElementoDetectado = {
  nivel: NivelDetectado;
  codigo: string;
  titulo: string;
  /** Cuántas veces apareció en el documento; ayuda a distinguir índice de cuerpo. */
  apariciones: number;
  /**
   * Texto que sigue al encabezado hasta el siguiente. Es el contenido real de
   * la sesión: sin él la actividad no tendría nada propio que mostrarle al
   * estudiante y volvería a caer en un texto de ejemplo.
   */
  contenido: string;
};

export type EstructuraDetectada = {
  titulo: string | null;
  elementos: ElementoDetectado[];
};

/** Encabezados, créditos y pies de página que se repiten en cada carilla. */
const RUIDO = [
  /^\s*la caja de\s*$/i,
  /^\s*herramientas\s*$/i,
  /^\s*guía para\s*$/i,
  /^\s*maestros y\s*$/i,
  /^\s*maestras\s*$/i,
  /^\s*centro nacional de memoria histórica\s*$/i,
  /^\s*\d+\s*$/,
  // Filetes decorativos con los que la guía separa los bloques de la página.
  /^\s*[/·—–_=*.\\-]{4,}\s*$/,
];

const TITULOS_EJE = /^\s*eje\s+tem[áa]tico\s+(\d+)\s*[:.·-]?\s*(.*)$/i;
const TITULO_EJE_CORTO = /^\s*eje\s+(\d+)\s+(?!\d)(.+)$/i;

/**
 * En la guía del estudiante los ejes no se anuncian con la palabra "eje": son
 * una lista en versales al final del mapa del viaje.
 *
 *   1. IDENTIDAD, ESPACIO Y
 *   TIERRA: ARRAIGOS
 *   Y DISPUTAS.
 */
const EJE_EN_VERSALES = /^\s*([1-9])\.\s+([A-ZÁÉÍÓÚÑ¿][^a-záéíóúñ]{5,})$/;

// El número de página se cuela delante del código de la sesión: "13 3.4 Los…".
// Y el código puede venir cerrado con punto: "3.3.1. Contexto nacional".
const SESION = /^\s*(?:\d{1,3}\s+)?(\d+)\.(\d+)\.?\s+(.+)$/;
const SUBSECCION = /^\s*(?:\d{1,3}\s+)?(\d+)\.(\d+)\.(\d+)\.?\s+(.+)$/;

/** Cualquier línea que inicie un elemento nuevo corta la continuación de un título. */
const INICIA_ELEMENTO = /^\s*(eje\s+(tem[áa]tico\s+)?\d|\d+\.\d)/i;

/**
 * En el PDF los títulos largos se parten en varias líneas:
 *
 *   "Eje 1 Identidad, espacio y tierra:"
 *   "arraigos y disputas"
 *
 * Se pegan las líneas siguientes mientras parezcan continuación: empiezan en
 * minúscula o el título quedó abierto en coma o dos puntos.
 */
function unirContinuacion(titulo: string, lineas: string[], desde: number): string {
  let completo = titulo.trim();

  for (let i = desde; i < Math.min(desde + 3, lineas.length); i++) {
    const siguiente = lineas[i]?.trim();
    if (!siguiente || esRuido(siguiente) || INICIA_ELEMENTO.test(siguiente)) break;

    const abierto = /[:,]$/.test(completo);
    const continua = /^[a-záéíóúñ¿(]/.test(siguiente);
    if (!abierto && !continua) break;

    completo = `${completo} ${siguiente}`.replace(/:\s+/, ": ");
  }

  return completo;
}

function esRuido(linea: string): boolean {
  return RUIDO.some((r) => r.test(linea));
}

/** Une las líneas siguientes mientras sigan en versales, sin abrir un elemento nuevo. */
function unirVersales(titulo: string, lineas: string[], desde: number): string {
  let completo = titulo.trim();

  for (let i = desde; i < Math.min(desde + 4, lineas.length); i++) {
    const siguiente = lineas[i]?.trim();
    if (!siguiente || esRuido(siguiente)) break;
    if (EJE_EN_VERSALES.test(siguiente) || INICIA_ELEMENTO.test(siguiente)) break;
    // Sigue siendo parte del título mientras no aparezcan minúsculas.
    if (/[a-záéíóúñ]/.test(siguiente)) break;

    completo = `${completo} ${siguiente}`;
  }

  return completo.replace(/\s*\.\s*$/, "");
}

/**
 * Diccionario de mayúsculas del propio documento.
 *
 * Los títulos en versales pierden la información de qué palabras son nombres
 * propios. En vez de mantener una lista fija de topónimos, se aprende del
 * texto normal del documento: si "Montes" o "FARC" aparecen así en el cuerpo,
 * así se restituyen en el título.
 */
export function aprenderMayusculas(lineas: string[]): Map<string, string> {
  /** Por palabra: cuántas veces se vio con inicial y cuántas en minúscula. */
  const cuenta = new Map<string, { conInicial: Map<string, number>; llana: number }>();

  const registro = (clave: string) => {
    let dato = cuenta.get(clave);
    if (!dato) {
      dato = { conInicial: new Map(), llana: 0 };
      cuenta.set(clave, dato);
    }
    return dato;
  };

  for (const linea of lineas) {
    // Las líneas íntegramente en versales no enseñan nada sobre mayúsculas.
    if (!/[a-záéíóúñ]/.test(linea)) continue;

    const palabras = linea.split(/[^\p{L}]+/u).filter(Boolean);

    for (let i = 0; i < palabras.length; i++) {
      const palabra = palabras[i];
      if (palabra.length < 2) continue;

      const clave = palabra.toLowerCase();
      // Las palabras funcionales nunca son nombres propios; aprenderlas
      // convertiría "de los" en "DE Los".
      if (MENUDAS.has(clave)) continue;

      // La primera palabra de la línea lleva inicial por posición, no por ser
      // nombre propio: no enseña nada y ensuciaría el diccionario.
      if (i === 0) continue;

      if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/u.test(palabra) || /^[A-ZÁÉÍÓÚÑ]{2,6}$/u.test(palabra)) {
        const formas = registro(clave).conInicial;
        formas.set(palabra, (formas.get(palabra) ?? 0) + 1);
      } else if (/^[a-záéíóúñ]+$/u.test(palabra)) {
        registro(clave).llana += 1;
      }
    }
  }

  const diccionario = new Map<string, string>();
  for (const [clave, { conInicial, llana }] of cuenta) {
    const mejor = [...conInicial.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!mejor) continue;

    const total = [...conInicial.values()].reduce((s, n) => s + n, 0);
    // Solo es nombre propio si el documento lo escribe casi siempre así.
    if (total >= 2 && total > llana) diccionario.set(clave, mejor[0]);
  }
  return diccionario;
}

/** Palabras que no se capitalizan dentro de un título, salvo al principio. */
const MENUDAS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "en", "a", "al",
  "por", "para", "con", "sin", "que", "se", "su", "sus", "un", "una", "sobre",
]);

/**
 * Pasa un título en versales a caja normal, devolviendo las mayúsculas a las
 * palabras que el propio documento escribe con inicial.
 */
export function normalizarVersales(titulo: string, diccionario: Map<string, string>): string {
  if (/[a-záéíóúñ]/.test(titulo)) return titulo;

  const palabras = titulo.toLowerCase().split(/(\s+)/);
  // Lleva inicial la primera palabra y la que sigue a un cierre de frase.
  let primera = true;

  const resultado = palabras.map((trozo) => {
    if (!trozo.trim()) return trozo;
    const abreFrase = primera;
    primera = /[.?!:]$/.test(trozo);

    // Se separa la puntuación para poder consultar la palabra desnuda.
    const partido = trozo.match(/^([^\p{L}]*)(.*?)([^\p{L}]*)$/u);
    if (!partido) return trozo;
    const [, antes, nucleo, despues] = partido;
    if (!nucleo) return trozo;

    const conocida = diccionario.get(nucleo);
    const salida =
      conocida ?? (abreFrase ? nucleo[0].toUpperCase() + nucleo.slice(1) : nucleo);

    return antes + salida + despues;
  });

  return resultado.join("");
}

/**
 * Limpia un título: colapsa espacios, quita números de página pegados al final
 * y descarta la puntuación suelta que deja la extracción por columnas.
 */
export function limpiarTitulo(bruto: string): string {
  return (
    bruto
      .replace(/\s*\|\s*/g, " ")
      // A veces el maquetado deja dos elementos en el mismo renglón:
      // "Mujeres y tierras 2.3.1 Mujeres campesinas…". El título termina donde
      // empieza el código siguiente.
      .replace(/\s+\d+\.\d+(\.\d+)?\.?\s+.*$/, "")
      // El número de página del índice va separado por varios espacios o por
      // puntos guía. Se exige ese separador para no recortar años ni cifras
      // que forman parte del título ("Ley 1 de 1968", "Ley 135 de 1961").
      .replace(/(?:\s{2,}|[.·]{2,}\s*)\d{1,3}\s*$/, "")
      .replace(/\s+/g, " ")
      .replace(/\s*[.·-]+\s*$/, "")
      .trim()
  );
}

/** Un título válido tiene letras, arranca en mayúscula o signo de apertura y no es una frase suelta. */
function tituloPlausible(titulo: string): boolean {
  if (titulo.length < 4 || titulo.length > 160) return false;
  if (!/[a-záéíóúñ]/i.test(titulo)) return false;
  return /^[A-ZÁÉÍÓÚÑ¿¡"“]/.test(titulo);
}

export function detectarEstructura(textoBruto: string): EstructuraDetectada {
  // La guía pega filetes decorativos al texto ("//////1.2 Arraigos…"), lo que
  // impediría reconocer el encabezado que va detrás.
  const lineas = textoBruto.split(/\r?\n/).map((l) => l.replace(/[/]{3,}/g, " ").trimEnd());

  // Se acumula por código para quedarse con la versión más completa del título:
  // el índice suele truncarlo y el cuerpo del documento lo trae entero.
  const porCodigo = new Map<string, ElementoDetectado>();

  // Dónde empieza cada encabezado, para poder recortar después el texto que
  // hay entre uno y el siguiente.
  const marcas: { codigo: string; linea: number }[] = [];

  // Cómo escribe este documento los nombres propios, para restituirlos en los
  // títulos que vienen en versales.
  const mayusculas = aprenderMayusculas(lineas);

  const registrar = (
    nivel: NivelDetectado,
    codigo: string,
    tituloBruto: string,
    linea: number
  ) => {
    const titulo = normalizarVersales(limpiarTitulo(tituloBruto), mayusculas);
    if (!tituloPlausible(titulo)) return;

    marcas.push({ codigo, linea });

    const previo = porCodigo.get(codigo);
    if (!previo) {
      porCodigo.set(codigo, { nivel, codigo, titulo, apariciones: 1, contenido: "" });
      return;
    }
    previo.apariciones += 1;
    if (titulo.length > previo.titulo.length) previo.titulo = titulo;
  };

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].replace(/\s+$/, "");
    if (!linea.trim() || esRuido(linea)) continue;

    const eje = linea.match(TITULOS_EJE) ?? linea.match(TITULO_EJE_CORTO);
    if (eje) {
      const [, numero, resto] = eje;
      // "Eje temático 1" deja el título en la línea siguiente; "Eje 1 Título…" lo trae ya.
      const base = resto?.trim() ? resto : (lineas[i + 1] ?? "");
      const desde = resto?.trim() ? i + 1 : i + 2;
      registrar("EJE", numero, unirContinuacion(base, lineas, desde), i);
      continue;
    }

    // La guía del estudiante lista los ejes en versales, sin nombrarlos.
    const versales = linea.match(EJE_EN_VERSALES);
    if (versales) {
      const [, numero, titulo] = versales;
      registrar("EJE", numero, unirVersales(titulo, lineas, i + 1), i);
      continue;
    }

    const sub = linea.match(SUBSECCION);
    if (sub) {
      const [, a, b, c, titulo] = sub;
      registrar("SUBSECCION", `${a}.${b}.${c}`, unirContinuacion(titulo, lineas, i + 1), i);
      continue;
    }

    const ses = linea.match(SESION);
    if (ses) {
      const [, a, b, titulo] = ses;
      registrar("SESION", `${a}.${b}`, unirContinuacion(titulo, lineas, i + 1), i);
    }
  }

  // Segunda pasada: cuando el encabezado y el cuerpo comparten renglón, el
  // título resulta demasiado largo para serlo y la primera pasada lo descarta.
  // Si el código ya se conoce de otra aparición, la marca vale igual y evita
  // que el texto de una sesión se derrame sobre la anterior.
  for (let i = 0; i < lineas.length; i++) {
    const encontrado = lineas[i].match(SUBSECCION) ?? lineas[i].match(SESION);
    if (!encontrado) continue;

    const codigo = encontrado.slice(1, encontrado.length - 1).join(".");
    if (!porCodigo.has(codigo)) continue;
    if (marcas.some((m) => m.linea === i)) continue;

    marcas.push({ codigo, linea: i });
  }

  asignarContenido(lineas, marcas, porCodigo);

  const elementos = [...porCodigo.values()].sort((x, y) => comparar(x.codigo, y.codigo));

  return { titulo: detectarTituloDocumento(lineas), elementos };
}

/**
 * Recorta el cuerpo de cada encabezado: lo que hay entre él y el siguiente.
 *
 * Un mismo código aparece varias veces (índice y cuerpo). Se conserva el
 * fragmento más largo, que es el del cuerpo; el del índice son dos líneas.
 */
function asignarContenido(
  lineas: string[],
  marcas: { codigo: string; linea: number }[],
  porCodigo: Map<string, ElementoDetectado>
) {
  // Los títulos de eje aparecen sueltos en portadillas y listados, en medio del
  // cuerpo de una sesión. Si cortaran el texto, partirían en dos la sección que
  // los rodea, así que no delimitan: solo lo hacen sesiones y subsecciones.
  const ordenadas = marcas
    .filter((m) => porCodigo.get(m.codigo)?.nivel !== "EJE")
    .sort((a, b) => a.linea - b.linea);

  for (let i = 0; i < ordenadas.length; i++) {
    const inicio = ordenadas[i].linea + 1;
    const fin = ordenadas[i + 1]?.linea ?? lineas.length;

    const cuerpo = limpiarCuerpo(lineas.slice(inicio, fin));
    const elemento = porCodigo.get(ordenadas[i].codigo);
    if (elemento && cuerpo.length > elemento.contenido.length) {
      elemento.contenido = cuerpo;
    }
  }
}

/** Máximo de caracteres que se guardan por sección, para no volcar el PDF entero. */
const LIMITE_CONTENIDO = 6000;

/**
 * Renglones que son rótulos de navegación, no contenido: van enteros en
 * versales y arrastran el índice de ejes dentro del texto de una sesión.
 */
function esRotulo(linea: string): boolean {
  if (/[a-záéíóúñ]/.test(linea)) return false;
  return linea.split(/\s+/).length >= 3;
}

/**
 * Convierte las líneas sueltas del PDF en párrafos legibles: descarta ruido,
 * vuelve a unir las palabras cortadas por guion al final de renglón y separa
 * en párrafos donde el documento dejaba una línea en blanco.
 */
export function limpiarCuerpo(lineas: string[]): string {
  const parrafos: string[] = [];
  let actual: string[] = [];

  const cerrar = () => {
    const texto = actual
      .join(" ")
      .replace(/(\w)-\s+(\w)/g, "$1$2")
      .replace(/\s+/g, " ")
      .trim();
    if (texto.length >= 40) parrafos.push(texto);
    actual = [];
  };

  for (const bruta of lineas) {
    // Los filetes decorativos van pegados al texto, no siempre en su renglón.
    const linea = bruta.replace(/[/]{3,}/g, " ").replace(/\s+/g, " ").trim();

    if (!linea || esRuido(linea) || esRotulo(linea)) {
      cerrar();
      continue;
    }
    actual.push(linea);
  }
  cerrar();

  const texto = parrafos.join("\n\n");
  if (texto.length <= LIMITE_CONTENIDO) return texto;

  // Se corta en el final de párrafo más cercano al límite, no a mitad de frase.
  const recorte = texto.slice(0, LIMITE_CONTENIDO);
  const corte = recorte.lastIndexOf("\n\n");
  return corte > LIMITE_CONTENIDO / 2 ? recorte.slice(0, corte) : recorte;
}

function comparar(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * El título del documento son las primeras líneas en mayúsculas de la portada.
 * Como el PDF las parte en varios renglones, se unen los bloques consecutivos
 * y se devuelve el más largo.
 */
function detectarTituloDocumento(lineas: string[]): string | null {
  const bloques: string[] = [];
  let actual: string[] = [];

  for (const linea of lineas.slice(0, 40)) {
    const limpia = linea.trim();
    const enMayusculas =
      limpia.length >= 4 &&
      limpia.length <= 90 &&
      !esRuido(limpia) &&
      limpia === limpia.toUpperCase() &&
      /[A-ZÁÉÍÓÚÑ]/.test(limpia);

    if (enMayusculas) {
      actual.push(limpia);
    } else if (actual.length) {
      bloques.push(actual.join(" "));
      actual = [];
    }
  }
  if (actual.length) bloques.push(actual.join(" "));

  const mejor = bloques.sort((a, b) => b.length - a.length)[0];
  return mejor ? limpiarTitulo(mejor).replace(/[,;:]\s*$/, "") : null;
}

/**
 * Agrupa los elementos planos en el árbol que se le muestra al administrador.
 * Las sesiones y subsecciones huérfanas (sin su eje o su sesión en el documento)
 * se conservan igual, para que él decida si las incluye.
 */
export type SubseccionArmada = { codigo: string; titulo: string; contenido: string };

export type SesionArmada = {
  codigo: string;
  titulo: string;
  actividad: string;
  contenido: string;
  subsecciones: SubseccionArmada[];
};

export type EjeArmado = {
  codigo: string;
  titulo: string;
  sesiones: SesionArmada[];
};

export function armarArbol(elementos: ElementoDetectado[]): EjeArmado[] {
  const ejes = new Map<string, EjeArmado>();

  const obtenerEje = (codigo: string): EjeArmado => {
    let eje = ejes.get(codigo);
    if (!eje) {
      eje = { codigo, titulo: `Eje ${codigo}`, sesiones: [] };
      ejes.set(codigo, eje);
    }
    return eje;
  };

  for (const el of elementos) {
    if (el.nivel === "EJE") {
      obtenerEje(el.codigo).titulo = el.titulo;
    }
  }

  for (const el of elementos) {
    if (el.nivel === "SESION") {
      const eje = obtenerEje(el.codigo.split(".")[0]);
      if (!eje.sesiones.some((s) => s.codigo === el.codigo)) {
        eje.sesiones.push({
          codigo: el.codigo,
          titulo: el.titulo,
          actividad: "zona",
          contenido: el.contenido,
          subsecciones: [],
        });
      }
    }
  }

  for (const el of elementos) {
    if (el.nivel !== "SUBSECCION") continue;
    const [a, b] = el.codigo.split(".");
    const eje = obtenerEje(a);
    let sesion = eje.sesiones.find((s) => s.codigo === `${a}.${b}`);
    if (!sesion) {
      sesion = {
        codigo: `${a}.${b}`,
        titulo: `Sesión ${a}.${b}`,
        actividad: "zona",
        contenido: "",
        subsecciones: [],
      };
      eje.sesiones.push(sesion);
    }
    if (!sesion.subsecciones.some((s) => s.codigo === el.codigo)) {
      sesion.subsecciones.push({
        codigo: el.codigo,
        titulo: el.titulo,
        contenido: el.contenido,
      });
    }
  }

  const ordenar = <T extends { codigo: string }>(lista: T[]) =>
    lista.sort((x, y) => comparar(x.codigo, y.codigo));

  const resultado = ordenar([...ejes.values()]);
  for (const eje of resultado) {
    ordenar(eje.sesiones);
    for (const sesion of eje.sesiones) {
      ordenar(sesion.subsecciones);
      sesion.actividad = sugerirActividad(
        sesion.titulo,
        sesion.subsecciones.map((s) => s.titulo)
      );
    }
  }
  return resultado;
}

/**
 * Actividades interactivas que puede realizar una sesión importada.
 * El valor se guarda en `Sesion.pantalla` y decide a qué pantalla lleva
 * el botón "Abrir" del mapa del estudiante.
 */
export const ACTIVIDADES = [
  { valor: "zona", etiqueta: "Archivo y anotaciones" },
  { valor: "cartografia", etiqueta: "Cartografía social" },
  { valor: "copla", etiqueta: "Tradición oral (copla)" },
  { valor: "simulador", etiqueta: "Simulador de tierras" },
  { valor: "jardin", etiqueta: "Jardín de la memoria" },
  { valor: "diario", etiqueta: "Diario personal" },
] as const;

export type Actividad = (typeof ACTIVIDADES)[number]["valor"];

/**
 * Propone la actividad de una sesión a partir de su título y el de sus
 * subsecciones. Es solo una sugerencia: el administrador la confirma o la
 * cambia en la pantalla de revisión.
 */
export function sugerirActividad(titulo: string, subtitulos: string[] = []): Actividad {
  const texto = [titulo, ...subtitulos].join(" ").toLowerCase();

  if (/repartir las tierras|repartici[óo]n de tierras/.test(texto)) return "simulador";
  if (/tierra de abundancia|copla|tradici[óo]n oral/.test(texto)) return "copla";
  if (/espacios y lugares|cartograf[íi]a|lugares? significativos?/.test(texto)) return "cartografia";
  if (/iniciativas? de memoria|monumento|museo|jard[íi]n/.test(texto)) return "jardin";
  if (/a qu[ée] te comprometes|compromiso|diario/.test(texto)) return "diario";

  return "zona";
}
