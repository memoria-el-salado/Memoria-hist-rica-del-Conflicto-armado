/**
 * Captura las pantallas de la aplicación para ilustrar el Manual de Usuario.
 *
 * No hacen falta datos de demostración ni se toca ninguna cuenta real: el
 * guion crea cuentas `prueba.manual.*` con nombres de ejemplo, un curso y un
 * módulo de prueba que copia el título y el texto de algunas sesiones del
 * módulo activo, con las actividades de la v2. Deja algo de trabajo hecho para
 * que las pantallas no salgan vacías, captura y, al terminar, lo borra todo,
 * igual que las pruebas de extremo a extremo.
 *
 * Donde una pantalla lista datos de toda la plataforma (los docentes, los
 * módulos), antes de capturar se ocultan las filas que no son del ejemplo.
 *
 *   npm run dev            (en otra terminal)
 *   npm run manual:capturar
 *   npm run manual:generar
 */
import { mkdir, rm } from "fs/promises";
import path from "path";
import { BASE, PREFIJO, PREFIJO_MODULO, crearCuenta, ejecutar, entrar, esperarTexto, prisma, visitar } from "./pruebas/entorno.mjs";

const SALIDA = path.join(process.cwd(), "manual", "capturas");

/** Las sesiones del ejemplo: código y texto del módulo activo; la actividad, la de la v2. */
const SESIONES = [
  ["1.1", "cartografia"],
  ["1.2", "despensa"],
  ["1.3", "zona"],
  ["1.4", "simulador"],
  ["3.1", "dilema"],
  ["5.2", "testimonios"],
  ["6.3", "jardin"],
  ["6.4", "compromiso"],
];

/** Las hectáreas de los lotes que se usan en el ejemplo (las del plano, en src/lib/simulador-lotes.ts). */
const HECTAREAS = { L01: 20, L02: 20, L03: 15, L04: 15, L07: 10, L08: 10, L09: 10, L10: 10, L11: 10, L12: 10, L05: 5, L06: 5 };

const GUARDAR = "::-p-xpath(//form//button[@type='submit'][normalize-space()='Guardar' or normalize-space()='Actualizar'])";
const DILEMA = "Tu vereda sufre una injusticia que nadie atiende. ¿Qué camino tomarías?";
const OPCIONES = ["Organizarse y denunciar", "Buscar apoyo de otras veredas", "Esperar a que el Estado responda"];

/** El módulo activo; si hay más de uno, el de la guía del estudiante y no el de la guía para maestros. */
async function moduloActivo(incluir = undefined) {
  const activos = await prisma.caso.findMany({ where: { activo: true }, orderBy: { creadoEn: "asc" }, include: incluir });
  return activos.find((c) => !/maestr/i.test(c.nombre)) ?? activos[0];
}

/** Copia sesiones del módulo activo en un módulo de prueba, con sus ejes y sus subsecciones. */
async function crearModuloEjemplo() {
  const activo = await moduloActivo({ ejes: { orderBy: { orden: "asc" }, include: { sesiones: { include: { subsecciones: true } } } } });
  if (!activo) throw new Error("No hay un módulo activo del que copiar las sesiones.");

  const origen = new Map(activo.ejes.flatMap((e) => e.sesiones.map((s) => [s.codigo, { eje: e, sesion: s }])));
  const ejes = new Map();
  for (const [codigo, pantalla] of SESIONES) {
    const o = origen.get(codigo);
    if (!o) continue;
    if (!ejes.has(o.eje.id)) ejes.set(o.eje.id, { eje: o.eje, sesiones: [] });
    ejes.get(o.eje.id).sesiones.push({ ...o.sesion, pantalla });
  }

  const caso = await prisma.caso.create({
    data: {
      nombre: `${PREFIJO_MODULO} manual ${Date.now()}`,
      depto: activo.depto,
      ejes: {
        create: [...ejes.values()].map(({ eje, sesiones }, i) => ({
          numero: eje.numero,
          nombre: eje.nombre,
          descripcion: eje.descripcion,
          tono: eje.tono,
          orden: i,
          sesiones: {
            create: sesiones.map((s, j) => ({
              codigo: s.codigo,
              titulo: s.titulo,
              tipo: s.pantalla,
              pantalla: s.pantalla,
              publicada: true,
              orden: j,
              contenido: s.contenido,
              preguntaOrientadora: s.preguntaOrientadora,
              subsecciones: { create: s.subsecciones.map(({ codigo, titulo, orden, contenido }) => ({ codigo, titulo, orden, contenido })) },
            })),
          },
        })),
      },
    },
    include: { ejes: { include: { sesiones: { include: { subsecciones: { orderBy: { orden: "asc" } } } } } } },
  });
  return { sesiones: new Map(caso.ejes.flatMap((e) => e.sesiones.map((s) => [s.pantalla, s]))) };
}

