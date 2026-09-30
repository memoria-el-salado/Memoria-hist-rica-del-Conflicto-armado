/**
 * 4.3 · Anotaciones en hilo.
 *
 * Una estudiante cita un párrafo y anota; una compañera de su curso le marca
 * «me sirve» y le responde. El docente ve la conversación de sus estudiantes,
 * la filtra por curso, destaca la anotación y responde; la estudiante la
 * encuentra en «Destacados». Un estudiante sin ese curso no ve nada de ese
 * hilo, ni siquiera la respuesta del docente.
 *
 * Se hace sobre un módulo de prueba inactivo, que se borra al terminar.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:anotaciones
 */
import { BASE, capturar, como, comprobar, crearCuenta, crearModuloDePrueba, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const PARRAFO_1 = "Durante años la comunidad sostuvo la memoria con sus cantos, sus fiestas y su trabajo en el campo (texto de prueba).";
const PARRAFO_2 = "El retorno fue posible porque las familias se organizaron y exigieron garantías para volver a su tierra (texto de prueba).";
const ANOTACION = "Me llama la atención que la memoria se sostenga con la fiesta y no solo con el dolor.";
const RESPUESTA = "A mí también: en mi barrio pasa algo parecido con los tambores.";
const DEL_DOCENTE = "Buena lectura. Piensen qué fiestas de su municipio cumplen ese papel.";
const OTRA = "El retorno se organizó entre muchas familias, no fue algo individual.";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);
const hilo = (autor) => `article[aria-label="Anotación de ${autor}"]`;

/** Espera a que el hilo refleje una acción (el botón se desactiva mientras se refresca). */
async function esperarEn(pagina, selector, condicion, ...args) {
  await pagina.waitForFunction(condicion, { timeout: 30_000 }, selector, ...args);
}

async function anotar(pagina, texto) {
  await pagina.type("#texto-anotacion", texto);
  await pagina.click("::-p-text(PUBLICAR ANOTACIÓN)");
  await esperarTexto(pagina, texto);
  await pagina.waitForFunction(() => document.querySelector("#texto-anotacion").value === "", { timeout: 30_000 });
}

async function responder(pagina, autor, texto) {
  await pagina.click(`${hilo(autor)} button[aria-expanded]`);
  await pagina.waitForSelector(`${hilo(autor)} textarea`);
  await pagina.type(`${hilo(autor)} textarea`, texto);
  await pagina.click(`::-p-xpath(//article[@aria-label="Anotación de ${autor}"]//button[@type="submit"])`);
  await esperarEn(pagina, hilo(autor), (s, t) => [...document.querySelectorAll(`${s} li`)].some((li) => li.innerText.includes(t)), texto);
}

let modulo;

