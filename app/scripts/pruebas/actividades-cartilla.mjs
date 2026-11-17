/**
 * Las actividades de la cartilla, apartado por apartado, y los acuerdos del Preámbulo.
 *
 * Cada sesión trae, además de su actividad principal, los ejercicios que la
 * cartilla propone en sus apartados (1.2.1, 1.2.2, 1.3.3…), con el número del
 * apartado y la página de la cartilla. Se ordenan pasos con botones, se
 * clasifican tarjetas con listas y se responden preguntas; al guardar, lo que
 * se puede corregir se corrige. El docente ve lo que respondió cada estudiante.
 * En el Preámbulo, cada estudiante escribe sus acuerdos de cuidado y el curso
 * los ve juntos.
 *
 * Todo sobre un módulo de prueba inactivo, con las cartillas reales vinculadas,
 * que se borra al terminar.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:actividades-cartilla
 */
import { BASE, capturar, como, comprobar, crearCuenta, crearModuloDePrueba, ejecutar, esperarTexto, prisma, visitar } from "./entorno.mjs";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);
const form = (id) => `form[aria-labelledby="act-${id}-titulo"]`;
const estadoDe = async (pagina, id) => {
  await pagina.waitForSelector(`${form(id)} [role="status"], ${form(id)} [role="alert"]`, { timeout: 20_000 });
  return pagina.$eval(`${form(id)} [role="status"], ${form(id)} [role="alert"]`, (e) => `${e.getAttribute("role")}:${e.innerText}`);
};

