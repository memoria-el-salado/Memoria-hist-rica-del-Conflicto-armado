/**
 * 3.5 · El panel del docente del mockup.
 *
 * El panel reúne en una pantalla el progreso por eje, las competencias del
 * grupo, lo que espera revisión, los pedidos de acompañamiento y las alertas.
 * En el móvil, con más de cinco secciones, la barra inferior muestra cuatro y
 * un botón «Más», y ninguna pantalla se desborda a lo ancho.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:panel
 */
import { BASE, capturar, como, comprobar, crearCuenta, desborde, ejecutar, prisma } from "./entorno.mjs";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

await ejecutar("3.5 · Panel del docente", async ({ abrir }) => {
  const sesion = await prisma.sesion.findFirst({ where: { publicada: true, eje: { caso: { activo: true } } }, orderBy: [{ eje: { orden: "asc" } }, { orden: "asc" }] });
  if (!sesion) throw new Error("Hace falta una sesión publicada en el módulo activo.");

  // Un nombre largo, para comprobar que la cabecera lo recorta sin desbordarse.
  const NOMBRE_DOCENTE = "Prueba Docente Con Un Nombre Bastante Largo Para La Cabecera";
  const docente = await crearCuenta("docente", "DOCENTE", { nombre: NOMBRE_DOCENTE });
  const e1 = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id, nombre: "Prueba Estudiante Uno" });
  const e2 = await crearCuenta("est2", "ESTUDIANTE", { creadoPorId: docente.id });
  // Uno de los dos hizo la sesión publicada; el otro entregó una respuesta sin comentar.
  await prisma.marcaCartografia.create({ data: { autorId: e1.id, sesionId: sesion.id, lugar: "Prueba panel", relato: "Relato de prueba.", lat: 9.7, lon: -75.1 } });
  await prisma.respuestaActividad.create({ data: { userId: e2.id, sesionId: sesion.id, texto: "Respuesta de prueba para el panel." } });

  const navegador = await abrir();
  const doc = await como(navegador, "prueba.docente", "DOCENTE");
  await doc.goto(`${BASE}/docente/panel`, { waitUntil: "networkidle0" });

  comprobar("el panel muestra el ciclo del año en curso", await hay(doc, `Ciclo ${new Date().getFullYear()}`));
  // La cabecera dice quién entró: su nombre y, debajo, su rol.
  const cabecera = await doc.$eval("header", (h) => h.innerText);
  comprobar("la cabecera muestra el nombre de quien entró, con su rol", cabecera.includes(NOMBRE_DOCENTE) && cabecera.includes("Docente"));
  const nombreRecortado = await doc.$eval(`header [title="${NOMBRE_DOCENTE}"]`, (e) => e.scrollWidth > e.clientWidth && e.getBoundingClientRect().width <= 181);
  comprobar("un nombre largo se recorta con puntos suspensivos", nombreRecortado);
  const competencias = await doc.$eval('section[aria-labelledby="titulo-competencias-grupo"]', (s) => s.innerText);
  comprobar("muestra las competencias del grupo", competencias.includes("Empatía") && competencias.includes("Asertividad"));
  // Uno de dos hizo la sesión: el promedio del grupo queda entre 0 y 100 (el valor exacto
  // depende de cuántas sesiones haya publicado el docente real).
  const empatia = Number(competencias.match(/Empatía\s*(\d+)%/)?.[1] ?? -1);
  comprobar("promediando a sus estudiantes (uno de dos hizo la sesión)", empatia > 0 && empatia < 100, competencias.split("\n").slice(1, 3).join(" "));
  comprobar("dice cuántos trabajos esperan comentario", await hay(doc, "1 trabajo espera tu comentario"));
  comprobar("junto a los pedidos de acompañamiento y las alertas", (await hay(doc, "PEDIDOS DE ACOMPAÑAMIENTO")) && (await hay(doc, "ALERTAS DE CUIDADO")));
  await capturar(doc, "panel-docente");

  await doc.click("::-p-text(trabajo espera tu comentario)");
  await doc.waitForFunction(() => location.pathname === "/docente/revision", { timeout: 20_000 });
  comprobar("lleva a la revisión, a lo pendiente", await hay(doc, "Respuesta de prueba para el panel."));

  // --- En el móvil ---------------------------------------------------------------
  await doc.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await doc.goto(`${BASE}/docente/panel`, { waitUntil: "networkidle0" });
  const botones = await doc.$$eval("nav ul > li", (lis) => lis.filter((li) => li.offsetParent !== null).length);
  comprobar("la barra inferior muestra cuatro secciones y «Más»", botones === 5, `${botones} visibles`);
  comprobar("el panel no se desborda a lo ancho", (await desborde(doc)) <= 0, `${await desborde(doc)} px`);
  await capturar(doc, "panel-movil");

  await doc.click('[aria-label="Más secciones"]');
  await doc.waitForSelector("::-p-xpath(//nav//ul//ul//a[normalize-space()='Mis Estudiantes'])", { visible: true });
  await doc.click("::-p-xpath(//nav//ul//ul//a[normalize-space()='Mis Estudiantes'])");
  await doc.waitForFunction(() => location.pathname === "/docente/estudiantes", { timeout: 20_000 });
  comprobar("«Más» lleva a las secciones que no caben", true);

  for (const ruta of ["/docente/revision", "/docente/cursos", "/docente/subpoblaciones"]) {
    await doc.goto(`${BASE}${ruta}`, { waitUntil: "networkidle0" });
    comprobar(`${ruta} no se desborda en el móvil`, (await desborde(doc)) <= 0, `${await desborde(doc)} px`);
  }

  const est = await como(navegador, "prueba.est1", "ESTUDIANTE");
  await est.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  for (const ruta of ["/estudiante/mapa", `/estudiante/sesion/${sesion.id}`, "/estudiante/diario"]) {
    await est.goto(`${BASE}${ruta}`, { waitUntil: "networkidle0" });
    comprobar(`${ruta.replace(sesion.id, "[id]")} no se desborda en el móvil`, (await desborde(est)) <= 0, `${await desborde(est)} px`);
  }
  comprobar("el estudiante, con tres secciones, no necesita «Más»", !(await est.$('[aria-label="Más secciones"]')));
  const cabeceraEst = await est.$eval("header", (h) => h.innerText);
  comprobar("en el móvil la cabecera del estudiante muestra su nombre y su rol", cabeceraEst.includes("Prueba Estudiante Uno") && cabeceraEst.includes("Estudiante"));
  await capturar(est, "cabecera-nombre-movil");
  // El celular más angosto en uso (320 px): la cabecera con el nombre pasa a otra línea, no se sale.
  await est.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
  await est.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  comprobar("en un celular de 320 px la cabecera con el nombre no se desborda", (await desborde(est)) <= 0, `${await desborde(est)} px`);
  await capturar(est, "mapa-movil");
});
