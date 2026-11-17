/**
 * Las actividades de la cartilla, apartado por apartado.
 *
 * Cada sesión tiene su actividad principal (la cartografía de la 1.1, la copla
 * de la 1.2, el simulador de la 1.4…), pero la cartilla del CNMH propone más
 * ejercicios dentro de cada apartado: ordenar la «Ley de los tres pasos», leer
 * el cuadro de la tierra en 1960, distinguir quién defendía la reforma agraria
 * y quién el enfoque productivista, desarmar la Ley 135… Este catálogo los
 * recoge con su contenido tal como viene en la cartilla del estudiante y en la
 * guía para maestros recortadas (Preámbulo y Eje 1).
 *
 * Cada actividad dice a qué apartado pertenece (su código, como en la cartilla)
 * y un patrón del título de ese apartado: así solo aparece en el módulo de El
 * Salado y no en otro caso que use la misma numeración. Un apartado «A
 * investigar» de cualquier módulo recibe además una investigación genérica, lo
 * que deja la plataforma lista para cuando se carguen los demás ejes.
 *
 * Lógica pura: no toca la base de datos.
 */

// ------------------------------------------------------------------- Tipos

export type Campo = {
  id: string;
  etiqueta: string;
  tipo: "texto" | "opcion";
  opciones?: string[];
  /** Un campo opcional no se exige para guardar. */
  opcional?: boolean;
  ayuda?: string;
};

/** El material que acompaña la actividad: un texto de la cartilla o un cuadro. */
export type Fuente = {
  titulo: string;
  texto?: string;
  /** Un cuadro de barras: cada fila con su porcentaje. */
  barras?: { etiqueta: string; valor: number }[];
  referencia: string;
};

type Base = {
  id: string;
  /** El apartado de la cartilla al que pertenece: «1.2.2». */
  codigo: string;
  /** El título del apartado tiene que contener esto, para no aparecer en otro módulo. */
  patron: RegExp;
  titulo: string;
  consigna: string;
  /** De dónde sale: «Cartilla del estudiante, 1.2.2». */
  origen: string;
  fuente?: Fuente;
};

export type ActividadPreguntas = Base & { tipo: "preguntas"; campos: Campo[] };

export type ActividadClasificar = Base & {
  tipo: "clasificar";
  categorias: { id: string; nombre: string }[];
  tarjetas: { id: string; texto: string; autor?: string; categoria: string }[];
  /** Una pregunta para escribir después de clasificar. */
  reflexion?: Campo;
};

export type ActividadOrdenar = Base & {
  tipo: "ordenar";
  /** Los pasos en el orden correcto. Se muestran mezclados. */
  pasos: { id: string; texto: string }[];
  reflexion?: Campo;
};

export type ActividadCartilla = ActividadPreguntas | ActividadClasificar | ActividadOrdenar;

/** La actividad sin su patrón: lo que viaja al navegador (una expresión regular no se serializa). */
export type ActividadVista = ActividadCartilla extends infer T ? (T extends unknown ? Omit<T, "patron"> : never) : never;

export function vistaDeActividad(actividad: ActividadCartilla): ActividadVista {
  const { patron: _patron, ...vista } = actividad;
  void _patron;
  return vista;
}

const MUNICIPIOS_COPLA = [
  "María la Baja",
  "El Carmen de Bolívar",
  "El Salado",
  "La Cansona",
  "San Jacinto",
  "El Guamo",
  "San Juan Nepomuceno",
  "Zambrano",
  "Ovejas",
  "Los Palmitos",
  "Macayepo",
  "Colosó",
  "Chalán",
  "Tolú",
  "San Onofre",
];

// ---------------------------------------------------------------- Catálogo

