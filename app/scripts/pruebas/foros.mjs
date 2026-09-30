/**
 * 1.1 · Foros en los que se puede debatir (CU08).
 *
 * Un docente abre un debate; tres estudiantes suyos reciben rol equilibrado,
 * argumentan con fuente y se responden; el docente destaca, reparte roles,
 * interviene, retira un mensaje y cierra. Y un docente de otro curso, con su
 * estudiante, no puede ver nada de eso.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:foros
 */
import { BASE, capturar, como, comprobar, crearCuenta, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const PREGUNTA = "¿La Ley 135 de 1961 resolvió el problema de la tierra en los Montes de María? (prueba)";
const ARGUMENTO_A =
  "La Ley 135 creó el INCORA para repartir las tierras incultas entre quienes las trabajaban sin poseerlas.";
const RESPUESTA_B = "Pero en El Salado el reparto llegó tarde y la concentración siguió.";

async function estado(pagina, url) {
  const res = await pagina.goto(`${BASE}${url}`, { waitUntil: "networkidle0" });
  return res.status();
}

/**
 * Vacía un campo como lo haría una persona: seleccionar y borrar. Asignar
 * `value` directamente no lo ve React, y el campo conservaría su estado.
 */
async function vaciar(pagina, selector) {
  await pagina.$eval(selector, (el) => el.select());
  await pagina.keyboard.press("Backspace");
}

async function publicar(pagina, texto, fuente) {
  await vaciar(pagina, "#argumento");
  await pagina.type("#argumento", texto);
  if (fuente !== undefined) {
    await vaciar(pagina, "#fuente");
    if (fuente) await pagina.type("#fuente", fuente);
  }
  await pagina.click("::-p-xpath(//form[.//textarea[@id='argumento']]//button[@type='submit'])");
}

/** Espera un aviso distinto del anterior: el viejo sigue en pantalla hasta que llega el nuevo. */
async function avisoDe(pagina, anterior = "") {
  await pagina.waitForFunction(
    (previo) => {
      const t = document.querySelector('[role="alert"]')?.textContent.trim();
      return t && t !== previo;
    },
    { timeout: 20_000 },
    anterior
  );
  return pagina.$eval('[role="alert"]', (e) => e.textContent.trim());
}

await ejecutar("1.1 · Foros en los que se puede debatir", async ({ abrir }) => {
  const docente = await crearCuenta("docente", "DOCENTE");
  const [e1, e2] = await Promise.all(
    ["est1", "est2", "est3"].map((s) => crearCuenta(s, "ESTUDIANTE", { creadoPorId: docente.id, nombre: `Prueba ${s}` }))
  );
  const otroDocente = await crearCuenta("otro.docente", "DOCENTE");
  await crearCuenta("otro.est", "ESTUDIANTE", { creadoPorId: otroDocente.id });

  const navegador = await abrir();

  // --- El docente abre el debate ------------------------------------------
  const doc = await como(navegador, "prueba.docente", "DOCENTE");
  await doc.goto(`${BASE}/docente/foros`, { waitUntil: "networkidle0" });
  await doc.type("#pregunta", PREGUNTA);
  await doc.type("#fuentes", "Ley 135 de 1961 · Guía del CNMH, sesión 1.3");
  await doc.click("::-p-text(Abrir foro)");
  await esperarTexto(doc, PREGUNTA);
  const foro = await prisma.foro.findFirst({ where: { autorId: docente.id } });
  comprobar("el docente abre el debate", Boolean(foro), foro?.fuentes);

  // --- Primer estudiante: rol, validaciones y argumento --------------------
  const est1 = await como(navegador, "prueba.est1", "ESTUDIANTE");
  await est1.goto(`${BASE}/estudiante/foros`, { waitUntil: "networkidle0" });
  comprobar(
    "el estudiante ve el debate de su docente en el menú Debates",
    await est1.evaluate((p) => document.body.innerText.includes(p), PREGUNTA)
  );
  await estado(est1, `/estudiante/foros/${foro.id}`);
  const rol1 = await prisma.participanteForo.findUnique({ where: { foroId_userId: { foroId: foro.id, userId: e1.id } } });
  comprobar("al entrar recibe un rol", rol1?.postura === "A", `rol ${rol1?.postura}`);
  comprobar(
    "la pantalla le dice cuál es su rol",
    await est1.evaluate(() => document.body.innerText.includes("Tu rol en este debate"))
  );

  await publicar(est1, "Estoy de acuerdo.", "Ley 135");
  const aviso1 = await avisoDe(est1);
  comprobar("rechaza un argumento sin desarrollar", aviso1.startsWith("Desarrolla tu argumento"));
  await publicar(est1, ARGUMENTO_A, "");
  comprobar("rechaza un argumento sin fuente", (await avisoDe(est1, aviso1)) === "Indica la fuente en la que se apoya tu argumento.");
  await publicar(est1, ARGUMENTO_A, "Ley 135 de 1961, artículo 1");
  await esperarTexto(est1, ARGUMENTO_A);
  const argumento = await prisma.mensajeForo.findFirst({ where: { foroId: foro.id, autorId: e1.id } });
  comprobar("publica el argumento con su bando y su fuente", argumento?.postura === "A" && argumento?.fuente?.includes("Ley 135"));

  // --- Segundo estudiante: bando equilibrado y respuesta -------------------
  const est2 = await como(navegador, "prueba.est2", "ESTUDIANTE");
  await estado(est2, `/estudiante/foros/${foro.id}`);
  const rol2 = await prisma.participanteForo.findUnique({ where: { foroId_userId: { foroId: foro.id, userId: e2.id } } });
  comprobar("el segundo estudiante va al otro bando", rol2?.postura === "B");
  await est2.click("::-p-text(Responder)");
  await est2.type(`#respuesta-${argumento.id}`, RESPUESTA_B);
  await est2.click(`::-p-xpath(//textarea[@id="respuesta-${argumento.id}"]/ancestor::form//button[@type="submit"])`);
  await esperarTexto(est2, RESPUESTA_B);
  const respuesta = await prisma.mensajeForo.findFirst({ where: { foroId: foro.id, autorId: e2.id } });
  comprobar("responde en el hilo, breve y sin fuente", respuesta?.respuestaAId === argumento.id && !respuesta.fuente);

  // --- El docente media ----------------------------------------------------
  await estado(doc, `/docente/foros/${foro.id}`);
  comprobar(
    "el docente ve argumento y respuesta en el mismo hilo",
    await doc.evaluate((a, r) => document.body.innerText.includes(a) && document.body.innerText.includes(r), ARGUMENTO_A, RESPUESTA_B)
  );

  await doc.click("::-p-text(Destacar)");
  await esperarTexto(doc, "DESTACADO POR EL DOCENTE");
  await estado(est1, `/estudiante/foros/${foro.id}`);
  await capturar(est1, "foro-estudiante");
  comprobar(
    "el estudiante ve su argumento destacado",
    await est1.evaluate(() => document.body.innerText.includes("DESTACADO POR EL DOCENTE"))
  );

  await doc.click("::-p-text(Dar rol al estudiante que falta)");
  await doc.waitForFunction(() => document.body.innerText.includes("1 estudiante recibió rol."), { timeout: 20_000 });
  // La pantalla, no solo la base, tiene que reflejar el reparto.
  const idEst3 = (await prisma.user.findFirst({ where: { usuario: "prueba.est3" } })).id;
  await doc.waitForFunction((id) => document.querySelector(`#rol-${id}`)?.value, { timeout: 20_000 }, idEst3);
  comprobar(
    "el panel muestra el rol nuevo y desaparece el botón de repartir",
    !(await doc.evaluate(() => document.body.innerText.includes("Dar rol al estudiante que falta")))
  );
  const posturas = await prisma.participanteForo.findMany({ where: { foroId: foro.id } });
  const a = posturas.filter((p) => p.postura === "A").length;
  comprobar("repartir da rol al que faltaba y deja los bandos parejos", posturas.length === 3 && Math.abs(a - (3 - a)) === 1);
  comprobar("sin cambiar el rol de quien ya lo tenía", posturas.find((p) => p.userId === e1.id)?.postura === "A");

  await capturar(doc, "foro-docente");
  await doc.type("#argumento", "Buen punto. Contrasten el artículo 1 con lo que cuenta la guía sobre La Tabacalera.");
  await doc.click("::-p-text(Publicar intervención)");
  await esperarTexto(doc, "Contrasten el artículo 1");
  const intervencion = await prisma.mensajeForo.findFirst({ where: { foroId: foro.id, autorId: docente.id } });
  comprobar("el docente interviene sin fuente y sin bando", intervencion && !intervencion.postura && !intervencion.fuente);

  // Retira la respuesta del segundo estudiante (la segunda opción "Retirar" del hilo).
  const retirar = await doc.$$("::-p-text(Retirar)");
  await retirar[1].click();
  await doc.waitForFunction((r) => !document.body.innerText.includes(r), { timeout: 20_000 }, RESPUESTA_B);
  comprobar(
    "el docente retira un mensaje",
    !(await prisma.mensajeForo.findUnique({ where: { id: respuesta.id } }))
  );

  await doc.click("::-p-text(Cerrar el debate)");
  await esperarTexto(doc, "Reabrir el debate");
  await estado(est1, `/estudiante/foros/${foro.id}`);
  comprobar(
    "cerrado, el estudiante lo lee pero ya no tiene dónde escribir",
    await est1.evaluate(() => document.body.innerText.includes("cerró este debate") && !document.querySelector("#argumento"))
  );

  // --- Otro curso no ve nada ----------------------------------------------
  const otroEst = await como(navegador, "prueba.otro.est", "ESTUDIANTE");
  await otroEst.goto(`${BASE}/estudiante/foros`, { waitUntil: "networkidle0" });
  comprobar(
    "un estudiante de otro docente no ve el debate en su lista",
    !(await otroEst.evaluate((p) => document.body.innerText.includes(p), PREGUNTA))
  );
  comprobar("ni puede abrirlo por su dirección", (await estado(otroEst, `/estudiante/foros/${foro.id}`)) === 404);

  const otroDoc = await como(navegador, "prueba.otro.docente", "DOCENTE");
  await otroDoc.goto(`${BASE}/docente/foros`, { waitUntil: "networkidle0" });
  comprobar(
    "otro docente no ve el debate en su lista",
    !(await otroDoc.evaluate((p) => document.body.innerText.includes(p), PREGUNTA))
  );
  comprobar("ni puede mediarlo por su dirección", (await estado(otroDoc, `/docente/foros/${foro.id}`)) === 404);

  const mensajes = await prisma.mensajeForo.count({ where: { foroId: foro.id } });
  comprobar("quedan el argumento y la intervención", mensajes === 2, `${mensajes} mensajes`);
});
