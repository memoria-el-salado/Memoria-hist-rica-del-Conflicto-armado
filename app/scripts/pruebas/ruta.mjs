/**
 * Ajustes por la retroalimentación de docentes de ciencias sociales.
 *
 * El mapa dice cómo funciona el viaje y por dónde seguir, abre los ejes en su
 * sitio y lleva la vista hasta ellos. La sesión va de la información a la
 * reflexión, la actividad y la retroalimentación: la ruta de cuatro pasos, el
 * material antes de la actividad (o dónde encontrarlo), el espacio de la
 * retroalimentación y la siguiente sesión. La marca del menú lleva al inicio.
 *
 * La sesión se prueba sobre un módulo de prueba inactivo, que se borra al
 * terminar; el mapa, sobre el módulo activo, sin tocarlo.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:ruta
 */
import { BASE, capturar, como, comprobar, crearCuenta, crearModuloDePrueba, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

await ejecutar("Ruta del viaje y de la sesión", async ({ abrir }) => {
  const modulo = await crearModuloDePrueba([
    { pantalla: "zona", titulo: "Lectura con material (prueba)" },
    { pantalla: "meubico", titulo: "Reflexión sin material (prueba)" },
  ]);
  const [s1, s2] = modulo.sesiones;
  await prisma.sesion.update({ where: { id: s1 }, data: { contenido: "Un párrafo de la guía para leer en la sesión de prueba, con suficiente texto." } });
  // El material solo lo ve el estudiante en el módulo activo: el OVA se vincula
  // a una sesión publicada de ese módulo y se borra con la cuenta del docente.
  const publicada = await prisma.sesion.findFirst({
    where: { publicada: true, eje: { caso: { activo: true } } },
    orderBy: [{ eje: { orden: "asc" } }, { orden: "asc" }],
    select: { id: true, ejeId: true },
  });
  if (!publicada) throw new Error("No hay ninguna sesión publicada en el módulo activo.");

  const docente = await crearCuenta("docente", "DOCENTE");
  const est = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id });
  await prisma.recurso.create({
    data: {
      titulo: "OVA de prueba",
      contexto: "Un objeto virtual de aprendizaje sobre la tierra en los Montes de María (prueba).",
      tipo: "SIMULADOR",
      enlace: "https://example.org/ova-de-prueba",
      ejeId: publicada.ejeId,
      sesionId: publicada.id,
      autorId: docente.id,
    },
  });

  const navegador = await abrir();
  const p = await como(navegador, "prueba.est1", "ESTUDIANTE");

  // --- El mapa ------------------------------------------------------------------------
  await p.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  comprobar("el mapa explica cómo funciona el viaje", (await hay(p, "CÓMO FUNCIONA TU VIAJE")) && (await hay(p, "Lee la retroalimentación")));
  comprobar("y dice por dónde seguir", (await hay(p, "CONTINÚA TU VIAJE")) || (await hay(p, "VAS AL DÍA")));
  comprobar("ya no muestra un mapa de casos vacío", !(await hay(p, "Todavía no hay casos de estudio ubicados")));
  comprobar("cada sesión dice cuánto material trae", await hay(p, "Material: "));

  const botones = await p.$$('section[aria-labelledby="titulo-ruta"] button[aria-expanded]');
  comprobar("los ejes son una ruta en orden", botones.length > 0, `${botones.length} ejes`);
  if (await hay(p, "CONTINÚA TU VIAJE")) {
    comprobar("el eje por donde sigue el viaje llega abierto, con la sesión marcada", (await p.$('button[aria-expanded="true"]')) !== null && (await hay(p, "Continúa aquí")));
  }

  // Abre el último eje: sus sesiones aparecen debajo de él y la vista baja hasta allí.
  const ultimo = botones.at(-1);
  if ((await ultimo.evaluate((b) => b.getAttribute("aria-expanded"))) === "true") await ultimo.click();
  await p.evaluate(() => window.scrollTo(0, 0));
  await ultimo.click();
  await p.waitForFunction((b) => b.getAttribute("aria-expanded") === "true", { timeout: 10_000 }, ultimo);
  await p.waitForFunction(
    (b) => {
      const top = b.getBoundingClientRect().top;
      return top >= 0 && top < innerHeight * 0.5;
    },
    { timeout: 10_000 },
    ultimo
  );
  const panel = await ultimo.evaluate((b) => document.getElementById(b.getAttribute("aria-controls"))?.innerText ?? "");
  comprobar("al abrir un eje, sus sesiones aparecen debajo de él y la vista baja hasta allí", panel.length > 0);
  await capturar(p, "ruta-mapa");
  await ultimo.click();
  await p.waitForFunction((b) => b.getAttribute("aria-expanded") === "false", { timeout: 10_000 }, ultimo);
  comprobar("y se vuelve a cerrar", true);

  await p.click('a[aria-label="Ruta Pedagógica: ir al inicio"]');
  await p.waitForFunction(() => location.pathname === "/estudiante/mapa", { timeout: 20_000 });
  comprobar("«Ruta Pedagógica» lleva al inicio", true);

  // --- La sesión ----------------------------------------------------------------------
  await p.goto(`${BASE}/estudiante/sesion/${s1}`, { waitUntil: "networkidle0" });
  const pasos = await p.$$eval('nav[aria-label="Ruta de la sesión"] li', (ls) => ls.map((l) => l.innerText.replace(/\s+/g, " ")));
  comprobar(
    "la sesión muestra la ruta de cuatro pasos",
    pasos.length === 4 && pasos[0].includes("Explora") && pasos[3].includes("Retroalimentación"),
    pasos.join(" | ")
  );
  comprobar("sin material, el primer paso remite al texto de la guía", pasos[0].includes("El texto de la guía del CNMH"));
  const orden = await p.evaluate(() => {
    const material = document.getElementById("material-sesion");
    const actividad = document.getElementById("actividad");
    return Boolean(material && actividad && material.compareDocumentPosition(actividad) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  comprobar("el texto para explorar va antes de la actividad", orden);
  comprobar("la retroalimentación tiene su espacio aunque aún no haya", await hay(p, "RETROALIMENTACIÓN DE TU DOCENTE"));
  const siguiente = await p.$eval('nav[aria-label="Siguiente paso del viaje"]', (n) => n.querySelector(`a[href*="/estudiante/sesion/"]`)?.getAttribute("href") ?? "");
  comprobar("al final lleva a la siguiente sesión", siguiente.endsWith(s2));
  await capturar(p, "ruta-sesion");

  await prisma.comentario.create({ data: { docenteId: docente.id, estudianteId: est.id, sesionId: s1, texto: "Buena lectura (prueba)." } });
  await p.reload({ waitUntil: "networkidle0" });
  await esperarTexto(p, "COMENTARIOS DE TU DOCENTE");
  const cuarto = await p.$eval('nav[aria-label="Ruta de la sesión"] li:last-child', (l) => l.innerText);
  comprobar("con un comentario del docente, el cuarto paso lo cuenta", cuarto.includes("1 comentario de tu docente"));

  // Con material: el OVA del docente, antes de la actividad.
  await p.goto(`${BASE}/estudiante/sesion/${publicada.id}`, { waitUntil: "networkidle0" });
  const explora = await p.$eval('nav[aria-label="Ruta de la sesión"] li', (l) => l.innerText);
  comprobar("con material, el primer paso lo cuenta", /\d+ recursos? para leer, ver o escuchar/.test(explora), explora.replace(/\s+/g, " "));
  comprobar(
    "el OVA se vincula como recurso interactivo",
    (await hay(p, "RECURSO INTERACTIVO")) && (await p.$('a[href="https://example.org/ova-de-prueba"]')) !== null
  );
  const materialAntes = await p.evaluate(() => {
    const material = document.getElementById("material-sesion");
    const actividad = document.getElementById("actividad");
    return Boolean(material && actividad && material.compareDocumentPosition(actividad) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  comprobar("y el material va antes de la actividad", materialAntes);
  await capturar(p, "ruta-sesion-material");

  await p.goto(`${BASE}/estudiante/sesion/${s2}`, { waitUntil: "networkidle0" });
  comprobar("sin material ni texto, la sesión dice dónde estará la información", (await hay(p, "PARA EXPLORAR")) && (await hay(p, "lo presentará en clase")));
  comprobar("y en la última sesión no ofrece una siguiente", await hay(p, "Es la última sesión publicada del módulo."));

  await p.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await p.reload({ waitUntil: "networkidle0" });
  comprobar("la sesión no se desborda en el móvil", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  await p.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  comprobar("ni el mapa", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
});
