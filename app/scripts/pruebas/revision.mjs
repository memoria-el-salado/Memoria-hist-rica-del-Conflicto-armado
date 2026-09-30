/**
 * 3.2 · Retroalimentación y avisos.
 *
 * El docente ve en «Revisión» lo que entregaron sus estudiantes (respuestas,
 * simulaciones validadas y entradas del diario compartidas, no las privadas),
 * filtra por curso y comenta. Su campana avisa de lo entregado. El estudiante
 * recibe el aviso, lee el comentario junto a su trabajo y la campana deja de
 * contarlo. Si reescribe, el trabajo vuelve a quedar sin comentar. Otro
 * docente no ve nada de eso. Una sesión recién publicada también se avisa.
 *
 * Los trabajos se crean directamente en la base: cómo se hacen ya lo prueban
 * los demás guiones. Aquí se prueba la revisión y los avisos.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:revision
 */
import { BASE, capturar, como, comprobar, crearCuenta, crearModuloDePrueba, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const REFLEXION = "En mi barrio los vecinos casi no se hablan desde que llegaron los rumores de amenazas. (prueba)";
const DIARIO_COMPARTIDO = "Hoy sentí rabia al leer lo que pasó en la plaza. (prueba compartida)";
const DIARIO_PRIVADO = "Esto es solo para mí. (prueba privada)";
const COMENTARIO = "Gracias por contarlo. ¿Qué crees que ayudaría a que los vecinos vuelvan a hablarse?";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);
const campana = (pagina) => pagina.$eval('[aria-haspopup="true"][aria-label^="Avisos"]', (b) => b.getAttribute("aria-label"));

let sesionReal;
let publicadaAntes;