export const CATALOGO: ActividadCartilla[] = [
  // 1.1 · Guía para maestros, pasos 3 y 4.
  {
    id: "conflicto-espacio",
    tipo: "preguntas",
    codigo: "1.1",
    patron: /espacios y lugares/i,
    titulo: "Reconstruyo un conflicto por un espacio",
    consigna:
      "Piensa en un conflicto que se haya dado en un lugar importante para ti o para tu grupo: la cancha, la tienda, la esquina donde se reúnen. Reconstrúyelo con este esquema. Habrá distintas versiones de lo que pasó: eso habla de la pluralidad de las memorias.",
    origen: "Guía para maestros, sesión 1.1, pasos 3 y 4",
    campos: [
      { id: "lugar", etiqueta: "¿En qué lugar ocurrió?", tipo: "texto" },
      { id: "cuando", etiqueta: "Cuándo: ¿cuándo y cómo se desencadenó el conflicto? (los orígenes)", tipo: "texto" },
      { id: "quienes", etiqueta: "Quiénes: ¿quiénes estaban presentes y cómo actuaron? (los actores)", tipo: "texto" },
      { id: "porque", etiqueta: "Por qué: ¿por qué se originó el conflicto? (las causas)", tipo: "texto" },
      { id: "consecuencias", etiqueta: "Consecuencias: ¿qué pasó después?", tipo: "texto" },
      {
        id: "soluciones",
        etiqueta: "¿Qué otras soluciones, sin violencia, se podrían pensar? Que sean reales, que puedas aplicar en tu vida diaria.",
        tipo: "texto",
      },
    ],
  },

  // 1.2.1 · Cartilla del estudiante: «Elige uno de los municipios de la copla…» y «Para ir más allá».
  {
    id: "dia-campesino",
    tipo: "preguntas",
    codigo: "1.2.1",
    patron: /tierra de abundancia/i,
    titulo: "Un día en la vida de un campesino o una campesina",
    consigna:
      "Elige uno de los lugares de la copla e imagina cómo sería un día en la vida de un campesino o una campesina que vive allí. Describe con muchos detalles lo que haría en cada uno de los espacios que recorre a diario.",
    origen: "Cartilla del estudiante, 1.2.1 Tierra de abundancia",
    campos: [
      { id: "municipio", etiqueta: "Lugar de la copla", tipo: "opcion", opciones: MUNICIPIOS_COPLA },
      { id: "dia", etiqueta: "Su día, de la mañana a la noche", tipo: "texto" },
      {
        id: "versos",
        etiqueta: "Para ir más allá: compón uno o dos versos sobre la vocación económica y las prácticas culturales de tu región o tu municipio",
        tipo: "texto",
        opcional: true,
      },
    ],
  },

  // 1.2.2 · Cartilla del estudiante: «La Ley de los Tres Pasos» (Fals Borda) y su «Analiza».
  {
    id: "ley-tres-pasos",
    tipo: "ordenar",
    codigo: "1.2.2",
    patron: /poblamiento/i,
    titulo: "La Ley de los Tres Pasos",
    consigna:
      "Así se fueron concentrando las tierras en la región. Ordena los tres pasos, del primero al último, con los botones de subir y bajar.",
    origen: "Cartilla del estudiante, 1.2.2 (Fals Borda, citado por CNMH, 2010)",
    pasos: [
      { id: "colono", texto: "El colono tumba el monte y hace todo el trabajo de habilitar la tierra. Se queda hasta que la tierra «se cansa» y se va a tumbar en otra parte." },
      { id: "finquero", texto: "El colono malvende o cede sus mejoras a un finquero, contratista o intermediario, que explota a medias el terreno e intenta unir los lotes." },
      { id: "latifundista", texto: "El finquero o contratista cede, a su vez, ante las presiones de un latifundista empeñado en ampliar sus propiedades o en crear una nueva hacienda." },
    ],
    reflexion: {
      id: "estructura",
      etiqueta: "Describe en tus propias palabras cómo era la estructura agraria en los Montes de María y cómo funcionaba el proceso para cultivar tierras.",
      tipo: "texto",
    },
  },
  {
    id: "tierra-1960",
    tipo: "preguntas",
    codigo: "1.2.2",
    patron: /poblamiento/i,
    titulo: "La tierra en Colombia en 1960",
    consigna: "Lee el cuadro de la distribución de la propiedad rural en 1960 y el testimonio campesino de la cartilla, y responde.",
    origen: "Cartilla del estudiante, 1.2.2 (Rincón, 1997)",
    fuente: {
      titulo: "La propiedad de la tierra en Colombia, 1960",
      barras: [
        { etiqueta: "El 1,4 % de los propietarios poseía este porcentaje de las tierras", valor: 45.8 },
        { etiqueta: "El 87,0 % de los propietarios poseía solo este porcentaje de los predios", valor: 18 },
      ],
      texto:
        "«Nosotros queríamos tener la tierra y comernos el pancoger cuando nosotros quisiéramos. No cuando el terrateniente quisiera que le desocuparan la tierra.» Testimonio, taller en Ovejas, Sucre (CNMH, 2015).",
      referencia: "Cartilla del estudiante, 1.2.2",
    },
    campos: [
      {
        id: "distribucion",
        etiqueta: "¿Qué caracterizaba la distribución de la propiedad rural en Colombia en 1960 y qué impactos tiene esta distribución sobre los campesinos?",
        tipo: "texto",
      },
      { id: "poblamiento", etiqueta: "¿Cómo fueron poblados los Montes de María?", tipo: "texto" },
    ],
  },
  {
    id: "campesinos-terratenientes",
    tipo: "clasificar",
    codigo: "1.2.2",
    patron: /poblamiento/i,
    titulo: "Campesinos y colonos, terratenientes y latifundistas",
    consigna:
      "Con lo que leíste en el apartado, ¿qué caracterizaba a cada uno? Elige, para cada rasgo, a quién corresponde. Después arma tu propio cuadro.",
    origen: "Cartilla del estudiante, 1.2.2 «Realiza un mapa, cuadro o gráfico…»",
    categorias: [
      { id: "campesino", nombre: "Campesinos y colonos" },
      { id: "terrateniente", nombre: "Terratenientes y latifundistas" },
    ],
    tarjetas: [
      { id: "t1", texto: "Tumban el monte y habilitan la tierra para sembrar", categoria: "campesino" },
      { id: "t2", texto: "Quieren sembrar el pancoger y comerlo cuando ellos quieran", categoria: "campesino" },
      { id: "t3", texto: "Siempre han trabajado la tierra, aun cuando no fuera de ellos", categoria: "campesino" },
      { id: "t4", texto: "Quieren conservar sus formas de vida y la tierra que cultivan", categoria: "campesino" },
      { id: "t5", texto: "Presionan para expandir sus propiedades", categoria: "terrateniente" },
      { id: "t6", texto: "Prestan un pedazo de tierra y ponen plazo para desocuparla", categoria: "terrateniente" },
      { id: "t7", texto: "Invierten los excedentes del comercio en comprar y concentrar tierras", categoria: "terrateniente" },
      { id: "t8", texto: "Convierten las tierras planas en grandes haciendas ganaderas", categoria: "terrateniente" },
    ],
    reflexion: {
      id: "cuadro",
      etiqueta: "Tu cuadro: ¿qué actividades, roles y relación con la tierra tenía cada uno?",
      tipo: "texto",
    },
  },
  {
    id: "glosario-tierra",
    tipo: "clasificar",
    codigo: "1.2.2",
    patron: /poblamiento/i,
    titulo: "Glosario: las palabras de la tierra",
    consigna: "Une cada definición con su palabra. Son las del glosario de la cartilla.",
    origen: "Cartilla del estudiante, glosario de 1.2.2",
    categorias: [
      { id: "latifundio", nombre: "Latifundio" },
      { id: "minifundio", nombre: "Minifundio" },
      { id: "estructura", nombre: "Estructura agraria" },
      { id: "baldios", nombre: "Terrenos baldíos" },
    ],
    tarjetas: [
      { id: "g1", texto: "Propiedad de gran extensión, dedicada en parte a la agricultura o a la ganadería", categoria: "latifundio" },
      { id: "g2", texto: "Terreno de extensión reducida cultivado por una familia", categoria: "minifundio" },
      { id: "g3", texto: "Resultado de las relaciones políticas, económicas y sociales que gobiernan el acceso a la tierra y su uso", categoria: "estructura" },
      { id: "g4", texto: "Terreno sin edificar ni cultivar que es del Estado porque no tiene otro dueño", categoria: "baldios" },
    ],
  },

  // 1.3.1 y 1.3.2 · Cartilla del estudiante: los argumentos de la redistribución y del enfoque productivista.
  {
    id: "quien-lo-dijo",
    tipo: "clasificar",
    codigo: "1.3.2",
    patron: /productivista/i,
    titulo: "¿Quién defendía qué? Las fuentes de 1960 y 1961",
    consigna:
      "Las fuentes muestran el punto de vista de quienes las produjeron; no son la verdad. Clasifica cada fragmento según la postura que defiende y fíjate en quién lo dijo y desde qué lugar.",
    origen: "Cartilla del estudiante, 1.3.1 y 1.3.2; guía para maestros, «Antes de empezar»",
    categorias: [
      { id: "redistribucion", nombre: "A favor de redistribuir la tierra" },
      { id: "productivista", nombre: "Enfoque productivista" },
    ],
    tarjetas: [
      {
        id: "q1",
        texto: "«El primer deber de nuestra democracia es dignificar al campesino a través de la propiedad de la tierra»",
        autor: "Alberto Lleras Camargo, presidente, 1961",
        categoria: "redistribucion",
      },
      {
        id: "q2",
        texto: "Es necesario hacer las tierras asequibles a campesinos que carecen de propiedad o trabajan en duras condiciones en predios ajenos",
        autor: "Exposición de motivos del Proyecto de Ley 167 de 1961",
        categoria: "redistribucion",
      },
      {
        id: "q3",
        texto: "«La distribución de la tierra es una solución simplista y no mejora la producción»",
        autor: "Congresista del Partido Liberal, Magdalena, 1960",
        categoria: "productivista",
      },
      {
        id: "q4",
        texto: "«El proyecto tiene implicaciones sovietizantes por proponer la abolición de la propiedad privada»",
        autor: "Congresista del Partido Conservador, Antioquia, 1961",
        categoria: "productivista",
      },
      {
        id: "q5",
        texto: "«La reforma afecta la economía nacional, no mejora la productividad»",
        autor: "Congresista del Partido Conservador, Huila, 1961",
        categoria: "productivista",
      },
      {
        id: "q6",
        texto: "Llevar a los trabajadores del campo a las grandes ciudades y acelerar la tecnificación de la agricultura y la ganadería",
        autor: "Propuesta «Operación Colombia», Lauchlin Currie, 1961",
        categoria: "productivista",
      },
    ],
    reflexion: {
      id: "postura",
      etiqueta:
        "¿Cuál es el problema agrario según cada perspectiva y cómo lo resolvería cada una? ¿Cuál de las dos posturas defenderías? ¿Por qué?",
      tipo: "texto",
    },
  },

  // 1.3.3 · Cartilla del estudiante: la Ley 135 de 1961 y la falsa invitación a las exequias.
  {
    id: "ley-135",
    tipo: "clasificar",
    codigo: "1.3.3",
    patron: /ley 135/i,
    titulo: "Desarmo la Ley 135 de 1961",
    consigna: "Responde las tres preguntas de la cartilla sobre cómo se desplegó la Reforma Agraria: ubica cada dato en su pregunta.",
    origen: "Cartilla del estudiante, 1.3.3 (Ley 135 de 1961)",
    categorias: [
      { id: "tierras", nombre: "¿Qué tierras eran aptas para distribuir?" },
      { id: "institucion", nombre: "¿Qué institución llevaría a cabo la adjudicación?" },
      { id: "quien", nombre: "¿A quién se le entregarían las tierras?" },
    ],
    tarjetas: [
      { id: "l1", texto: "Tierras baldías y tierras privadas sin cultivar o inadecuadamente cultivadas", categoria: "tierras" },
      { id: "l2", texto: "Tierras adecuadamente explotadas que sus propietarios negociaran", categoria: "tierras" },
      { id: "l3", texto: "El Instituto Colombiano de Reforma Agraria (INCORA)", categoria: "institucion" },
      { id: "l4", texto: "Campesinos sin tierras, pequeños colonos, arrendatarios y aparceros", categoria: "quien" },
      { id: "l5", texto: "Trabajadores pobres capaces de explotarlas con su esfuerzo y el de su familia", categoria: "quien" },
    ],
    reflexion: { id: "objetivos", etiqueta: "¿Cuáles eran los objetivos de la Ley de Reforma Agraria de 1961?", tipo: "texto" },
  },
  {
    id: "exequias",
    tipo: "preguntas",
    codigo: "1.3.3",
    patron: /ley 135/i,
    titulo: "La falsa invitación a las exequias de Carlos Lleras Restrepo",
    consigna:
      "En 1961 circuló una falsa invitación a las exequias de Carlos Lleras Restrepo por defender la Reforma Agraria. Mira la fotografía en la cartilla y analízala.",
    origen: "Cartilla del estudiante, 1.3.3; guía para maestros, sesión 1.3 paso 4",
    campos: [
      { id: "significa", etiqueta: "¿Qué crees que significa «exequias políticas»?", tipo: "texto" },
      { id: "porque", etiqueta: "¿Por qué crees que enviaron una falsa invitación a las exequias políticas de Carlos Lleras Restrepo?", tipo: "texto" },
      { id: "genera", etiqueta: "¿Qué puede generar este tipo de mensajes en él y en la comunidad campesina que lo respalda?", tipo: "texto" },
      {
        id: "tipo",
        etiqueta: "¿Qué es este mensaje?",
        tipo: "opcion",
        opciones: ["Una noticia falsa", "Una amenaza política", "Las dos cosas"],
        ayuda: "La guía pide distinguir una noticia falsa de una amenaza política.",
      },
    ],
  },

  // 1.3.4 · Cartilla del estudiante y rutas de investigación de la guía para maestros.
  {
    id: "tierra-hoy",
    tipo: "preguntas",
    codigo: "1.3.4",
    patron: /tierra en colombia hoy/i,
    titulo: "A investigar: y hoy en día, ¿qué sucede con las tierras en el país?",
    consigna:
      "Elige una ruta de investigación, busca en distintas fuentes y cuenta lo que encontraste. No hay respuestas correctas o incorrectas: lo que vale es tu reflexión.",
    origen: "Cartilla del estudiante, 1.3.4; guía para maestros, rutas de la sesión 1.3",
    campos: [
      {
        id: "ruta",
        etiqueta: "Tu ruta de investigación",
        tipo: "opcion",
        opciones: [
          "Comparar la problemática agraria de los sesenta con la actual",
          "La problemática agraria actual de los Montes de María",
          "La tierra en los Montes de María y en mi región",
          "Tierra y minería en Colombia",
          "Tierra y conflicto armado",
        ],
      },
      { id: "distribucion", etiqueta: "El estado de la distribución de la tierra", tipo: "texto" },
      { id: "ente", etiqueta: "El ente encargado de repartir las tierras en el lugar donde vives", tipo: "texto" },
      { id: "leyes", etiqueta: "Leyes vigentes sobre la tenencia de la tierra", tipo: "texto" },
      { id: "fuentes", etiqueta: "Tus fuentes, una por línea", tipo: "texto", ayuda: "Por ejemplo: la Ley 1448 de 2011, el Acuerdo de Paz, la Agencia Nacional de Tierras." },
    ],
  },

  // 1.4.1 · Guía para maestros: «Para complejizar el ejercicio…» y preguntas de la cartilla.
  {
    id: "complejizar-reparto",
    tipo: "preguntas",
    codigo: "1.4.1",
    patron: /repartir las tierras/i,
    titulo: "Después del reparto: lo que también hay que pensar",
    consigna:
      "Vuelve sobre tu reparto en el simulador. Una reforma agraria no termina al asignar los lotes: piensa en estas preguntas de la cartilla y de la guía.",
    origen: "Cartilla del estudiante, 1.4.1; guía para maestros, sesión 1.4",
    campos: [
      { id: "ambiente", etiqueta: "¿Qué impactos ambientales puede generar habitar y repartir familias en esas tierras?", tipo: "texto" },
      { id: "reacciones", etiqueta: "¿Cómo crees que pueden responder los diferentes implicados ante tu decisión de repartición?", tipo: "texto" },
      { id: "conflictos", etiqueta: "¿Qué harías frente a las posibles inconformidades o conflictos que desate la repartición?", tipo: "texto" },
      { id: "mujeres", etiqueta: "¿Qué tuviste en cuenta en relación con las mujeres cabeza de familia?", tipo: "texto" },
      { id: "nuevas", etiqueta: "Si aparecieran nuevas familias que no estaban contempladas, ¿cómo cambiarías tu reparto?", tipo: "texto" },
    ],
  },

  // 1.4.2 · Cartilla del estudiante: el dilema de los colonos, el consejo comunitario y el resguardo zenú.
  {
    id: "dilema-etnico",
    tipo: "preguntas",
    codigo: "1.4.2",
    patron: /comunidades [ée]tnicas/i,
    titulo: "Mesa de diálogo: colonos, consejo comunitario y resguardo zenú",
    consigna:
      "Imagina que vives en Sucre, tienes 17 años y tu comunidad campesina llegó hace 40 años a una tierra desocupada. Al otro lado del río hay un consejo comunitario afrodescendiente, que está allí desde la Colonia y tituló su tierra hace cinco años; río arriba, un resguardo zenú, que está allí desde antes de la Colonia y considera sagrada su tierra. Tu comunidad necesita tierra para cultivar. ¿Qué hacer?",
    origen: "Cartilla del estudiante, 1.4.2",
    fuente: {
      titulo: "Lo que dice la Constitución de 1991",
      texto:
        "Art. 7: el Estado reconoce y protege la diversidad étnica y cultural de la nación. Art. 64: es deber del Estado promover el acceso progresivo a la propiedad de la tierra de los trabajadores agrarios. Art. 329: los resguardos son de propiedad colectiva y no enajenable. Art. 330: los territorios indígenas se gobiernan por consejos según los usos y costumbres de sus comunidades. La Ley 70 de 1993 reconoce los consejos comunitarios de las comunidades negras.",
      referencia: "Cartilla del estudiante, 1.4.2",
    },
    campos: [
      {
        id: "decision",
        etiqueta: "¿Qué harían?",
        tipo: "opcion",
        opciones: ["Apropiarnos de esa tierra y entrar en disputa", "Sentarnos a negociar con el consejo comunitario y el resguardo", "Otra salida (explícala abajo)"],
      },
      {
        id: "sentidos",
        etiqueta: "Describe la relación de cada comunidad con la tierra y los sentidos que le otorga: colonos, consejo comunitario y resguardo.",
        tipo: "texto",
      },
      { id: "actores", etiqueta: "¿Con quiénes de tu comunidad necesitas reunirte para decidir? ¿A qué otros actores vincularías?", tipo: "texto" },
      { id: "respeto", etiqueta: "¿Qué harías para no pasar por encima de las creencias históricas de las comunidades indígenas y negras?", tipo: "texto" },
      { id: "agua", etiqueta: "¿A qué acuerdos se podría llegar sobre los bienes comunes, como el agua?", tipo: "texto" },
    ],
  },
  {
    id: "glosario-territorio",
    tipo: "clasificar",
    codigo: "1.4.2",
    patron: /comunidades [ée]tnicas/i,
    titulo: "Glosario: las palabras del territorio",
    consigna: "Une cada definición con su palabra. Son las del glosario de la cartilla sobre la propiedad colectiva.",
    origen: "Cartilla del estudiante, glosario de 1.4.2",
    categorias: [
      { id: "inalienable", nombre: "Inalienable" },
      { id: "imprescriptible", nombre: "Imprescriptible" },
      { id: "inembargable", nombre: "Inembargable" },
      { id: "adjudicar", nombre: "Adjudicar" },
    ],
    tarjetas: [
      { id: "d1", texto: "Que no se puede vender ni ceder legalmente a otra persona", categoria: "inalienable" },
      { id: "d2", texto: "Que no pierde vigencia con el paso del tiempo", categoria: "imprescriptible" },
      { id: "d3", texto: "Que la ley protege para que no se pueda retener por una deuda", categoria: "inembargable" },
      { id: "d4", texto: "Declarar que un bien corresponde a una persona u organización", categoria: "adjudicar" },
    ],
  },
];

