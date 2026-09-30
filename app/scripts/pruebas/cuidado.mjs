/**
 * 1.4 · Alertas de cuidado y acompañamiento (CU06).
 *
 * Un docente activa la alerta de una sesión publicada con su propio texto; su
 * estudiante lo lee antes del contenido, lo deja para después, pide
 * acompañamiento desde la sesión y desde el botón general, y continúa. El
 * docente recibe los pedidos, sin duplicados, y los marca como atendidos. Otro
 * docente no ve nada de eso, y el administrador no tiene el botón.
 *
 * La alerta se prueba sobre una sesión real y publicada del módulo activo,
 * porque solo esas las ve un estudiante; al terminar se le devuelve el estado
 * que tenía.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:cuidado
 */
import { BASE, capturar, como, comprobar, crearCuenta, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const TEXTO_PRUEBA =
  "Prueba de alerta: esta sesión trae testimonios del desplazamiento. Puedes parar cuando quieras y hablar con tu docente.";
const MENSAJE_1 = "Me quedé pensando en lo de mi abuela.";
const MENSAJE_2 = "Prefiero hablar en el descanso.";

async function vaciar(pagina, selector) {
  await pagina.$eval(selector, (el) => el.select());
  await pagina.keyboard.press("Backspace");
}

/** Espera un texto en una región con rol de aviso, distinto del que había. */
async function avisoDe(pagina, rol, anterior = "") {
  await pagina.waitForFunction(
    (r, previo) => {
      const t = [...document.querySelectorAll(`[role="${r}"]`)].map((e) => e.textContent.trim()).find((x) => x && x !== previo);
      return Boolean(t);
    },
    { timeout: 20_000 },
    rol,
    anterior
  );
  return pagina.$$eval(`[role="${rol}"]`, (es, previo) => es.map((e) => e.textContent.trim()).find((x) => x && x !== previo), anterior);
}

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

let sesion;
let original;

await ejecutar(
  "1.4 · Alertas de cuidado y acompañamiento",
  async ({ abrir }) => {
    sesion = await prisma.sesion.findFirst({
      where: { publicada: true, eje: { caso: { activo: true } } },
      orderBy: [{ eje: { orden: "asc" } }, { orden: "asc" }],
    });
    if (!sesion) throw new Error("No hay ninguna sesión publicada en el módulo activo para probar la alerta.");
    original = { alertaCuidado: sesion.alertaCuidado, textoAlerta: sesion.textoAlerta };
    console.log(`  (sesión de prueba: ${sesion.codigo} ${sesion.titulo})\n`);

    const docente = await crearCuenta("docente", "DOCENTE", { nombre: "Prueba Docente Cuidado" });
    const est = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id });
    const otroDocente = await crearCuenta("otro.docente", "DOCENTE");
    await crearCuenta("admin", "ADMIN");

    const navegador = await abrir();
    const urlSesion = `${BASE}/estudiante/sesion/${sesion.id}`;

    // --- El docente activa la alerta con su texto --------------------------
    const doc = await como(navegador, "prueba.docente", "DOCENTE");
    await doc.goto(`${BASE}/docente/panel`, { waitUntil: "networkidle0" });
    comprobar("el panel dice que nadie ha pedido acompañamiento", await hay(doc, "Ningún estudiante ha pedido acompañamiento"));

    await doc.select("#sesionId", sesion.id);
    await vaciar(doc, "#textoAlerta");
    await doc.type("#textoAlerta", "Cuidado.");
    await doc.click("::-p-text(ACTIVAR ALERTA DE CUIDADO)");
    const error = await avisoDe(doc, "alert");
    comprobar("rechaza un aviso que no explica nada", error.startsWith("Escribe qué trae la sesión"), error);

    await vaciar(doc, "#textoAlerta");
    await doc.type("#textoAlerta", TEXTO_PRUEBA);
    await doc.click("::-p-text(ACTIVAR ALERTA DE CUIDADO)");
    const ok = await avisoDe(doc, "status");
    comprobar("activa la alerta", ok.startsWith(`Alerta activa en la sesión ${sesion.codigo}`), ok);
    const conAlerta = await prisma.sesion.findUnique({ where: { id: sesion.id } });
    comprobar("la sesión guarda la alerta y su texto", conAlerta.alertaCuidado && conAlerta.textoAlerta === TEXTO_PRUEBA);
    await capturar(doc, "cuidado-panel-alerta");

    // --- El estudiante lee el aviso antes del contenido ---------------------
    const alumno = await como(navegador, "prueba.est1", "ESTUDIANTE");
    await alumno.goto(urlSesion, { waitUntil: "networkidle0" });
    comprobar(
      "antes del contenido, el estudiante lee el texto del docente",
      (await hay(alumno, "Antes de empezar")) && (await hay(alumno, TEXTO_PRUEBA))
    );
    comprobar("y la actividad todavía no se muestra", !(await hay(alumno, "Volver al mapa del viaje")));
    await capturar(alumno, "cuidado-puerta");

    await alumno.click("::-p-text(Dejarlo para después)");
    await alumno.waitForFunction(() => location.pathname === "/estudiante/mapa", { timeout: 20_000 });
    comprobar("puede dejarlo para después y volver al mapa", new URL(alumno.url()).pathname === "/estudiante/mapa");

    // --- Pide acompañamiento desde la sesión, dos veces seguidas -----------
    await alumno.goto(urlSesion, { waitUntil: "networkidle0" });
    comprobar("al volver, el aviso sigue ahí: no había decidido continuar", await hay(alumno, "Antes de empezar"));
    await alumno.click("::-p-text(Hablar con mi docente)");
    await alumno.type(`#mensaje-acompanamiento-${sesion.id}`, MENSAJE_1);
    await alumno.click("::-p-text(Enviar a mi docente)");
    const enviado = await avisoDe(alumno, "status");
    comprobar("le confirma que su docente recibió el pedido", enviado.startsWith("Prueba Docente Cuidado recibió tu solicitud"), enviado);

    await alumno.reload({ waitUntil: "networkidle0" });
    await alumno.click("::-p-text(Hablar con mi docente)");
    await alumno.type(`#mensaje-acompanamiento-${sesion.id}`, MENSAJE_2);
    await alumno.click("::-p-text(Enviar a mi docente)");
    await avisoDe(alumno, "status");
    const desdeSesion = await prisma.solicitudAcompanamiento.findMany({ where: { estudianteId: est.id } });
    comprobar(
      "el segundo pedido al poco no se duplica: se suma al primero",
      desdeSesion.length === 1 && desdeSesion[0].mensaje === `${MENSAJE_1}\n\n${MENSAJE_2}`,
      `${desdeSesion.length} pedido(s)`
    );
    comprobar(
      "el pedido va a su docente y dice desde qué sesión",
      desdeSesion[0]?.docenteId === docente.id && desdeSesion[0]?.sesionId === sesion.id
    );

    // --- Continúa, y no se le vuelve a preguntar ----------------------------
    await alumno.click("::-p-text(Entiendo, continuar)");
    await esperarTexto(alumno, "Volver al mapa del viaje");
    comprobar("al continuar ve la actividad, con la opción de pedir ayuda a mano", await hay(alumno, "Sesión con alerta de cuidado"));
    await alumno.reload({ waitUntil: "networkidle0" });
    await esperarTexto(alumno, "Volver al mapa del viaje");
    comprobar("el navegador recuerda que ya decidió continuar", !(await hay(alumno, "Antes de empezar")));

    // --- El botón general, sin mensaje --------------------------------------
    await alumno.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
    await alumno.click("::-p-xpath(//nav//button[.//span[normalize-space()='ALERTA DE CUIDADO']])");
    await esperarTexto(alumno, "¿Necesitas una pausa o hablar con alguien?");
    await alumno.click("::-p-text(Enviar a mi docente)");
    await avisoDe(alumno, "status");
    const general = await prisma.solicitudAcompanamiento.findFirst({ where: { estudianteId: est.id, sesionId: null } });
    comprobar("el botón general envía un pedido real, sin exigir mensaje", general && general.mensaje === null);
    await capturar(alumno, "cuidado-boton-general");

    // En el móvil la barra lateral no está: el botón va en la cabecera.
    await alumno.setViewport({ width: 390, height: 800 });
    await alumno.reload({ waitUntil: "networkidle0" });
    await alumno.click('[aria-label="Alerta de cuidado: pedir acompañamiento"]');
    await esperarTexto(alumno, "¿Necesitas una pausa o hablar con alguien?");
    await alumno.keyboard.press("Escape");
    await alumno.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 10_000 });
    comprobar("en el móvil también se abre, y se cierra con Escape", true);
    await alumno.setViewport({ width: 1280, height: 900 });

    // --- El docente recibe y atiende ----------------------------------------
    // Sin el ancla: ir a la misma página con otro ancla no la vuelve a cargar.
    await doc.goto(`${BASE}/docente/panel`, { waitUntil: "networkidle0" });
    comprobar("el docente ve los dos pedidos esperando", await hay(doc, "2 esperan"));
    comprobar(
      "con el mensaje y el origen de cada uno",
      (await hay(doc, MENSAJE_2)) && (await hay(doc, `Desde la sesión ${sesion.codigo}`)) && (await hay(doc, "Desde el botón general"))
    );
    comprobar(
      "el botón de la barra lateral muestra cuántos esperan",
      Boolean(await doc.$('[aria-label="2 pedidos pendientes"]'))
    );
    await capturar(doc, "cuidado-panel-pedidos");

    await doc.click("::-p-text(Marcar como atendida)");
    await esperarTexto(doc, "1 espera");
    const atendidas = await prisma.solicitudAcompanamiento.count({ where: { docenteId: docente.id, atendidaEn: { not: null } } });
    comprobar("marca un pedido como atendido", atendidas === 1);

    // --- Otro docente no ve los pedidos de este grupo -----------------------
    const otroDoc = await como(navegador, "prueba.otro.docente", "DOCENTE");
    await otroDoc.goto(`${BASE}/docente/panel`, { waitUntil: "networkidle0" });
    comprobar(
      "otro docente no ve los pedidos de un estudiante que no es suyo",
      (await hay(otroDoc, "Ningún estudiante ha pedido acompañamiento")) && !(await hay(otroDoc, MENSAJE_1))
    );
    comprobar("ni le llegan a él", (await prisma.solicitudAcompanamiento.count({ where: { docenteId: otroDocente.id } })) === 0);

    // --- El administrador no tiene el botón ---------------------------------
    const admin = await como(navegador, "prueba.admin", "ADMIN");
    const botonAdmin = await admin.$$("::-p-xpath(//nav//*[contains(., 'ALERTA DE CUIDADO') or contains(., 'ACOMPAÑAMIENTO')])");
    comprobar("el administrador no tiene el botón de alerta", botonAdmin.length === 0);

    // --- El docente quita la alerta -----------------------------------------
    await doc.click(`[aria-label="Quitar la alerta de la sesión ${sesion.codigo}"]`);
    await doc.waitForFunction(() => document.body.innerText.includes("Ninguna sesión tiene alerta"), { timeout: 20_000 });
    const sinAlerta = await prisma.sesion.findUnique({ where: { id: sesion.id } });
    comprobar("quita la alerta y conserva el texto por si la reactiva", !sinAlerta.alertaCuidado && sinAlerta.textoAlerta === TEXTO_PRUEBA);

    const otro = await como(navegador, "prueba.est1", "ESTUDIANTE");
    await otro.goto(urlSesion, { waitUntil: "networkidle0" });
    await esperarTexto(otro, "Volver al mapa del viaje");
    comprobar("sin alerta, la sesión se abre directamente", !(await hay(otro, "Sesión con alerta de cuidado")));
  },
  async () => {
    // La sesión es real: vuelve al estado en que estaba.
    if (sesion && original) await prisma.sesion.update({ where: { id: sesion.id }, data: original });
    const restaurada = sesion && (await prisma.sesion.findUnique({ where: { id: sesion.id } }));
    comprobar(
      "la sesión real queda como estaba",
      !sesion || (restaurada.alertaCuidado === original.alertaCuidado && restaurada.textoAlerta === original.textoAlerta)
    );
  }
);