await ejecutar("4.3 · Anotaciones en hilo", async ({ abrir }) => {
  modulo = await crearModuloDePrueba({ pantalla: "zona", titulo: "Lectura de prueba" });
  await prisma.sesion.update({ where: { id: modulo.sesionId }, data: { contenido: `${PARRAFO_1}\n\n${PARRAFO_2}` } });

  const docente = await crearCuenta("docente", "DOCENTE", { nombre: "Prueba Docente" });
  const curso = await prisma.curso.create({ data: { nombre: "Prueba 8B", anio: 2026, docenteId: docente.id } });
  const e1 = await crearCuenta("est1", "ESTUDIANTE", { nombre: "Prueba Ana", creadoPorId: docente.id, cursoId: curso.id });
  const e2 = await crearCuenta("est2", "ESTUDIANTE", { nombre: "Prueba Beto", creadoPorId: docente.id, cursoId: curso.id });
  await crearCuenta("est3", "ESTUDIANTE", { nombre: "Prueba Caro", creadoPorId: docente.id });

  const navegador = await abrir();
  const url = `${BASE}/estudiante/sesion/${modulo.sesionId}`;

  // --- La primera anotación, con cita ------------------------------------------
  const est1 = await como(navegador, "prueba.est1", "ESTUDIANTE");
  await est1.goto(url, { waitUntil: "networkidle0" });
  comprobar("la sesión vacía invita a anotar", await hay(est1, "La tuya sería la primera."));

  await est1.click(`::-p-text(${PARRAFO_1.slice(0, 40)})`);
  await est1.waitForSelector('[aria-label="Quitar la cita"]');
  await anotar(est1, ANOTACION);
  comprobar("publica la anotación con el párrafo citado", await est1.$eval(hilo("Prueba Ana"), (a, p) => a.querySelector("blockquote")?.textContent === p, PARRAFO_1));
  comprobar("y la cita se suelta al publicar", !(await est1.$('[aria-label="Quitar la cita"]')));
  comprobar("no puede marcar «me sirve» en la suya", await est1.$eval(`${hilo("Prueba Ana")} button[aria-pressed]`, (b) => b.disabled));
  comprobar("el estudiante no destaca", !(await hay(est1, "Destacar")));

  // --- La compañera: me sirve y respuesta ---------------------------------------
  const est2 = await como(navegador, "prueba.est2", "ESTUDIANTE");
  await est2.goto(url, { waitUntil: "networkidle0" });
  comprobar("la compañera de curso la ve", await hay(est2, ANOTACION));

  const meSirve = `${hilo("Prueba Ana")} button[aria-pressed]`;
  await est2.click(meSirve);
  await esperarEn(est2, meSirve, (s) => document.querySelector(s).getAttribute("aria-pressed") === "true" && document.querySelector(s).textContent.trim() === "1");
  comprobar("marca «me sirve» y suma uno", (await prisma.meSirve.count({ where: { userId: e2.id } })) === 1);

  await est2.click(meSirve);
  await esperarEn(est2, meSirve, (s) => document.querySelector(s).getAttribute("aria-pressed") === "false");
  comprobar("y lo puede quitar", (await prisma.meSirve.count({ where: { userId: e2.id } })) === 0);
  await esperarEn(est2, meSirve, (s) => !document.querySelector(s).disabled);
  await est2.click(meSirve);
  await esperarEn(est2, meSirve, (s) => document.querySelector(s).getAttribute("aria-pressed") === "true");

  await responder(est2, "Prueba Ana", RESPUESTA);
  const respuesta = await prisma.anotacion.findFirst({ where: { autorId: e2.id } });
  const original = await prisma.anotacion.findFirst({ where: { autorId: e1.id } });
  comprobar("responde dentro del hilo, sin cita", respuesta?.respuestaAId === original?.id && respuesta?.cita === null);

  // --- Otro estudiante, sin ese curso ---------------------------------------------
  const est3 = await como(navegador, "prueba.est3", "ESTUDIANTE");
  await est3.goto(url, { waitUntil: "networkidle0" });
  comprobar("uno sin ese curso no ve el hilo", !(await hay(est3, ANOTACION)) && !(await hay(est3, RESPUESTA)));
  await anotar(est3, OTRA);

  // --- El docente ---------------------------------------------------------------------
  const doc = await como(navegador, "prueba.docente", "DOCENTE");
  const urlDocente = `${BASE}/docente/sesiones/${modulo.sesionId}`;
  await doc.goto(urlDocente, { waitUntil: "networkidle0" });
  comprobar("el docente ve la conversación de sus estudiantes", (await hay(doc, ANOTACION)) && (await hay(doc, RESPUESTA)) && (await hay(doc, OTRA)));

  await doc.select("#filtro-curso", curso.id);
  await doc.waitForFunction(() => location.search.includes("curso="), { timeout: 20_000 });
  await doc.waitForFunction((t) => !document.body.innerText.includes(t), { timeout: 30_000 }, OTRA);
  comprobar("filtrado por curso, solo ve el de ese curso", await hay(doc, ANOTACION));

  const destacar = `::-p-xpath(//article[@aria-label="Anotación de Prueba Ana"]//button[normalize-space()="Destacar"])`;
  await doc.click(destacar);
  await esperarTexto(doc, "Quitar destacado");
  comprobar("destaca la anotación", (await prisma.anotacion.findUnique({ where: { id: original.id } }))?.destacada === true);
  await responder(doc, "Prueba Ana", DEL_DOCENTE);
  await capturar(doc, "anotaciones-docente");

  // --- La autora encuentra el destacado y la respuesta del docente ----------------
  await est1.reload({ waitUntil: "networkidle0" });
  comprobar("ve las respuestas del hilo, la del docente marcada", await est1.$eval(hilo("Prueba Ana"), (a, t) => a.innerText.includes(t) && a.innerText.includes("DOCENTE"), DEL_DOCENTE));
  comprobar("y el «me sirve» de su compañera", (await est1.$eval(meSirve, (b) => b.textContent.trim())) === "1");
  await est1.click('::-p-xpath(//div[@aria-label="Orden"]/button[normalize-space()="DESTACADOS"])');
  await esperarTexto(est1, "DESTACADA POR EL DOCENTE");
  comprobar("en «Destacados» está la suya", (await est1.$$('article[aria-label^="Anotación de"]')).length === 1);
  await capturar(est1, "anotaciones-destacados");

  await est3.reload({ waitUntil: "networkidle0" });
  comprobar("la respuesta del docente en ese hilo tampoco le llega a otro curso", !(await hay(est3, DEL_DOCENTE)));
  await est3.click('::-p-xpath(//div[@aria-label="Orden"]/button[normalize-space()="DESTACADOS"])');
  await esperarTexto(est3, "El docente todavía no ha destacado ninguna anotación.");
  comprobar("ni el destacado", true);

  await est1.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await est1.reload({ waitUntil: "networkidle0" });
  comprobar("la conversación no se desborda en el móvil", (await est1.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
});