/** La investigación que recibe un apartado «A investigar: …» que el catálogo no cubre. */
function investigacionGenerica(codigo: string, tema: string): ActividadPreguntas {
  return {
    id: `investigar-${codigo}`,
    tipo: "preguntas",
    codigo,
    patron: /a investigar/i,
    titulo: `A investigar: ${tema}`,
    consigna: "Busca en libros, páginas web o pregunta a tu familia y tus vecinos. Cuenta lo que encontraste y anota de dónde lo sacaste.",
    origen: `Apartado ${codigo} de la cartilla`,
    campos: [
      { id: "hallazgos", etiqueta: "Lo que encontraste", tipo: "texto" },
      { id: "fuentes", etiqueta: "Tus fuentes, una por línea", tipo: "texto" },
    ],
  };
}

// ---------------------------------------------------------------- Ubicación

export type Apartado = { codigo: string; titulo: string };
export type ActividadEnSesion = { actividad: ActividadCartilla; apartado: Apartado };

/**
 * Las actividades de la cartilla que trae una sesión, en el orden de sus
 * apartados: primero las de la sesión misma, después las de cada subsección.
 */
export function actividadesDeSesion(sesion: Apartado, subsecciones: Apartado[]): ActividadEnSesion[] {
  const resultado: ActividadEnSesion[] = [];
  for (const apartado of [sesion, ...subsecciones]) {
    const delCatalogo = CATALOGO.filter((a) => a.codigo === apartado.codigo && a.patron.test(apartado.titulo));
    for (const actividad of delCatalogo) resultado.push({ actividad, apartado });
    const investigar = /^\s*a investigar\s*:\s*(.+)$/i.exec(apartado.titulo);
    if (investigar && !delCatalogo.length && apartado !== sesion) {
      resultado.push({ actividad: investigacionGenerica(apartado.codigo, investigar[1].trim()), apartado });
    }
  }
  return resultado;
}

