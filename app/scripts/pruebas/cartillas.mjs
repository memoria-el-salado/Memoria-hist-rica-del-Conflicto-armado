/**
 * Las cartillas de El Salado en cada sesión.
 *
 * La tutora pidió que en cada tarea estén a la mano los documentos recortados de
 * El Salado. La sesión los ofrece abiertos en su apartado: el estudiante, solo
 * la cartilla del estudiante; el docente, también la guía para maestros. Si la
 * cartilla recortada no desarrolla la sesión, se abre en el mapa del viaje y se
 * dice. El administrador vincula las cartillas al módulo.
 *
 * Usa las dos cartillas reales, vinculadas a un módulo de prueba inactivo que
 * se borra al terminar (y con él, los vínculos).
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:cartillas
 */
import { BASE, capturar, como, comprobar, crearCuenta, crearModuloDePrueba, ejecutar, esperarTexto, prisma, visitar } from "./entorno.mjs";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);
const enlaces = (pagina) =>
  pagina.$$eval('#cartillas a[href^="/api/documentos/"]', (as) => as.map((a) => a.getAttribute("href")));

await ejecutar("Cartillas de El Salado en cada sesión", async ({ abrir }) => {
  const ubicados = (await prisma.documentoFuente.findMany({ orderBy: { subidoEn: "asc" } })).filter((d) => d.ubicaciones?.codigos);
  const estudiante = ubicados.find((d) => !d.soloDocentes);
  const maestros = ubicados.find((d) => d.soloDocentes);
  if (!estudiante || !maestros) throw new Error("Hacen falta una cartilla del estudiante y una guía para maestros ya ubicadas.");
  const paginaDe = (doc, codigo) => doc.ubicaciones.codigos[codigo] ?? doc.ubicaciones.indice;
  // Una sesión que la cartilla desarrolla y otra que solo nombra en el índice.
  const desarrollada = Object.keys(estudiante.ubicaciones.codigos).find((c) => c.split(".").length === 2 && maestros.ubicaciones.codigos[c]);
  if (!desarrollada) throw new Error("Las cartillas no comparten ninguna sesión ubicada.");

  const modulo = await crearModuloDePrueba([
    { pantalla: "zona", titulo: "Sesión que la cartilla desarrolla (prueba)" },
    { pantalla: "meubico", titulo: "Sesión que la cartilla no desarrolla (prueba)" },
  ]);
  const [s1, s2] = modulo.sesiones;
  await prisma.sesion.update({ where: { id: s1 }, data: { codigo: desarrollada } });
  await prisma.sesion.update({ where: { id: s2 }, data: { codigo: "99.9" } });

  const docente = await crearCuenta("docente", "DOCENTE");
  await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id });
  await crearCuenta("admin", "ADMIN");

  const navegador = await abrir();

  // --- El administrador vincula las cartillas al módulo ---------------------------------
  const a = await como(navegador, "prueba.admin", "ADMIN");
  await visitar(a, `${BASE}/admin/casos/${modulo.casoId}`);
  comprobar("el módulo dice qué cartillas acompañan sus sesiones", await hay(a, "Cartillas en las sesiones"));
  comprobar("sin cartillas, lo dice", await hay(a, "Este módulo todavía no tiene cartillas."));
  for (const doc of [estudiante, maestros]) {
    await a.select('section[aria-labelledby="titulo-cartillas-modulo"] select', doc.id);
    await a.click('section[aria-labelledby="titulo-cartillas-modulo"] button[type="submit"]');
    await a.waitForFunction(
      (titulo) => [...document.querySelectorAll('section[aria-labelledby="titulo-cartillas-modulo"] li')].some((li) => li.innerText.includes(titulo) && li.innerText.includes("vinculada")),
      { timeout: 20_000 },
      doc.titulo
    );
  }
  const vinculos = await prisma.documentoVinculado.count({ where: { casoId: modulo.casoId } });
  comprobar("el administrador vincula la cartilla y la guía para maestros", vinculos === 2, `${vinculos} vínculos`);
  await capturar(a, "cartillas-admin");

  // --- El estudiante --------------------------------------------------------------------
  const p = await como(navegador, "prueba.est1", "ESTUDIANTE");
  await visitar(p, `${BASE}/estudiante/sesion/${s1}`);
  await esperarTexto(p, "LAS CARTILLAS DE EL SALADO");
  const delEstudiante = await enlaces(p);
  comprobar(
    "el estudiante tiene su cartilla abierta en el apartado de la sesión",
    delEstudiante.length === 1 && delEstudiante[0] === `/api/documentos/${estudiante.id}#page=${paginaDe(estudiante, desarrollada)}`,
    delEstudiante.join(", ")
  );
  comprobar("y no la guía para maestros", !delEstudiante.some((h) => h.includes(maestros.id)));
  comprobar("la sesión dice en qué página empieza el apartado", await hay(p, `empieza en la página ${paginaDe(estudiante, desarrollada)}`));
  const explora = await p.$eval('nav[aria-label="Ruta de la sesión"] li', (l) => l.innerText);
  comprobar("el primer paso de la ruta cuenta la cartilla", explora.includes("cartilla"), explora.replace(/\s+/g, " "));
  const antes = await p.evaluate(() => {
    const c = document.getElementById("cartillas");
    const act = document.getElementById("actividad");
    return Boolean(c && act && c.compareDocumentPosition(act) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  comprobar("la cartilla va antes de la actividad", antes);

  await p.click('#cartillas button[aria-expanded="false"]');
  await p.waitForSelector("#cartillas iframe", { timeout: 10_000 });
  const visor = await p.$eval("#cartillas iframe", (f) => ({ src: f.getAttribute("src"), titulo: f.getAttribute("title") }));
  comprobar("«Leer aquí» abre la cartilla dentro de la sesión, en su página", visor.src === delEstudiante[0] && Boolean(visor.titulo), visor.src);
  await capturar(p, "cartillas-estudiante");

  const prohibida = await p.evaluate(async (id) => (await fetch(`/api/documentos/${id}`)).status, maestros.id);
  comprobar("el estudiante no puede abrir la guía para maestros", prohibida === 403, String(prohibida));
  const propia = await p.evaluate(async (id) => (await fetch(`/api/documentos/${id}`, { method: "GET" })).headers.get("content-type"), estudiante.id);
  comprobar("y sí su cartilla", propia === "application/pdf");

  await visitar(p, `${BASE}/estudiante/sesion/${s2}`);
  comprobar("si la cartilla no desarrolla la sesión, lo dice", await hay(p, "no desarrolla la sesión 99.9"));
  comprobar(
    "y la abre en el mapa del viaje",
    (await enlaces(p))[0] === `/api/documentos/${estudiante.id}#page=${estudiante.ubicaciones.indice}`
  );

  await p.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await visitar(p, `${BASE}/estudiante/sesion/${s1}`);
  comprobar("en el móvil la sesión no se desborda", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  const leerVisible = await p.$eval("#cartillas button", (b) => getComputedStyle(b).display !== "none");
  comprobar("y la cartilla se abre en otra pestaña en vez de dentro de la página", !leerVisible && (await enlaces(p)).length === 1);

  // --- El docente -----------------------------------------------------------------------
  const d = await como(navegador, "prueba.docente", "DOCENTE");
  await visitar(d, `${BASE}/docente/sesiones/${s1}`);
  await esperarTexto(d, "LAS CARTILLAS DE EL SALADO");
  const delDocente = await enlaces(d);
  comprobar(
    "el docente ve las dos, cada una en su página, primero la del estudiante",
    delDocente.length === 2 &&
      delDocente[0] === `/api/documentos/${estudiante.id}#page=${paginaDe(estudiante, desarrollada)}` &&
      delDocente[1] === `/api/documentos/${maestros.id}#page=${paginaDe(maestros, desarrollada)}`,
    delDocente.join(", ")
  );
  comprobar("la guía dice que solo la ve el docente", await hay(d, "Solo la ve el docente"));
  await capturar(d, "cartillas-docente");
});
