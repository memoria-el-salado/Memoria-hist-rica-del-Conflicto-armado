/**
 * 2.1 · Comentarios en la cartografía social y su llegada a los foros.
 *
 * Un compañero del mismo curso comenta el lugar de otro; el autor lo lee y
 * puede borrar solo lo suyo. Un estudiante de otro curso no ve el lugar ni
 * puede comentarlo. El docente abre un debate a partir del lugar: el foro
 * muestra el lugar y sus comentarios, se sigue comentando desde ahí y el
 * lugar enlaza al debate.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:comentarios
 */
import { BASE, capturar, como, comprobar, crearCuenta, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const LUGAR = "El kiosco de la plaza (prueba de comentarios)";
const COMENTARIO = "Mi abuela también se sentaba ahí a contar historias.";
const COMENTARIO_FORO = "En el debate pensé que ese kiosco es memoria de todos.";
const PREGUNTA = "¿Qué hace que un lugar sea memoria de todo un pueblo? (prueba)";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

async function abrirSesion(pagina, sesionId) {
  await pagina.goto(`${BASE}/estudiante/sesion/${sesionId}`, { waitUntil: "networkidle0" });
  if (await hay(pagina, "Antes de empezar")) {
    await pagina.click("::-p-text(Entiendo, continuar)");
    await esperarTexto(pagina, "Volver al mapa del viaje");
  }
}

/** Abre la conversación del lugar y publica un comentario. */
async function comentar(pagina, texto) {
  const resumen = await pagina.waitForSelector(`::-p-xpath(//article[@aria-label="${LUGAR}"]//summary | //section[@aria-labelledby="titulo-lugar-debate"]//summary)`);
  const abierto = await resumen.evaluate((s) => s.parentElement.open);
  if (!abierto) await resumen.click();
  const campo = await pagina.waitForSelector(`::-p-xpath(//article[@aria-label="${LUGAR}"]//textarea | //section[@aria-labelledby="titulo-lugar-debate"]//textarea)`);
  await campo.type(texto);
  const boton = await pagina.waitForSelector(`::-p-xpath(//article[@aria-label="${LUGAR}"]//button[@type="submit"] | //section[@aria-labelledby="titulo-lugar-debate"]//button[@type="submit"])`);
  await boton.click();
  await pagina.waitForFunction((t) => document.body.innerText.includes("Comentario publicado.") || document.body.innerText.includes(t), { timeout: 20_000 }, texto);
}

await ejecutar("2.1 · Comentarios en la cartografía y foros", async ({ abrir }) => {
  const sesion = await prisma.sesion.findFirst({
    where: { publicada: true, pantalla: "cartografia", eje: { caso: { activo: true } } },
    orderBy: [{ eje: { orden: "asc" } }, { orden: "asc" }],
  });
  if (!sesion) throw new Error("No hay una sesión de cartografía publicada en el módulo activo.");
  console.log(`  (sesión de prueba: ${sesion.codigo} ${sesion.titulo})\n`);

  const docente = await crearCuenta("docente", "DOCENTE");
  const curso = await prisma.curso.create({ data: { nombre: "Prueba 9A", anio: 2026, docenteId: docente.id } });
  const otroCurso = await prisma.curso.create({ data: { nombre: "Prueba 9B", anio: 2026, docenteId: docente.id } });
  const autor = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: curso.id, nombre: "Prueba Autora" });
  await crearCuenta("est2", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: curso.id, nombre: "Prueba Compañero" });
  await crearCuenta("est3", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: otroCurso.id, nombre: "Prueba Otro Curso" });
  const marca = await prisma.marcaCartografia.create({
    data: { autorId: autor.id, sesionId: sesion.id, lugar: LUGAR, relato: "Ahí nos reuníamos los domingos.", lat: 9.7, lon: -75.1 },
  });

  const navegador = await abrir();

  // --- Un compañero del curso comenta -----------------------------------------
  const companero = await como(navegador, "prueba.est2", "ESTUDIANTE");
  await abrirSesion(companero, sesion.id);
  comprobar("el compañero ve el lugar con la opción de comentar", (await hay(companero, LUGAR)) && Boolean(await companero.$(`::-p-xpath(//article[@aria-label="${LUGAR}"]//summary)`)));
  await comentar(companero, COMENTARIO);
  const guardado = await prisma.comentarioMarca.findFirst({ where: { marcaId: marca.id } });
  comprobar("el comentario queda guardado en el lugar", guardado?.texto === COMENTARIO);
  await capturar(companero, "cartografia-comentarios");

  // --- La autora lo lee y no puede borrar lo ajeno ----------------------------
  const autora = await como(navegador, "prueba.est1", "ESTUDIANTE");
  await abrirSesion(autora, sesion.id);
  comprobar("la autora ve cuántos comentarios tiene su lugar", await hay(autora, "1 comentario"));
  await (await autora.$(`::-p-xpath(//article[@aria-label="${LUGAR}"]//summary)`)).click();
  comprobar("y los lee", await hay(autora, COMENTARIO));
  comprobar("pero no puede borrar el comentario de otro", !(await autora.$('[aria-label="Borrar el comentario de Prueba Compañero"]')));

  // --- Otro curso no lo ve ----------------------------------------------------
  const otro = await como(navegador, "prueba.est3", "ESTUDIANTE");
  await abrirSesion(otro, sesion.id);
  comprobar("un estudiante de otro curso no ve el lugar ni sus comentarios", !(await hay(otro, LUGAR)) && !(await hay(otro, COMENTARIO)));

  // --- El docente abre un debate a partir del lugar ----------------------------
  const doc = await como(navegador, "prueba.docente", "DOCENTE");
  await doc.goto(`${BASE}/docente/foros`, { waitUntil: "networkidle0" });
  const opcion = await doc.$eval("#marcaId", (s, lugar) => [...s.options].find((o) => o.text.includes(lugar))?.textContent ?? "", LUGAR);
  comprobar("el docente elige el lugar entre los de su cartografía, con sus comentarios", opcion.includes("1 comentario"), opcion);
  await doc.type("#pregunta", PREGUNTA);
  await doc.type("#rolA", "Quienes lo vivieron");
  await doc.type("#rolB", "Quienes llegaron después");
  await doc.select("#marcaId", marca.id);
  await doc.select("#cursoId", curso.id);
  await doc.click("::-p-text(Abrir foro)");
  // Al abrirse, el foro aparece en la lista de debates.
  await esperarTexto(doc, PREGUNTA);
  const foro = await prisma.foro.findFirst({ where: { pregunta: PREGUNTA } });
  comprobar("el foro queda unido al lugar", foro?.marcaId === marca.id);

  await doc.goto(`${BASE}/docente/foros/${foro.id}`, { waitUntil: "networkidle0" });
  comprobar("el foro del docente muestra el lugar y lo que comentó el curso", (await hay(doc, "EL DEBATE PARTE DE LA CARTOGRAFÍA SOCIAL")) && (await hay(doc, COMENTARIO)));
  comprobar("y el docente puede moderar el comentario", Boolean(await doc.$('[aria-label="Borrar el comentario de Prueba Compañero"]')));

  // --- En el foro se sigue comentando; el lugar enlaza al debate ---------------
  await companero.goto(`${BASE}/estudiante/foros/${foro.id}`, { waitUntil: "networkidle0" });
  comprobar("el estudiante ve el lugar en el foro con sus comentarios", (await hay(companero, LUGAR)) && (await hay(companero, COMENTARIO)));
  await comentar(companero, COMENTARIO_FORO);
  comprobar("y comenta desde el foro", (await prisma.comentarioMarca.count({ where: { marcaId: marca.id } })) === 2);
  await capturar(companero, "foro-desde-cartografia");

  await abrirSesion(autora, sesion.id);
  comprobar("en la cartografía el lugar ya cuenta los dos comentarios", await hay(autora, "2 comentarios"));
  await (await autora.$(`::-p-xpath(//article[@aria-label="${LUGAR}"]//summary)`)).click();
  comprobar("y enlaza al debate que se abrió sobre él", await hay(autora, `Se debate en el foro: «${PREGUNTA}»`));

  // --- El compañero borra lo suyo ---------------------------------------------
  await abrirSesion(companero, sesion.id);
  await (await companero.$(`::-p-xpath(//article[@aria-label="${LUGAR}"]//summary)`)).click();
  await companero.click('[aria-label="Borrar el comentario de Prueba Compañero"]');
  await companero.waitForFunction(() => document.body.innerText.includes("Comentario borrado."), { timeout: 20_000 });
  comprobar("su autor puede borrar un comentario", (await prisma.comentarioMarca.count({ where: { marcaId: marca.id } })) === 1);
});