/** Busca una actividad por su identificador entre las que trae la sesión. */
export function actividadDeSesion(id: string, sesion: Apartado, subsecciones: Apartado[]): ActividadCartilla | null {
  return actividadesDeSesion(sesion, subsecciones).find((x) => x.actividad.id === id)?.actividad ?? null;
}

// -------------------------------------------------------------- Respuestas

export const LIMITES_CARTILLA = { campoMinimo: 15, campoMaximo: 3000 };

export type DatosCartilla = {
  respuestas?: Record<string, string>;
  asignaciones?: Record<string, string>;
  orden?: string[];
  reflexion?: string;
};

const limpiar = (t: unknown) => String(t ?? "").trim();

function revisarCampo(campo: Campo, valor: string): string | null {
  if (campo.tipo === "opcion") {
    if (!valor) return campo.opcional ? null : `Elige una opción en «${campo.etiqueta}».`;
    return campo.opciones?.includes(valor) ? null : `Esa opción no está en «${campo.etiqueta}».`;
  }
  if (!valor) return campo.opcional ? null : `Responde «${campo.etiqueta}».`;
  if (valor.length < LIMITES_CARTILLA.campoMinimo && !campo.opcional) {
    return `Desarrolla un poco más «${campo.etiqueta}» (al menos ${LIMITES_CARTILLA.campoMinimo} caracteres).`;
  }
  if (valor.length > LIMITES_CARTILLA.campoMaximo) return `«${campo.etiqueta}» es demasiado larga.`;
  return null;
}

