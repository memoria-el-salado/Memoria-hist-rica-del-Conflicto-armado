/**
 * Ajustes por la retroalimentación de docentes de ciencias sociales.
 *
 * El mapa dice cómo funciona el viaje y por dónde seguir, y es un camino
 * ilustrado: cada eje es una estación que se toca (o se recorre con las flechas)
 * para ver sus sesiones al lado; en el celular el camino baja en zigzag y la
 * vista baja hasta las sesiones. La sesión va de la información a la
 * reflexión, la actividad y la retroalimentación: la ruta de cuatro pasos, el
 * material antes de la actividad (o dónde encontrarlo), el espacio de la
 * retroalimentación y la siguiente sesión. La marca del menú lleva al inicio.
 *
 * La sesión se prueba sobre un módulo de prueba inactivo, que se borra al
 * terminar; el mapa, sobre el módulo activo, sin tocarlo.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:ruta
 */
import { BASE, capturar, como, comprobar, crearCuenta, crearModuloDePrueba, desborde, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

await ejecutar("Ruta del viaje y de la sesión", async ({ abrir }) => {
  const modulo = await crearModuloDePrueba([
    { pantalla: "zona", titulo: "Lectura con material (prueba)" },
    { pantalla: "meubico", titulo: "Reflexión sin material (prueba)" },
  ]);
  const [s1, s2] = modulo.sesiones;
  await prisma.sesion.update({ where: { id: s1 }, data: { contenido: "Un párrafo de la guía para leer en la sesión de prueba, con suficiente texto." } });
  // El material solo lo ve el estudiante en el módulo activo: el OVA se vincula
  // a una sesión publicada de ese módulo y se borra con la cuenta del docente.
  const publicada = await prisma.sesion.findFirst({
    where: { publicada: true, eje: { caso: { activo: true } } },
    orderBy: [{ eje: { orden: "asc" } }, { orden: "asc" }],
    select: { id: true, ejeId: true },
  });
  if (!publicada) throw new Error("No hay ninguna sesión publicada en el módulo activo.");

  const docente = await crearCuenta("docente", "DOCENTE");
  const est = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id });
  await prisma.recurso.create({
    data: {
      titulo: "OVA de prueba",
      contexto: "Un objeto virtual de aprendizaje sobre la tierra en los Montes de María (prueba).",
      tipo: "SIMULADOR",
      enlace: "https://example.org/ova-de-prueba",
      ejeId: publicada.ejeId,
      sesionId: publicada.id,
      autorId: docente.id,
    },
  });

  const navegador = await abrir();
  const p = await como(navegador, "prueba.est1", "ESTUDIANTE");

  // --- El mapa ------------------------------------------------------------------------
  await p.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  comprobar("el mapa explica cómo funciona el viaje", (await hay(p, "CÓMO FUNCIONA TU VIAJE")) && (await hay(p, "Lee la retroalimentación")));
  comprobar("y dice por dónde seguir", (await hay(p, "CONTINÚA TU VIAJE")) || (await hay(p, "VAS AL DÍA")));
  comprobar("ya no muestra un mapa de casos vacío", !(await hay(p, "Todavía no hay casos de estudio ubicados")));
  comprobar("cada sesión dice cuánto material trae", await hay(p, "Material: "));

  // El mapa ilustrado: los ejes son estaciones de un camino, y cada una es una
  // pestaña que muestra sus sesiones en el panel. Hay dos dibujos (de lado y en
  // zigzag) y solo se ve el que cabe: se cuentan las estaciones visibles.
  const visibles = () =>
    p.$$eval('[role="tablist"][aria-label="Estaciones del viaje"] [role="tab"]', (ts) => ts.filter((t) => t.offsetParent !== null).map((t) => t.id));
  const panelDice = (texto) => p.$eval("#panel-estacion", (el, t) => el.innerText.includes(t), texto);
  const enPantalla = () =>
    p.evaluate(() => {
      const r = document.getElementById("panel-estacion")?.getBoundingClientRect();
      return Boolean(r && r.top < innerHeight && r.bottom > 0);
    });
  const ejeDe = (idEstacion) =>
    prisma.eje.findUnique({ where: { id: idEstacion.replace(/^estacion-(horizontal|vertical)-/, "") }, select: { nombre: true } });

  const ids = await visibles();
  const ejesActivos = await prisma.eje.count({ where: { caso: { activo: true } } });
  comprobar("los ejes son estaciones de un camino, una por eje", ids.length === ejesActivos, `${ids.length} estaciones, ${ejesActivos} ejes`);
  comprobar("el mapa dice cómo interactuar con él", await hay(p, "Toca una estación para ver sus sesiones"));
  comprobar("el explorador del estudiante va en el camino", (await p.$('section[aria-labelledby="titulo-ruta"] .animar-mecer')) !== null);
  if (await hay(p, "CONTINÚA TU VIAJE")) {
    const elegida = await p.$$eval('[role="tab"][aria-selected="true"]', (ts) => ts.some((t) => t.offsetParent !== null));
    comprobar("llega elegida la estación por donde sigue el viaje, con la sesión marcada", elegida && (await hay(p, "Continúa aquí")));
  }

  // En el computador el panel está al lado del mapa: al tocar una estación
  // cambia ahí mismo, sin que haya que buscarlo abajo.
  const ultima = await p.$(`#${ids.at(-1)}`);
  await ultima.click();
  await p.waitForFunction((b) => b.getAttribute("aria-selected") === "true", { timeout: 10_000 }, ultima);
  comprobar("al tocar una estación, el panel muestra sus sesiones", await panelDice((await ejeDe(ids.at(-1))).nombre));
  comprobar("y el panel está a la vista", await enPantalla());
  await capturar(p, "ruta-mapa");

  // Con el teclado, la flecha a la derecha pasa a la estación siguiente y, desde la última, vuelve a la primera.
  await ultima.focus();
  await p.keyboard.press("ArrowRight");
  await p.waitForFunction(
    (id) => document.activeElement?.id === id && document.getElementById(id)?.getAttribute("aria-selected") === "true",
    { timeout: 10_000 },
    ids[0]
  );
  comprobar("las flechas del teclado recorren las estaciones", true);

  // En el celular el camino baja en zigzag y el panel va debajo: al tocar una
  // estación, la vista baja hasta sus sesiones.
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.reload({ waitUntil: "networkidle0" });
  const enCelular = await visibles();
  comprobar("en el celular el camino baja en zigzag", enCelular.every((id) => id.startsWith("estacion-vertical-")) && enCelular.length === ejesActivos);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.tap(`#${enCelular.at(-1)}`);
  await p.waitForFunction(
    () => {
      const r = document.getElementById("panel-estacion")?.getBoundingClientRect();
      return Boolean(r && r.top > -10 && r.top < innerHeight * 0.5);
    },
    { timeout: 10_000 }
  );
  comprobar("al tocar una estación en el celular, la vista baja hasta sus sesiones", true);
  comprobar("y nada se desborda a lo ancho", (await desborde(p)) <= 0);
  await capturar(p, "ruta-mapa-celular");
  await p.setViewport({ width: 1280, height: 900 });
  await p.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });

  await p.click('a[aria-label="Ruta Pedagógica: ir al inicio"]');
  await p.waitForFunction(() => location.pathname === "/estudiante/mapa", { timeout: 20_000 });
  comprobar("«Ruta Pedagógica» lleva al inicio", true);

  // --- La sesión ----------------------------------------------------------------------
  await p.goto(`${BASE}/estudiante/sesion/${s1}`, { waitUntil: "networkidle0" });
  const pasos = await p.$$eval('nav[aria-label="Ruta de la sesión"] li', (ls) => ls.map((l) => l.innerText.replace(/\s+/g, " ")));
  comprobar(
    "la sesión muestra la ruta de cuatro pasos",
    pasos.length === 4 && pasos[0].includes("Explora") && pasos[3].includes("Retroalimentación"),
    pasos.join(" | ")
  );
  comprobar("sin material, el primer paso remite al texto de la guía", pasos[0].includes("El texto de la guía del CNMH"));
  const orden = await p.evaluate(() => {
    const material = document.getElementById("material-sesion");
    const actividad = document.getElementById("actividad");
    return Boolean(material && actividad && material.compareDocumentPosition(actividad) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  comprobar("el texto para explorar va antes de la actividad", orden);
  comprobar("la retroalimentación tiene su espacio aunque aún no haya", await hay(p, "RETROALIMENTACIÓN DE TU DOCENTE"));
  const siguiente = await p.$eval('nav[aria-label="Siguiente paso del viaje"]', (n) => n.querySelector(`a[href*="/estudiante/sesion/"]`)?.getAttribute("href") ?? "");
  comprobar("al final lleva a la siguiente sesión", siguiente.endsWith(s2));
  await capturar(p, "ruta-sesion");

  await prisma.comentario.create({ data: { docenteId: docente.id, estudianteId: est.id, sesionId: s1, texto: "Buena lectura (prueba)." } });
  await p.reload({ waitUntil: "networkidle0" });
  await esperarTexto(p, "COMENTARIOS DE TU DOCENTE");
  const cuarto = await p.$eval('nav[aria-label="Ruta de la sesión"] li:last-child', (l) => l.innerText);
  comprobar("con un comentario del docente, el cuarto paso lo cuenta", cuarto.includes("1 comentario de tu docente"));

  // Con material: el OVA del docente, antes de la actividad.
  await p.goto(`${BASE}/estudiante/sesion/${publicada.id}`, { waitUntil: "networkidle0" });
  const explora = await p.$eval('nav[aria-label="Ruta de la sesión"] li', (l) => l.innerText);
  comprobar("con material, el primer paso lo cuenta", /\d+ recursos? para leer, ver o escuchar/.test(explora), explora.replace(/\s+/g, " "));
  comprobar(
    "el OVA se vincula como recurso interactivo",
    (await hay(p, "RECURSO INTERACTIVO")) && (await p.$('a[href="https://example.org/ova-de-prueba"]')) !== null
  );
  const materialAntes = await p.evaluate(() => {
    const material = document.getElementById("material-sesion");
    const actividad = document.getElementById("actividad");
    return Boolean(material && actividad && material.compareDocumentPosition(actividad) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  comprobar("y el material va antes de la actividad", materialAntes);
  await capturar(p, "ruta-sesion-material");

  await p.goto(`${BASE}/estudiante/sesion/${s2}`, { waitUntil: "networkidle0" });
  comprobar("sin material ni texto, la sesión dice dónde estará la información", (await hay(p, "PARA EXPLORAR")) && (await hay(p, "lo presentará en clase")));
  comprobar("y en la última sesión no ofrece una siguiente", await hay(p, "Es la última sesión publicada del módulo."));

  await p.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await p.reload({ waitUntil: "networkidle0" });
  comprobar("la sesión no se desborda en el móvil", (await desborde(p)) <= 0);
  await p.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  comprobar("ni el mapa", (await desborde(p)) <= 0);
});
