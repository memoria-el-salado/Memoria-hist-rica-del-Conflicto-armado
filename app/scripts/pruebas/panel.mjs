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
import { BASE, capturar, como, comprobar, crearCuenta, ejecutar, prisma } from "./entorno.mjs";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);
const desborde = (pagina) => pagina.evaluate(() => document.documentElement.scrollWidth - innerWidth);

await ejecutar("3.5 · Panel del docente", async ({ abrir }) => {
  const sesion = await prisma.sesion.findFirst({ where: { publicada: true, eje: { caso: { activo: true } } }, orderBy: [{ eje: { orden: "asc" } }, { orden: "asc" }] });
  if (!sesion) throw new Error("Hace falta una sesión publicada en el módulo activo.");

  const docente = await crearCuenta("docente", "DOCENTE");
  const e1 = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id });
  const e2 = await crearCuenta("est2", "ESTUDIANTE", { creadoPorId: docente.id });
  // Uno de los dos hizo la sesión publicada; el otro entregó una respuesta sin comentar.
  await prisma.marcaCartografia.create({ data: { autorId: e1.id, sesionId: sesion.id, lugar: "Prueba panel", relato: "Relato de prueba.", lat: 9.7, lon: -75.1 } });
  await prisma.respuestaActividad.create({ data: { userId: e2.id, sesionId: sesion.id, texto: "Respuesta de prueba para el panel." } });

  const navegador = await abrir();
  const doc = await como(navegador, "prueba.docente", "DOCENTE");
  await doc.goto(`${BASE}/docente/panel`, { waitUntil: "networkidle0" });

  comprobar("el panel muestra el ciclo del año en curso", await hay(doc, `Ciclo ${new Date().getFullYear()}`));
  const competencias = await doc.$eval('section[aria-labelledby="titulo-competencias-grupo"]', (s) => s.innerText);
  comprobar("muestra las competencias del grupo", competencias.includes("Empatía") && competencias.includes("Asertividad"));
  comprobar("promediando a sus estudiantes (uno de dos hizo la sesión)", /Empatía\s*50%/.test(competencias), competencias.split("\n").slice(1, 3).join(" "));
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
  await capturar(est, "mapa-movil");
});