/**
 * Revisa lo que envió el estudiante y devuelve lo que se guarda: los datos
 * limpios y un resumen legible para el docente.
 */
export function validarRespuestaCartilla(
  actividad: ActividadCartilla,
  entrada: unknown
): { datos: DatosCartilla; texto: string } | { error: string } {
  const e = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;

  if (actividad.tipo === "preguntas") {
    const crudas = (e.respuestas && typeof e.respuestas === "object" ? e.respuestas : {}) as Record<string, unknown>;
    const respuestas: Record<string, string> = {};
    for (const campo of actividad.campos) {
      const valor = limpiar(crudas[campo.id]);
      const error = revisarCampo(campo, valor);
      if (error) return { error };
      if (valor) respuestas[campo.id] = valor;
    }
    const texto = actividad.campos
      .filter((c) => respuestas[c.id])
      .map((c) => `${c.etiqueta}\n${respuestas[c.id]}`)
      .join("\n\n");
    return { datos: { respuestas }, texto };
  }

  const reflexion = limpiar(e.reflexion);
  if (actividad.reflexion) {
    const error = revisarCampo(actividad.reflexion, reflexion);
    if (error) return { error };
  }

  if (actividad.tipo === "clasificar") {
    const crudas = (e.asignaciones && typeof e.asignaciones === "object" ? e.asignaciones : {}) as Record<string, unknown>;
    const validas = new Set(actividad.categorias.map((c) => c.id));
    const asignaciones: Record<string, string> = {};
    for (const t of actividad.tarjetas) {
      const valor = limpiar(crudas[t.id]);
      if (!validas.has(valor)) return { error: "Ubica todas las tarjetas antes de guardar." };
      asignaciones[t.id] = valor;
    }
    const { correctas, total } = evaluar(actividad, { asignaciones });
    return {
      datos: { asignaciones, ...(reflexion ? { reflexion } : {}) },
      texto: [`Clasificación: ${correctas} de ${total} correctas.`, reflexion].filter(Boolean).join("\n\n"),
    };
  }

  const orden = Array.isArray(e.orden) ? e.orden.map(limpiar) : [];
  const ids = actividad.pasos.map((p) => p.id);
  if (orden.length !== ids.length || !ids.every((id) => orden.includes(id))) return { error: "Ordena todos los pasos antes de guardar." };
  const { correctas, total } = evaluar(actividad, { orden });
  return {
    datos: { orden, ...(reflexion ? { reflexion } : {}) },
    texto: [`Orden: ${correctas} de ${total} pasos en su lugar.`, reflexion].filter(Boolean).join("\n\n"),
  };
}