/** El primer párrafo que el estudiante ve en la lectura, para citarlo. */
function primerParrafo(sesion) {
  const textos = [sesion.contenido, ...sesion.subsecciones.map((s) => s.contenido)].filter(Boolean);
  return textos.join("\n\n").split(/\n{2,}/).map((p) => p.replace(/\s+/g, " ").trim()).find((p) => p.length > 40) ?? null;
}

/** Oculta las filas de datos reales que no forman parte del ejemplo. */
async function ocultarFilas(pagina, textos, fila) {
  await pagina.evaluate(
    (textos, fila) => {
      for (const el of document.querySelectorAll("body *")) {
        if (el.children.length === 0 && textos.some((t) => el.textContent.trim().startsWith(t))) {
          const contenedor = el.closest(fila);
          if (contenedor) contenedor.style.display = "none";
        }
      }
    },
    textos,
    fila
  );
}

await ejecutar("Capturas del manual de usuario", async ({ abrir }) => {
  await rm(SALIDA, { recursive: true, force: true });
  await mkdir(SALIDA, { recursive: true });

  // --- El ejemplo -------------------------------------------------------------------
  const { sesiones } = await crearModuloEjemplo();
  const s = (pantalla) => sesiones.get(pantalla);
  const url = (pantalla) => `${BASE}/estudiante/sesion/${s(pantalla).id}`;

  const docente = await crearCuenta("manual.docente", "DOCENTE", { nombre: "Liliana Ramírez", iniciales: "LR" });
  const curso = await prisma.curso.create({ data: { nombre: "Noveno A", anio: 2026, docenteId: docente.id } });
  const estudiante = (sufijo, nombre, iniciales, extra = {}) =>
    crearCuenta(`manual.${sufijo}`, "ESTUDIANTE", { nombre, iniciales, creadoPorId: docente.id, cursoId: curso.id, ...extra });
  const maria = await estudiante("maria", "María Estrada", "ME", { explorador: "GUARDIAN" });
  const camila = await estudiante("camila", "Camila Torres", "CT", { explorador: "SEMILLERO" });
  const juan = await estudiante("juan", "Juan Pérez", "JP", { explorador: null });
  await estudiante("andres", "Andrés Villalba", "AV", { explorador: null, debeCambiarContrasena: true });
  await crearCuenta("manual.admin", "ADMIN", { nombre: "Administración", iniciales: "AD" });

  // Anotaciones en hilo sobre la lectura.
  const lectura = s("zona");
  const cita = primerParrafo(lectura);
  const anotacion = await prisma.anotacion.create({
    data: { autorId: maria.id, sesionId: lectura.id, cita, destacada: true, texto: "Aquí se ve que la pelea no era solo por la tierra, sino por dos maneras de vivir en el campo." },
  });
  await prisma.anotacion.create({ data: { autorId: camila.id, sesionId: lectura.id, respuestaAId: anotacion.id, texto: "Sí, y una de las dos dejaba a las familias campesinas sin nada." } });
  await prisma.anotacion.create({ data: { autorId: docente.id, sesionId: lectura.id, respuestaAId: anotacion.id, texto: "Muy buena lectura. ¿Qué modelo se parece más al de su municipio hoy?" } });
  await prisma.anotacion.create({ data: { autorId: juan.id, sesionId: lectura.id, texto: "No sabía que el Estado había apoyado a los campesinos a organizarse." } });
  await prisma.meSirve.createMany({ data: [{ anotacionId: anotacion.id, userId: camila.id }, { anotacionId: anotacion.id, userId: juan.id }] });

  // Un reparto de tierras a medio hacer: las familias prioritarias primero.
  const familias = await prisma.familia.findMany({ orderBy: [{ prioridad: "asc" }, { orden: "asc" }] });
  const lotes = Object.keys(HECTAREAS);
  const simulacion = await prisma.simulacion.create({ data: { userId: maria.id, sesionId: s("simulador").id } });
  await prisma.asignacion.createMany({
    data: familias.slice(0, lotes.length).map((f, i) => ({
      simulacionId: simulacion.id,
      familiaId: f.id,
      lotes: [lotes[i]],
      hectareas: HECTAREAS[lotes[i]],
      subsidio: f.prioridad === "ALTA" ? "AGRICULTURA" : "NINGUNO",
    })),
  });

  // El jardín, el diario compartido con su comentario y un pedido de acompañamiento.
  await prisma.florJardin.createMany({
    data: [
      {
        autorId: camila.id, sesionId: s("jardin").id, nombre: "Mi abuela Carmen", epoca: "RETORNO", pieza: "FLOR", tono: "#D95D39", altura: 90, creacion: "CARTA",
        legado: "Volvió a sembrar cuando nadie creía que se podía.",
        texto: "Abuela: gracias por enseñarme que la tierra también se cuida con paciencia. Cuando siembro pienso en ti.",
      },
      { autorId: maria.id, sesionId: s("jardin").id, nombre: "La tienda de la esquina", epoca: "ANTES_1997", pieza: "HOJA", tono: "#1B8A8A", altura: 60, legado: "Ahí se reunía todo el pueblo a conversar." },
    ],
  });
  const entrada = await prisma.entradaDiario.create({
    data: { autorId: maria.id, emocion: "ESPERANZA", privada: false, texto: "Hoy entendí por qué mi abuelo habla tanto de su finca. No era solo un terreno, era su vida." },
  });
  await prisma.comentario.create({
    data: { docenteId: docente.id, estudianteId: maria.id, entradaId: entrada.id, texto: "Gracias por compartirlo, María. Si quieres, pregúntale a tu abuelo cómo era un día en su finca." },
  });
  await prisma.solicitudAcompanamiento.create({
    data: { estudianteId: juan.id, docenteId: docente.id, sesionId: s("testimonios").id, mensaje: "Me quedé pensando en los testimonios, ¿podemos hablar?" },
  });
  await prisma.respuestaActividad.create({
    data: { userId: camila.id, sesionId: s("compromiso").id, texto: "Me comprometo a escuchar a mis vecinos antes de juzgarlos, y a preguntar antes de repetir lo que se dice de otros.", datos: { compartido: true } },
  });
  await prisma.foro.create({
    data: { pregunta: "¿Se justifica tomar las armas ante una injusticia?", rolA: "Sí, cuando no hay otra salida", rolB: "No, hay otros caminos", autorId: docente.id, sesionId: s("dilema").id },
  });

  // --- El navegador ---------------------------------------------------------------
  const navegador = await abrir(["--hide-scrollbars"]);
  let contador = 0;
  const tomadas = [];

  async function nueva() {
    const contexto = await navegador.createBrowserContext();
    const p = await contexto.newPage();
    await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    // El indicador de desarrollo de Next no forma parte de la aplicación.
    await p.evaluateOnNewDocument(() => {
      const estilo = document.createElement("style");
      estilo.textContent = "nextjs-portal, #__next-build-watcher, [data-nextjs-toast] { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () => document.head.append(estilo));
    });
    p.on("dialog", (d) => d.accept());
    return p;
  }

  async function capturar(p, nombre, esperar = 700) {
    await new Promise((r) => setTimeout(r, esperar));
    contador += 1;
    const archivo = `${String(contador).padStart(2, "0")}-${nombre}.png`;
    await p.screenshot({ path: path.join(SALIDA, archivo) });
    tomadas.push(archivo);
    console.log("  ", archivo);
  }

  async function ir(p, ruta, esperar = 0) {
    await visitar(p, ruta.startsWith("http") ? ruta : `${BASE}${ruta}`);
    if (esperar) await new Promise((r) => setTimeout(r, esperar));
  }

  // --- Sin cuenta ------------------------------------------------------------------
  const anonimo = await nueva();
  await ir(anonimo, "/");
  await capturar(anonimo, "portada");
  await ir(anonimo, "/login");
  await anonimo.click('::-p-xpath(//button[.//span[normalize-space()="Estudiante"]])');
  await capturar(anonimo, "login");

  // --- Primera entrada ----------------------------------------------------------------
  const andres = await nueva();
  await entrar(andres, `${PREFIJO}manual.andres`, "ESTUDIANTE");
  await capturar(andres, "primer-ingreso");

  const pJuan = await nueva();
  await entrar(pJuan, `${PREFIJO}manual.juan`, "ESTUDIANTE");
  await capturar(pJuan, "explorador");

  // --- El docente plantea el dilema -----------------------------------------------
  const doc = await nueva();
  await entrar(doc, `${PREFIJO}manual.docente`, "DOCENTE");
  await ir(doc, `/docente/sesiones/${s("dilema").id}`);
  await doc.$eval("#pregunta-planteamiento", (el) => el.select());
  await doc.keyboard.press("Backspace");
  await doc.type("#pregunta-planteamiento", DILEMA);
  await doc.type("#opcion-0", OPCIONES[0]);
  await doc.type("#opcion-1", OPCIONES[1]);
  await doc.click("::-p-text(+ Otra opción)");
  await doc.type("#opcion-2", OPCIONES[2]);
  await doc.click("::-p-text(Plantear el dilema)");
  await esperarTexto(doc, "Dilema planteado.");

  // Camila elige antes, para que María vea cómo eligió su curso.
  const pCamila = await nueva();
  await entrar(pCamila, `${PREFIJO}manual.camila`, "ESTUDIANTE");
  await ir(pCamila, url("dilema"));
  await pCamila.click(`::-p-xpath(//label[normalize-space()="${OPCIONES[1]}"])`);
  await pCamila.type("#respuesta-guiada", "Porque sola una vereda no tiene fuerza, pero varias juntas sí pueden hacerse escuchar.");
  await pCamila.click(GUARDAR);
  await esperarTexto(pCamila, "Tu elección quedó guardada.");

  // --- La estudiante ----------------------------------------------------------------
  const est = await nueva();
  await entrar(est, `${PREFIJO}manual.maria`, "ESTUDIANTE");
  await capturar(est, "estudiante-mapa", 1200);
  // La tarjeta del eje 1 despliega sus sesiones debajo de la rejilla: se lleva a la vista.
  await est.evaluate(() => [...document.querySelectorAll("button[aria-expanded]")].find((b) => /Identidad/i.test(b.textContent))?.click());
  await esperarTexto(est, "Cerrar");
  await est.evaluate(() => {
    const cerrar = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Cerrar");
    cerrar?.parentElement?.scrollIntoView({ block: "start" });
    window.scrollBy(0, -90);
  });
  await capturar(est, "estudiante-mapa-eje", 1200);

  await ir(est, url("cartografia"), 2500);
  await capturar(est, "estudiante-cartografia");
  await ir(est, url("despensa"));
  await capturar(est, "estudiante-despensa");
  await ir(est, url("zona"));
  await capturar(est, "estudiante-anotaciones");

  // El simulador es alto: se captura en una ventana más larga, desde arriba y con el guardado terminado.
  await est.setViewport({ width: 1440, height: 1500, deviceScaleFactor: 2 });
  await ir(est, url("simulador"));
  await est.click(`::-p-xpath(//button[normalize-space()="Validar distribución"])`);
  await esperarTexto(est, "Distribución guardada.");
  await est.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Validar distribución" && !b.disabled), { timeout: 30_000 });
  await est.evaluate(() => window.scrollTo(0, 0));
  await capturar(est, "estudiante-simulador");
  await est.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  await ir(est, url("dilema"));
  await est.click(`::-p-xpath(//label[normalize-space()="${OPCIONES[0]}"])`);
  await est.type("#respuesta-guiada", "Porque organizarse permite exigir derechos sin poner en riesgo la vida de nadie más en la vereda.");
  await est.click(GUARDAR);
  await esperarTexto(est, "Tu elección quedó guardada.");
  await ir(est, url("dilema"));
  await capturar(est, "estudiante-dilema");

  await ir(est, url("testimonios"));
  await capturar(est, "estudiante-cuidado");
  await ir(est, url("jardin"));
  await capturar(est, "estudiante-jardin");
  await ir(est, url("compromiso"));
  await capturar(est, "estudiante-compromiso");

  await ir(est, "/estudiante/diario");
  await est.click('header button[aria-label^="Avisos"]');
  await esperarTexto(est, "Gracias por compartirlo");
  await capturar(est, "estudiante-avisos");
  await ir(est, "/estudiante/diario");
  await capturar(est, "estudiante-diario");

  // --- El docente ---------------------------------------------------------------------
  await ir(doc, "/docente/panel");
  await capturar(doc, "docente-panel", 1000);
  await ir(doc, "/docente/cursos");
  await capturar(doc, "docente-cursos");
  await ir(doc, `/docente/cursos/${curso.id}`);
  await capturar(doc, "docente-curso");
  await ir(doc, "/docente/estudiantes");
  await capturar(doc, "docente-estudiantes");
  await ir(doc, "/docente/revision");
  await capturar(doc, "docente-revision");
  await ir(doc, `/docente/sesiones/${s("zona").id}`);
  await capturar(doc, "docente-anotaciones");
  await ir(doc, `/docente/sesiones/${s("dilema").id}`);
  await capturar(doc, "docente-dilema");
  await ir(doc, "/docente/contenidos");
  await capturar(doc, "docente-contenidos");
  await ir(doc, "/docente/subpoblaciones");
  await capturar(doc, "docente-subpoblaciones");
  await ir(doc, "/docente/foros");
  await capturar(doc, "docente-foros");
  await ir(doc, "/cambiar-contrasena");
  await capturar(doc, "cambiar-contrasena");

  // --- La administración -------------------------------------------------------------
  const reales = await prisma.user.findMany({ where: { rol: "DOCENTE", NOT: { usuario: { startsWith: PREFIJO } } }, select: { nombre: true } });
  const admin = await nueva();
  await entrar(admin, `${PREFIJO}manual.admin`, "ADMIN");
  await ir(admin, "/admin/docentes");
  await ocultarFilas(admin, reales.map((d) => d.nombre), "div.border-b");
  await capturar(admin, "admin-docentes");
  await ir(admin, "/admin/importar");
  await capturar(admin, "admin-importar");
  await ir(admin, "/admin/casos", 1500);
  await ocultarFilas(admin, [PREFIJO_MODULO], "div.rounded-xl");
  await capturar(admin, "admin-casos");
  const activo = await moduloActivo();
  await ir(admin, `/admin/casos/${activo.id}`);
  await capturar(admin, "admin-actividades");
  await ir(admin, "/admin/accesibilidad");
  await capturar(admin, "admin-accesibilidad");

  console.log(`\n${tomadas.length} capturas en manual/capturas`);
});
