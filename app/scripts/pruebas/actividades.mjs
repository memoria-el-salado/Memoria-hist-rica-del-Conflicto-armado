/**
 * 2.4 · Los formatos de la guía: Me ubico, Dilema, A investigar, Testimonios y
 * Compromiso.
 *
 * El docente plantea el dilema y la pregunta de investigación a sus
 * estudiantes. Un estudiante hace las cinco actividades, con sus validaciones;
 * los testimonios piden antes la alerta de cuidado; tras elegir en el dilema
 * ve cómo eligió su curso, y en el compromiso ve lo que su curso compartió.
 * Un compañero de otro curso solo ve lo suyo. El administrador cambia la
 * actividad de una sesión ya importada, con la que sugiere el importador.
 *
 * Todo sobre un módulo de prueba inactivo, que se borra al terminar.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:actividades
 */
import { BASE, capturar, como, comprobar, crearCuenta, crearModuloDePrueba, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const DILEMA = "Tu vereda sufre una injusticia que nadie atiende. ¿Qué camino tomarías? (prueba)";
const OPCIONES = ["Organizarse y denunciar", "Callar para protegerse", "Irse a otro lugar"];
const PREGUNTA = "¿Quién es hoy dueño de la tierra en tu municipio? (prueba)";
const JUSTIFICACION = "Porque organizarse permite exigir derechos sin poner en riesgo la vida de nadie más en la vereda.";
const HALLAZGO =
  "En mi municipio la mayor parte de la tierra la tienen pocas familias; mi abuela cuenta que antes había más parcelas pequeñas y que muchos vendieron por miedo durante los años de la violencia.";
const COMPROMISO = "Me comprometo a escuchar a mis vecinos antes de juzgarlos.";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

async function vaciar(pagina, selector) {
  await pagina.$eval(selector, (el) => el.select());
  await pagina.keyboard.press("Backspace");
}

/** Pulsa el botón y espera el aviso indicado. */
async function enviar(pagina, boton, esperado) {
  await pagina.click(boton);
  await pagina.waitForFunction(
    (t) => [...document.querySelectorAll('[role="alert"], [role="status"]')].some((e) => e.textContent.includes(t)),
    { timeout: 30_000 },
    esperado
  );
  return true;
}

const GUARDAR = "::-p-xpath(//form//button[@type='submit'][normalize-space()='Guardar' or normalize-space()='Actualizar'])";

let modulo;

await ejecutar("2.4 · Me ubico, Dilema, A investigar, Testimonios y Compromiso", async ({ abrir }) => {
  modulo = await crearModuloDePrueba([
    { pantalla: "meubico", titulo: "Me ubico: lo que me duele de mi barrio (prueba)" },
    { pantalla: "dilema", titulo: "Dilemas frente a la injusticia (prueba)" },
    { pantalla: "investigar", titulo: "A investigar: la tierra hoy (prueba)" },
    { pantalla: "testimonios", titulo: "Los testimonios de la gente (prueba)" },
    { pantalla: "compromiso", titulo: "Y tú ¿a qué te comprometes? (prueba)" },
    { pantalla: "zona", titulo: "¿A qué te comprometes con tu escuela? (prueba)" },
  ]);
  const [sMeUbico, sDilema, sInvestigar, sTestimonios, sCompromiso, sSinAsignar] = modulo.sesiones;
  const url = (id) => `${BASE}/estudiante/sesion/${id}`;

  const docente = await crearCuenta("docente", "DOCENTE");
  const curso = await prisma.curso.create({ data: { nombre: "Prueba 11A", anio: 2026, docenteId: docente.id } });
  const e1 = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: curso.id, nombre: "Prueba est1" });
  await crearCuenta("est2", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: curso.id, nombre: "Prueba est2" });
  await crearCuenta("est3", "ESTUDIANTE", { creadoPorId: docente.id, nombre: "Prueba est3" });
  await crearCuenta("admin", "ADMIN");
  await prisma.foro.create({
    data: { pregunta: "¿Organizarse o callar? (prueba)", rolA: "Organizarse", rolB: "Callar", autorId: docente.id, sesionId: sDilema },
  });

  const navegador = await abrir();

  // --- El docente plantea ---------------------------------------------------
  const doc = await como(navegador, "prueba.docente", "DOCENTE");
  await doc.goto(`${BASE}/docente/sesiones/${sDilema}`, { waitUntil: "networkidle0" });
  await vaciar(doc, "#pregunta-planteamiento");
  await doc.type("#pregunta-planteamiento", DILEMA);
  await doc.type("#opcion-0", OPCIONES[0]);
  comprobar("un dilema necesita dos opciones", await enviar(doc, "::-p-text(Plantear el dilema)", "Un dilema necesita al menos dos opciones."));
  await doc.type("#opcion-1", OPCIONES[1]);
  await doc.click("::-p-text(+ Otra opción)");
  await doc.type("#opcion-2", OPCIONES[2]);
  comprobar("plantea el dilema con tres opciones", await enviar(doc, "::-p-text(Plantear el dilema)", "Dilema planteado."));
  await capturar(doc, "actividades-plantear-dilema");

  await doc.goto(`${BASE}/docente/sesiones/${sInvestigar}`, { waitUntil: "networkidle0" });
  await vaciar(doc, "#pregunta-planteamiento");
  await doc.type("#pregunta-planteamiento", PREGUNTA);
  comprobar("plantea la pregunta de investigación", await enviar(doc, "::-p-text(Plantear la pregunta)", "Pregunta planteada."));
  comprobar("una sesión que no se plantea no tiene esa página", (await doc.goto(`${BASE}/docente/sesiones/${sMeUbico}`)).status() === 404);

  // --- Un estudiante hace las cinco -------------------------------------------
  const est1 = await como(navegador, "prueba.est1", "ESTUDIANTE");

  await est1.goto(url(sMeUbico), { waitUntil: "networkidle0" });
  await est1.type("#respuesta-guiada", "Me duele.");
  comprobar("me ubico pide una reflexión con extensión", await enviar(est1, GUARDAR, "Escribe tu reflexión (al menos 40 caracteres)."));
  await est1.type("#respuesta-guiada", " Me duele que en mi barrio la gente no se hable entre vecinos.");
  comprobar("me ubico se guarda, y solo la lee el docente", await enviar(est1, GUARDAR, "Solo tu docente la lee."));

  await est1.goto(url(sDilema), { waitUntil: "networkidle0" });
  comprobar("el dilema muestra lo que planteó su docente", (await hay(est1, DILEMA)) && (await hay(est1, OPCIONES[2])));
  comprobar("y el debate que el docente abrió sobre la sesión", await hay(est1, "DEBATE DE ESTA SESIÓN"));
  await est1.type("#respuesta-guiada", JUSTIFICACION);
  comprobar("sin elegir una opción no se guarda", await enviar(est1, GUARDAR, "Elige una de las opciones."));
  await est1.click(`::-p-xpath(//label[normalize-space()="${OPCIONES[0]}"])`);
  comprobar("eligiendo y justificando, sí", await enviar(est1, GUARDAR, "Tu elección quedó guardada."));
  await est1.reload({ waitUntil: "networkidle0" });
  comprobar("después de elegir ve cómo eligió su curso", (await hay(est1, "CÓMO ELIGIÓ TU CURSO")) && (await hay(est1, "(tu elección)")));

  await est1.goto(url(sInvestigar), { waitUntil: "networkidle0" });
  comprobar("la investigación muestra la pregunta del docente", await hay(est1, PREGUNTA));
  await est1.type("#respuesta-guiada", HALLAZGO);
  comprobar("sin fuentes no se entrega", await enviar(est1, GUARDAR, "Anota al menos una fuente"));
  await est1.type("#fuente-0", "Entrevista a mi abuela");
  await est1.click("::-p-text(+ Otra fuente)");
  await est1.type("#fuente-1", "Informe del CNMH sobre El Salado");
  comprobar("con sus fuentes, se entrega", await enviar(est1, GUARDAR, "Tu investigación quedó guardada."));

  await est1.goto(url(sTestimonios), { waitUntil: "networkidle0" });
  comprobar("los testimonios piden antes la alerta de cuidado", await hay(est1, "Antes de empezar"));
  await est1.click("::-p-text(Entiendo, continuar)");
  await est1.waitForSelector("#respuesta-guiada");
  await est1.type("#respuesta-guiada", "Me dejaron tristeza, pero también admiración por quienes volvieron a su tierra.");
  comprobar("y después se responde", await enviar(est1, GUARDAR, "Lo que escribiste quedó guardado."));

  await est1.goto(url(sCompromiso), { waitUntil: "networkidle0" });
  await est1.type("#respuesta-guiada", COMPROMISO);
  await est1.click("::-p-text(Compartirlo con mi curso)");
  comprobar("el compromiso se guarda", await enviar(est1, GUARDAR, "Tu compromiso quedó guardado."));
  await est1.reload({ waitUntil: "networkidle0" });
  comprobar("y, compartido, aparece en el muro del curso", (await hay(est1, COMPROMISO)) && (await hay(est1, "Prueba est1 (tú)")));
  await capturar(est1, "actividades-compromiso");

  const respuestas = await prisma.respuestaActividad.findMany({ where: { userId: e1.id } });
  const de = (id) => respuestas.find((r) => r.sesionId === id)?.datos ?? {};
  comprobar("las cinco quedan guardadas", respuestas.length === 5);
  comprobar(
    "con lo que pide cada una: opción, fuentes, compartido",
    de(sDilema).opcion === OPCIONES[0] && de(sInvestigar).fuentes?.length === 2 && de(sCompromiso).compartido === true
  );

  // --- Un compañero del mismo curso -------------------------------------------
  const est2 = await como(navegador, "prueba.est2", "ESTUDIANTE");
  await est2.goto(url(sDilema), { waitUntil: "networkidle0" });
  comprobar("antes de elegir no ve el reparto del curso", !(await hay(est2, "CÓMO ELIGIÓ TU CURSO")));
  await est2.click(`::-p-xpath(//label[normalize-space()="${OPCIONES[1]}"])`);
  await est2.type("#respuesta-guiada", "Porque a veces protegerse es también cuidar a la familia de las represalias de los armados.");
  await enviar(est2, GUARDAR, "Tu elección quedó guardada.");
  await est2.reload({ waitUntil: "networkidle0" });
  const reparto = await est2.$eval('section[aria-labelledby="titulo-reparto"]', (s) => s.innerText);
  comprobar("el reparto suma las dos elecciones", reparto.includes("2 respuestas") && reparto.includes("1 · 50%"), reparto.split("\n")[1]);
  await capturar(est2, "actividades-dilema-reparto");

  await est2.goto(url(sCompromiso), { waitUntil: "networkidle0" });
  await est2.type("#respuesta-guiada", "Me comprometo a no repetir estigmas sobre otras personas.");
  await enviar(est2, GUARDAR, "Tu compromiso quedó guardado.");
  await est2.reload({ waitUntil: "networkidle0" });
  comprobar("un compromiso sin compartir no sale en el muro", (await hay(est2, COMPROMISO)) && !(await hay(est2, "no repetir estigmas")));

  // --- Otro curso ------------------------------------------------------------------
  const est3 = await como(navegador, "prueba.est3", "ESTUDIANTE");
  await est3.goto(url(sCompromiso), { waitUntil: "networkidle0" });
  comprobar("uno de otro curso no ve el muro de este curso", (await hay(est3, "Nadie ha compartido todavía")) && !(await hay(est3, COMPROMISO)));
  await est3.goto(url(sDilema), { waitUntil: "networkidle0" });
  comprobar("pero sí el dilema de su docente", await hay(est3, DILEMA));

  // --- El docente ve cómo eligieron -----------------------------------------------
  await doc.goto(`${BASE}/docente/sesiones/${sDilema}`, { waitUntil: "networkidle0" });
  comprobar("el docente ve cuántos respondieron y cómo eligieron", (await hay(doc, "Han respondido 2 estudiantes.")) && (await hay(doc, "CÓMO ELIGIERON TUS ESTUDIANTES")));

  // --- El administrador cambia actividades ----------------------------------------
  const admin = await como(navegador, "prueba.admin", "ADMIN");
  await admin.goto(`${BASE}/admin/casos/${modulo.casoId}`, { waitUntil: "networkidle0" });
  comprobar("el editor señala la sesión cuya actividad no es la sugerida", await hay(admin, "1 sesión tiene una actividad distinta de la sugerida."));
  await capturar(admin, "actividades-editor");
  await admin.click('[aria-label="Usar la sugerida en la sesión 9.6"]');
  await esperarTexto(admin, "La sesión 9.6 ahora es «Compromiso».");
  comprobar("aplica la sugerida a una sesión", (await prisma.sesion.findUnique({ where: { id: sSinAsignar } })).pantalla === "compromiso");

  await admin.select('[aria-label="Actividad de la sesión 9.6"]', "testimonios");
  await esperarTexto(admin, "ahora es «Testimonios»");
  const conTestimonios = await prisma.sesion.findUnique({ where: { id: sSinAsignar } });
  comprobar("al pasar a testimonios, la sesión gana la alerta de cuidado", conTestimonios.pantalla === "testimonios" && conTestimonios.alertaCuidado);

  await admin.reload({ waitUntil: "networkidle0" });
  await admin.click("::-p-text(Aplicar todas las sugeridas)");
  await esperarTexto(admin, "1 sesión cambió de actividad.");
  comprobar("y puede aplicar todas las sugeridas", (await prisma.sesion.findUnique({ where: { id: sSinAsignar } })).pantalla === "compromiso");
});