/** Cuántas tarjetas o pasos quedaron en su lugar. Las preguntas abiertas no se califican. */
export function evaluar(actividad: ActividadVista, datos: DatosCartilla): { correctas: number; total: number } {
  if (actividad.tipo === "clasificar") {
    const correctas = actividad.tarjetas.filter((t) => datos.asignaciones?.[t.id] === t.categoria).length;
    return { correctas, total: actividad.tarjetas.length };
  }
  if (actividad.tipo === "ordenar") {
    const correctas = actividad.pasos.filter((p, i) => datos.orden?.[i] === p.id).length;
    return { correctas, total: actividad.pasos.length };
  }
  return { correctas: 0, total: 0 };
}

/** Lee lo guardado en la base, que puede venir incompleto. */
export function leerDatosCartilla(valor: unknown): DatosCartilla {
  const v = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  const mapa = (x: unknown) =>
    x && typeof x === "object" ? Object.fromEntries(Object.entries(x).filter(([, y]) => typeof y === "string")) as Record<string, string> : undefined;
  return {
    respuestas: mapa(v.respuestas),
    asignaciones: mapa(v.asignaciones),
    orden: Array.isArray(v.orden) ? v.orden.filter((x): x is string => typeof x === "string") : undefined,
    reflexion: typeof v.reflexion === "string" ? v.reflexion : undefined,
  };
}

/**
 * El orden en que se muestran los pasos antes de que el estudiante los toque:
 * mezclados, pero siempre igual (para que no cambien al recargar) y con
 * ningún paso en su lugar: cada uno corrido una posición.
 */
export function pasosMezclados<T extends { id: string }>(pasos: T[]): T[] {
  if (pasos.length < 2) return [...pasos];
  return [pasos[pasos.length - 1], ...pasos.slice(0, -1)];
}