await ejecutar("Actividades de la cartilla y acuerdos del Preámbulo", async ({ abrir }) => {
  const modulo = await crearModuloDePrueba([
    { pantalla: "zona", titulo: "Arraigos campesinos, una tierra de abundancia y los conflictos que se desatan" },
    { pantalla: "zona", titulo: "Los dos modelos del campo enfrentados" },
    { pantalla: "zona", titulo: "Asociación Nacional de Usuarios Campesinos, ANUC" },
    { pantalla: "acuerdos", titulo: "Me cuido y nos cuidamos: construyendo acuerdos para el viaje por la memoria histórica" },
  ]);
  const [s12, s13, s22, sP] = modulo.sesiones;
  const subsecciones = {
    [s12]: ["1.2", [["1.2.1", "Tierra de abundancia"], ["1.2.2", "Poblamiento de la región y conflictos sociales"]]],
    [s13]: ["1.3", [["1.3.1", "Los argumentos a favor de la redistribución de la tierra"], ["1.3.2", "Los argumentos a favor del enfoque productivista"], ["1.3.3", "La aprobación de la Ley 135 de 1961, la Reforma Agraria"], ["1.3.4", "A investigar: la tierra en Colombia hoy en día"]]],
    [s22]: ["2.2", [["2.2.4", "A investigar: movilizaciones campesinas hoy"]]],
    [sP]: ["P", []],
  };
  for (const [id, [codigo, subs]] of Object.entries(subsecciones)) {
    await prisma.sesion.update({ where: { id }, data: { codigo, subsecciones: { create: subs.map(([c, t], i) => ({ codigo: c, titulo: t, orden: i })) } } });
  }
  // Las cartillas reales, para enlazar cada apartado a su página.
  for (const d of await prisma.documentoFuente.findMany({ select: { id: true } })) {
    await prisma.documentoVinculado.create({ data: { casoId: modulo.casoId, documentoId: d.id } });
  }

  const docente = await crearCuenta("docente", "DOCENTE");
  const curso = await prisma.curso.create({ data: { nombre: "Curso de prueba", anio: 2026, docenteId: docente.id } });
  const est1 = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: curso.id, nombre: "Prueba Ana" });
  await crearCuenta("est2", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: curso.id, nombre: "Prueba Beto" });

  const navegador = await abrir();
  const p = await como(navegador, "prueba.est1", "ESTUDIANTE");

  // --- 1.2: cinco actividades en sus apartados ---------------------------------------
  await visitar(p, `${BASE}/estudiante/sesion/${s12}`);
  await esperarTexto(p, "MÁS ACTIVIDADES DE LA CARTILLA");
  const tarjetas = await p.$$eval("#actividades-cartilla form", (fs) => fs.map((f) => f.getAttribute("aria-labelledby")));
  comprobar(
    "la sesión 1.2 trae las cinco actividades de sus apartados, en orden",
    tarjetas.join() === ["dia-campesino", "ley-tres-pasos", "tierra-1960", "campesinos-terratenientes", "glosario-tierra"].map((x) => `act-${x}-titulo`).join(),
    tarjetas.join(", ")
  );
  const enlace = await p.$eval(`${form("ley-tres-pasos")} a[href^="/api/documentos/"]`, (a) => a.getAttribute("href")).catch(() => "");
  comprobar("cada actividad lleva su apartado y la página de la cartilla", (await hay(p, "1.2.2")) && /#page=\d+$/.test(enlace), enlace);
  const despues = await p.evaluate(() => {
    const a = document.getElementById("actividades-cartilla");
    const r = document.getElementById("retroalimentacion");
    return Boolean(a && r && a.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  comprobar("van después de la actividad principal y antes de la retroalimentación", despues);

  // Ordenar con los botones: llegan corridos una posición.
  await p.click(`${form("ley-tres-pasos")} [aria-label^="Subir el paso: El colono tumba"]`);
  await p.click(`${form("ley-tres-pasos")} [aria-label^="Bajar el paso: El finquero o contratista"]`);
  const orden = await p.$$eval(`${form("ley-tres-pasos")} ol li p`, (ps) => ps.map((x) => x.innerText.replace(/^Paso \d+: /, "").slice(0, 12)));
  await p.type(`${form("ley-tres-pasos")} textarea`, "El colono abría la tierra y después la perdía ante el finquero y el latifundista.");
  await p.click(`${form("ley-tres-pasos")} button[type="submit"]`);
  await estadoDe(p, "ley-tres-pasos");
  comprobar("ordenar se hace con botones y, al guardar, se corrige", await p.$eval(form("ley-tres-pasos"), (f) => f.innerText.includes("Acertaste 3 de 3.")), orden.join(" | "));

  // Clasificar con listas: una a propósito en el lugar equivocado.
  const glosario = { g1: "latifundio", g2: "minifundio", g3: "estructura", g4: "latifundio" };
  for (const [t, c] of Object.entries(glosario)) await p.select(`#act-glosario-tierra-${t}`, c);
  await p.click(`${form("glosario-tierra")} button[type="submit"]`);
  await estadoDe(p, "glosario-tierra");
  comprobar("clasificar dice cuántas acertó", await p.$eval(form("glosario-tierra"), (f) => f.innerText.includes("Acertaste 3 de 4.")));
  comprobar("y cuál corresponde a la que falló", await p.$eval(form("glosario-tierra"), (f) => f.innerText.includes("✗ Corresponde a: Terrenos baldíos")));

  // Preguntas: la validación pide lo que falta.
  await p.click(`${form("tierra-1960")} button[type="submit"]`);
  comprobar("si falta una respuesta, lo dice", (await estadoDe(p, "tierra-1960")).startsWith("alert:Responde «¿Qué caracterizaba"));
  comprobar("el cuadro de la tierra en 1960 muestra los datos de la cartilla", (await hay(p, "45,8 %")) && (await hay(p, "18 %")));

  await p.select("#act-dia-campesino-municipio", "Ovejas");
  await p.type("#act-dia-campesino-dia", "Se levanta temprano, revisa el tabaco, lleva el ñame al mercado y en la tarde toca la gaita.");
  await p.click(`${form("dia-campesino")} button[type="submit"]`);
  comprobar("las preguntas se guardan, con un campo opcional vacío", (await estadoDe(p, "dia-campesino")).startsWith("status:Tus respuestas quedaron guardadas"));
  const guardadas = await prisma.respuestaCartilla.findMany({ where: { userId: est1.id, sesionId: s12 }, select: { actividad: true } });
  comprobar("quedan tres respuestas en la base", guardadas.length === 3, guardadas.map((g) => g.actividad).join(", "));
  await capturar(p, "actividades-cartilla-12");

  await p.reload({ waitUntil: "networkidle0" });
  comprobar("al volver, siguen ahí y marcadas como hechas", (await hay(p, "3 de 5 hechas")) && (await p.$eval("#act-dia-campesino-municipio", (s) => s.value)) === "Ovejas");

  // --- 1.3 y un «A investigar» de otro eje --------------------------------------------
  await visitar(p, `${BASE}/estudiante/sesion/${s13}`);
  const en13 = await p.$$eval("#actividades-cartilla form", (fs) => fs.length);
  comprobar("la 1.3 trae ¿Quién defendía qué?, la Ley 135, las exequias y la investigación", en13 === 4 && (await hay(p, "Desarmo la Ley 135 de 1961")));
  await visitar(p, `${BASE}/estudiante/sesion/${s22}`);
  comprobar("un «A investigar» de otro eje recibe su investigación", await hay(p, "A investigar: movilizaciones campesinas hoy"));

  // --- Preámbulo: acuerdos del curso --------------------------------------------------
  await visitar(p, `${BASE}/estudiante/sesion/${sP}`);
  await esperarTexto(p, "ME CUIDO Y NOS CUIDAMOS");
  await p.type("#respuesta-guiada", "Escuchar sin interrumpir.\nNo burlarme de lo que otro siente.\nPedir una pausa si lo necesito.");
  await p.click("::-p-text(Sumarlos a los acuerdos de mi curso)");
  await p.click('form button[type="submit"]');
  await esperarTexto(p, "Tus acuerdos quedaron guardados.");
  comprobar("el estudiante escribe y comparte sus acuerdos", true);
  const q = await como(navegador, "prueba.est2", "ESTUDIANTE");
  await visitar(q, `${BASE}/estudiante/sesion/${sP}`);
  comprobar("su curso los ve juntos", (await hay(q, "LOS ACUERDOS DE TU CURSO")) && (await hay(q, "Pedir una pausa si lo necesito.")) && (await hay(q, "Prueba Ana")));
  await capturar(q, "acuerdos-curso");

  // --- El docente ---------------------------------------------------------------------
  const d = await como(navegador, "prueba.docente", "DOCENTE");
  await visitar(d, `${BASE}/docente/sesiones/${s12}`);
  await esperarTexto(d, "ACTIVIDADES DE LA CARTILLA");
  const resumen = await d.$eval('section[aria-labelledby="titulo-respuestas-cartilla"]', (s) => s.innerText);
  comprobar("el docente ve cuántos respondieron cada actividad", (resumen.match(/1 respuesta/g) ?? []).length === 3, resumen.replace(/\s+/g, " ").slice(0, 160));
  await d.click('section[aria-labelledby="titulo-respuestas-cartilla"] summary');
  comprobar("y lo que respondió cada estudiante", await d.$eval('section[aria-labelledby="titulo-respuestas-cartilla"]', (s) => s.innerText.includes("Prueba Ana")));
  await capturar(d, "actividades-cartilla-docente");

  // --- En el celular ------------------------------------------------------------------
  await p.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await visitar(p, `${BASE}/estudiante/sesion/${s12}`);
  comprobar("en el celular nada se desborda", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
});