await ejecutar(
  "3.2 · Retroalimentación y avisos",
  async ({ abrir }) => {
    const { sesiones } = await crearModuloDePrueba([{ pantalla: "meubico", titulo: "Me ubico (prueba de revisión)" }]);
    const [sMeUbico] = sesiones;

    const docente = await crearCuenta("docente", "DOCENTE", { nombre: "Prueba Docente" });
    const c1 = await prisma.curso.create({ data: { nombre: "Prueba 10B", anio: 2026, docenteId: docente.id } });
    const c2 = await prisma.curso.create({ data: { nombre: "Prueba 10C", anio: 2026, docenteId: docente.id } });
    const e1 = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: c1.id, nombre: "Prueba est1" });
    const e2 = await crearCuenta("est2", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: c2.id, nombre: "Prueba est2" });
    await crearCuenta("otro.docente", "DOCENTE");

    const respuesta = await prisma.respuestaActividad.create({ data: { userId: e1.id, sesionId: sMeUbico, texto: REFLEXION } });
    const compartida = await prisma.entradaDiario.create({ data: { autorId: e1.id, emocion: "RABIA", texto: DIARIO_COMPARTIDO, privada: false } });
    await prisma.entradaDiario.create({ data: { autorId: e1.id, emocion: "TRISTEZA", texto: DIARIO_PRIVADO, privada: true } });
    await prisma.simulacion.create({ data: { userId: e1.id, sesionId: sMeUbico, indiceEquidad: 83, validadaEn: new Date() } });
    await prisma.respuestaActividad.create({ data: { userId: e2.id, sesionId: sMeUbico, texto: "Respuesta de otro curso para la revisión. (prueba)" } });

    const navegador = await abrir();

    // --- El docente revisa ------------------------------------------------------
    const doc = await como(navegador, "prueba.docente", "DOCENTE");
    await doc.goto(`${BASE}/docente/revision`, { waitUntil: "networkidle0" });
    comprobar("ve respuestas, simulaciones y el diario compartido", (await hay(doc, REFLEXION)) && (await hay(doc, "Índice de equidad: 83 de 100")) && (await hay(doc, DIARIO_COMPARTIDO)));
    comprobar("no ve la entrada privada del diario", !(await hay(doc, DIARIO_PRIVADO)));
    comprobar("cuenta lo que espera comentario", await hay(doc, "Sin comentar (4)"));
    comprobar("su campana avisa de lo entregado", (await campana(doc)) === "Avisos: 4 nuevos");

    await doc.click('[aria-haspopup="true"][aria-label^="Avisos"]');
    await esperarTexto(doc, "Prueba est1 entregó su trabajo de la sesión 9.1.");
    comprobar("y lo nombra en la lista", await hay(doc, "Prueba est1 compartió contigo una entrada de su diario."));
    await doc.keyboard.press("Escape");
    await doc.reload({ waitUntil: "networkidle0" });
    comprobar("al abrir la campana, lo entregado deja de ser nuevo", (await campana(doc)) === "Avisos");

    await doc.select("#filtro-curso", c1.id);
    await doc.waitForFunction(() => location.search.includes("curso="), { timeout: 20_000 });
    await esperarTexto(doc, "Sin comentar (3)");
    comprobar("filtra por curso", !(await hay(doc, "Respuesta de otro curso")));

    await doc.type(`#comentario-RESPUESTA-${respuesta.id}`, COMENTARIO);
    await doc.click(`::-p-xpath(//li[.//textarea[@id="comentario-RESPUESTA-${respuesta.id}"]]//button[normalize-space()="Comentar"])`);
    await esperarTexto(doc, "Comentario enviado.");
    await doc.type(`#comentario-DIARIO-${compartida.id}`, "Tu rabia tiene sentido; hablemos en clase.");
    await doc.click(`::-p-xpath(//li[.//textarea[@id="comentario-DIARIO-${compartida.id}"]]//button[normalize-space()="Comentar"])`);
    await doc.waitForFunction(() => document.body.innerText.includes("Sin comentar (1)"), { timeout: 20_000 });
    comprobar("comentar saca el trabajo de los pendientes", true);
    await capturar(doc, "revision-docente");

    // --- Otro docente ------------------------------------------------------------
    const otro = await como(navegador, "prueba.otro.docente", "DOCENTE");
    await otro.goto(`${BASE}/docente/revision`, { waitUntil: "networkidle0" });
    comprobar("otro docente no ve esos trabajos", !(await hay(otro, REFLEXION)) && (await hay(otro, "todavía no han entregado")));

    // --- El estudiante recibe ----------------------------------------------------
    const est = await como(navegador, "prueba.est1", "ESTUDIANTE");
    await est.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
    comprobar("la campana del estudiante cuenta los dos comentarios", (await campana(est)) === "Avisos: 2 nuevos");
    await est.click('[aria-haspopup="true"][aria-label^="Avisos"]');
    await esperarTexto(est, "Prueba Docente comentó tu trabajo en la sesión 9.1.");
    await capturar(est, "revision-campana");
    await est.click("::-p-text(comentó tu trabajo en la sesión 9.1)");
    await est.waitForFunction(() => location.pathname.startsWith("/estudiante/sesion/"), { timeout: 20_000 });
    await esperarTexto(est, COMENTARIO);
    comprobar("el aviso lleva a la sesión, con el comentario junto al trabajo", await hay(est, "COMENTARIOS DE TU DOCENTE"));
    const leido = async (filtro) => {
      for (let i = 0; i < 20; i++) {
        const c = await prisma.comentario.findFirst({ where: { estudianteId: e1.id, ...filtro } });
        if (c?.leidoEn) return true;
        await new Promise((r) => setTimeout(r, 500));
      }
      return false;
    };
    comprobar("verlo lo marca como leído", await leido({ respuestaId: respuesta.id }));

    await est.goto(`${BASE}/estudiante/diario`, { waitUntil: "networkidle0" });
    comprobar("la respuesta a la entrada del diario aparece bajo la entrada", await hay(est, "Tu rabia tiene sentido"));
    comprobar("y también se marca como leída", await leido({ entradaId: compartida.id }));
    await est.reload({ waitUntil: "networkidle0" });
    comprobar("con todo leído, la campana ya no cuenta nada", (await campana(est)) === "Avisos");

    // --- Una sesión recién publicada --------------------------------------------
    sesionReal = await prisma.sesion.findFirst({ where: { publicada: true, eje: { caso: { activo: true } } }, orderBy: [{ eje: { orden: "asc" } }, { orden: "asc" }] });
    if (sesionReal) {
      publicadaAntes = sesionReal.publicadaEn;
      await prisma.sesion.update({ where: { id: sesionReal.id }, data: { publicadaEn: new Date() } });
      await est.reload({ waitUntil: "networkidle0" });
      comprobar("una sesión recién publicada se avisa", (await campana(est)) === "Avisos: 1 nuevo");
      await est.click('[aria-haspopup="true"][aria-label^="Avisos"]');
      comprobar("con su código", await hay(est, `Ya puedes abrir la sesión ${sesionReal.codigo}`));
    }

    // --- Reescribir vuelve a dejarlo pendiente --------------------------------------
    await prisma.respuestaActividad.update({ where: { id: respuesta.id }, data: { texto: `${REFLEXION} Lo pensé mejor.` } });
    await doc.goto(`${BASE}/docente/revision?pendientes=1`, { waitUntil: "networkidle0" });
    comprobar("si el estudiante reescribe, vuelve a quedar sin comentar", await hay(doc, "Lo pensé mejor."));
  },
  async () => {
    // La sesión real vuelve a su fecha de publicación.
    if (sesionReal) await prisma.sesion.update({ where: { id: sesionReal.id }, data: { publicadaEn: publicadaAntes ?? null } });
    comprobar(
      "la sesión real queda como estaba",
      !sesionReal || (await prisma.sesion.findUnique({ where: { id: sesionReal.id } })).publicadaEn?.getTime() === publicadaAntes?.getTime()
    );
  }
);
