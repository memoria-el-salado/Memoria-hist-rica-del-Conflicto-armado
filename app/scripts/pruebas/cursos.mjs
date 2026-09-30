/**
 * 3.1 · Cursos y grupos de trabajo.
 *
 * Un docente crea dos cursos, suma estudiantes, arma grupos y reparte a quien
 * no tiene; da de alta a un estudiante directamente en un curso y cambia a
 * otro de curso. El panel y los reportes se filtran por curso, un debate
 * abierto a un curso solo lo ven sus estudiantes, y el estudiante ve en su
 * mapa su curso y su grupo. Otro docente no puede abrir esos cursos.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:cursos
 */
import { BASE, capturar, como, comprobar, crearCuenta, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const ANIO = new Date().getFullYear();
const PREGUNTA = "¿Quién decidía el uso de la tierra en los Montes de María? (prueba cursos)";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

async function vaciar(pagina, selector) {
  await pagina.$eval(selector, (el) => el.select());
  await pagina.keyboard.press("Backspace");
}

/** Espera un aviso distinto del anterior (el viejo sigue en pantalla hasta que llega el nuevo). */
async function aviso(pagina, anterior = "") {
  await pagina.waitForFunction(
    (previo) => {
      const t = document.querySelector('[role="alert"], [role="status"]')?.textContent.trim();
      return t && t !== previo;
    },
    { timeout: 20_000 },
    anterior
  );
  return pagina.$eval('[role="alert"], [role="status"]', (e) => e.textContent.trim());
}

async function estado(pagina, url) {
  const res = await pagina.goto(`${BASE}${url}`, { waitUntil: "networkidle0" });
  return res.status();
}

const cursoDe = async (id) => (await prisma.user.findUnique({ where: { id }, select: { cursoId: true, grupoId: true } }));

await ejecutar("3.1 · Cursos y grupos de trabajo", async ({ abrir }) => {
  const docente = await crearCuenta("docente", "DOCENTE");
  const [e1, e2, e3] = await Promise.all(
    ["est1", "est2", "est3", "est4"].map((s) => crearCuenta(s, "ESTUDIANTE", { creadoPorId: docente.id, nombre: `Prueba ${s}` }))
  );
  const otroDocente = await crearCuenta("otro.docente", "DOCENTE");
  await crearCuenta("otro.est", "ESTUDIANTE", { creadoPorId: otroDocente.id });

  const navegador = await abrir();
  const doc = await como(navegador, "prueba.docente", "DOCENTE");

  // --- Crear cursos ---------------------------------------------------------
  await doc.goto(`${BASE}/docente/cursos`, { waitUntil: "networkidle0" });
  comprobar("sin cursos, lo dice y avisa de los estudiantes sin curso", (await hay(doc, "Todavía no tienes cursos")) && (await hay(doc, "4 estudiantes tuyos no tienen curso")));

  // React vacía el formulario tras cada envío; igual se vacía a mano, por si acaso.
  async function enviarCurso(nombre, anio) {
    await vaciar(doc, "#nombre-curso");
    await doc.type("#nombre-curso", nombre);
    await vaciar(doc, "#anio-curso");
    await doc.type("#anio-curso", String(anio));
    await doc.click("::-p-text(Crear curso)");
  }

  await enviarCurso("Prueba 10A", ANIO);
  let ultimo = await aviso(doc);
  comprobar("crea un curso con el año en curso", ultimo.startsWith("Curso Prueba 10A creado"), ultimo);

  await enviarCurso("Prueba 10A", ANIO);
  ultimo = await aviso(doc, ultimo);
  comprobar("no deja repetir nombre y año", ultimo === `Ya tienes un curso Prueba 10A en ${ANIO}.`, ultimo);

  // Sin la validación del navegador, para comprobar la del servidor.
  await doc.$eval("form", (f) => f.setAttribute("novalidate", ""));
  await enviarCurso("Prueba 11B", 2019);
  ultimo = await aviso(doc, ultimo);
  comprobar("rechaza un año lectivo fuera de rango", ultimo.startsWith("El año lectivo debe estar entre"), ultimo);

  await enviarCurso("Prueba 11B", ANIO);
  ultimo = await aviso(doc, ultimo);
  const c10 = await prisma.curso.findFirst({ where: { docenteId: docente.id, nombre: "Prueba 10A" } });
  const c11 = await prisma.curso.findFirst({ where: { docenteId: docente.id, nombre: "Prueba 11B" } });
  comprobar("quedan los dos cursos del docente", Boolean(c10 && c11 && c10.anio === ANIO));

  // --- Sumar estudiantes y armar grupos --------------------------------------
  await doc.goto(`${BASE}/docente/cursos/${c10.id}`, { waitUntil: "networkidle0" });
  for (const e of [e1, e2, e3]) {
    await doc.select("#sumar-estudiante", e.id);
    await doc.click("::-p-xpath(//button[normalize-space()='Sumar'])");
    await doc.waitForFunction((id) => !document.querySelector(`#sumar-estudiante option[value="${id}"]`), { timeout: 20_000 }, e.id);
  }
  const en10 = await prisma.user.count({ where: { cursoId: c10.id } });
  comprobar("suma tres estudiantes al curso", en10 === 3, `${en10} en el curso`);

  // Tras cada cambio la página se refresca y los botones vuelven a activarse;
  // como haría una persona, se espera a que estén listos antes de seguir.
  const listo = () =>
    doc.waitForFunction(
      () => !document.querySelector("#nombre-grupo").value && !document.querySelector("#titulo-grupos").closest("section").querySelector("button:disabled"),
      { timeout: 20_000 }
    );

  for (const nombre of ["Los Robles", "Las Ceibas"]) {
    await listo();
    await doc.type("#nombre-grupo", nombre);
    await doc.click("::-p-text(Crear grupo)");
    await esperarTexto(doc, `Grupo ${nombre} creado.`);
  }
  await listo();
  await doc.type("#nombre-grupo", "Los Robles");
  await doc.click("::-p-text(Crear grupo)");
  await esperarTexto(doc, "Ya hay un grupo Los Robles en este curso.");
  comprobar("no deja dos grupos con el mismo nombre en un curso", true);
  await vaciar(doc, "#nombre-grupo");

  const robles = await prisma.grupo.findFirst({ where: { cursoId: c10.id, nombre: "Los Robles" } });
  const ceibas = await prisma.grupo.findFirst({ where: { cursoId: c10.id, nombre: "Las Ceibas" } });
  await listo();
  await doc.select(`#grupo-${e1.id}`, robles.id);
  await esperarTexto(doc, "Prueba est1 está en el grupo Los Robles.");
  comprobar("pone a un estudiante en un grupo", (await cursoDe(e1.id)).grupoId === robles.id);

  await listo();
  await doc.click("::-p-text(Repartir en los grupos)");
  await esperarTexto(doc, "2 estudiantes recibieron grupo.");
  const [g1, g2, g3] = await Promise.all([e1, e2, e3].map((e) => cursoDe(e.id)));
  comprobar(
    "reparte a quienes no tenían, emparejando los grupos",
    g1.grupoId === robles.id && g2.grupoId === ceibas.id && g3.grupoId === robles.id
  );
  await capturar(doc, "cursos-detalle");

  // --- Otro docente no entra -------------------------------------------------
  const otroDoc = await como(navegador, "prueba.otro.docente", "DOCENTE");
  comprobar("otro docente no puede abrir el curso", (await estado(otroDoc, `/docente/cursos/${c10.id}`)) === 404);
  await otroDoc.goto(`${BASE}/docente/cursos`, { waitUntil: "networkidle0" });
  comprobar("ni lo ve en su lista", !(await hay(otroDoc, "Prueba 10A")));

  // --- Alta directa en un curso y cambio de curso ----------------------------
  await doc.goto(`${BASE}/docente/estudiantes`, { waitUntil: "networkidle0" });
  await doc.type("#nombre", "Prueba est5");
  await doc.type("#usuario", "prueba.est5");
  await doc.select("#cursoId", c11.id);
  await doc.click("::-p-text(Crear estudiante)");
  await esperarTexto(doc, "CREDENCIALES PARA ENTREGAR");
  const e5 = await prisma.user.findUnique({ where: { usuario: "prueba.est5" } });
  comprobar("da de alta a un estudiante directamente en un curso", e5?.cursoId === c11.id && e5?.creadoPorId === docente.id);

  await doc.select(`[aria-label="Curso de Prueba est3"]`, c11.id);
  await esperarTexto(doc, "Prueba est3 está en Prueba 11B.");
  const m3 = await cursoDe(e3.id);
  comprobar("cambia a un estudiante de curso, y deja atrás su grupo", m3.cursoId === c11.id && m3.grupoId === null);

  // --- Panel y reportes por curso -------------------------------------------
  await doc.goto(`${BASE}/docente/panel`, { waitUntil: "networkidle0" });
  comprobar("sin filtro, el panel cuenta a todos", await hay(doc, "5 estudiantes en tu grupo"));
  await doc.select("#filtro-curso", c10.id);
  await doc.waitForFunction((id) => location.search === `?curso=${id}`, { timeout: 20_000 }, c10.id);
  await esperarTexto(doc, `2 estudiantes en Prueba 10A · ${ANIO}`);
  comprobar("filtrado, cuenta solo a los del curso", true);
  await capturar(doc, "cursos-panel-filtrado");

  comprobar("un curso ajeno en la dirección se ignora", (await estado(doc, `/docente/panel?curso=nada`)) === 200 && (await hay(doc, "5 estudiantes en tu grupo")));

  await doc.goto(`${BASE}/docente/subpoblaciones?curso=${c11.id}`, { waitUntil: "networkidle0" });
  const filas = await doc.$$eval(".rejilla-subpoblaciones", (fs) => fs.slice(1).map((f) => Number(f.children[1].textContent)));
  comprobar("los reportes también se filtran por curso", filas.reduce((s, n) => s + n, 0) === 2, `${filas.join("+")} estudiantes`);

  // --- Debate abierto a un curso --------------------------------------------
  await doc.goto(`${BASE}/docente/foros`, { waitUntil: "networkidle0" });
  await doc.type("#pregunta", PREGUNTA);
  await doc.select("#cursoId", c10.id);
  await doc.click("::-p-text(Abrir foro)");
  await esperarTexto(doc, PREGUNTA);
  const foro = await prisma.foro.findFirst({ where: { autorId: docente.id } });
  comprobar("abre un debate para un curso", foro?.cursoId === c10.id);

  await estado(doc, `/docente/foros/${foro.id}`);
  comprobar(
    "el reparto de roles solo lista a los estudiantes del curso",
    (await hay(doc, "Prueba est1")) && (await hay(doc, "Prueba est2")) && !(await hay(doc, "Prueba est3")) && !(await hay(doc, "Prueba est4"))
  );

  const est1 = await como(navegador, "prueba.est1", "ESTUDIANTE");
  await est1.goto(`${BASE}/estudiante/foros`, { waitUntil: "networkidle0" });
  comprobar("un estudiante del curso ve el debate", await hay(est1, PREGUNTA));

  const est3 = await como(navegador, "prueba.est3", "ESTUDIANTE");
  await est3.goto(`${BASE}/estudiante/foros`, { waitUntil: "networkidle0" });
  comprobar("uno de otro curso no lo ve", !(await hay(est3, PREGUNTA)));
  comprobar("ni lo abre por su dirección", (await estado(est3, `/estudiante/foros/${foro.id}`)) === 404);

  const est4 = await como(navegador, "prueba.est4", "ESTUDIANTE");
  await est4.goto(`${BASE}/estudiante/foros`, { waitUntil: "networkidle0" });
  comprobar("uno sin curso tampoco", !(await hay(est4, PREGUNTA)));

  // --- El estudiante sabe con quién trabaja ----------------------------------
  await est1.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  comprobar("el estudiante ve en su mapa su curso y su grupo", await hay(est1, `Curso Prueba 10A · ${ANIO} · Grupo Los Robles`));
  await capturar(est1, "cursos-mapa-estudiante");

  // --- Borrar un grupo y un curso -------------------------------------------
  await doc.goto(`${BASE}/docente/cursos/${c10.id}`, { waitUntil: "networkidle0" });
  await doc.click('[aria-label="Eliminar el grupo Las Ceibas"]');
  await esperarTexto(doc, "Grupo Las Ceibas eliminado");
  comprobar("al borrar un grupo, sus miembros quedan sin grupo pero en el curso", (await cursoDe(e2.id)).grupoId === null && (await cursoDe(e2.id)).cursoId === c10.id);

  await doc.goto(`${BASE}/docente/cursos/${c11.id}`, { waitUntil: "networkidle0" });
  await doc.click("::-p-text(Eliminar curso)");
  await doc.waitForFunction(() => location.pathname === "/docente/cursos", { timeout: 20_000 });
  const tras = await Promise.all([e3, e5].map((e) => prisma.user.findUnique({ where: { id: e.id } })));
  comprobar(
    "al borrar un curso, sus estudiantes siguen existiendo, sin curso",
    tras.every((e) => e && e.cursoId === null) && !(await prisma.curso.findUnique({ where: { id: c11.id } }))
  );
});
