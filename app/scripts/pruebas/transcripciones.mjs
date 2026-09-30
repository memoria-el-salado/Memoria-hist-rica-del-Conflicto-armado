/**
 * 1.3 · Transcripciones sincronizadas (CU10).
 *
 * Un audio recién subido no llega al estudiante hasta tener transcripción. El
 * docente la escribe con sus minutos; el estudiante la sigue mientras escucha,
 * con la línea que suena resaltada. Un video subido exige subtítulos con tiempos,
 * que el reproductor carga como pista. Y la auditoría del administrador refleja
 * todo eso a partir de los datos, sin botones que lo finjan.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:transcripciones
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listarRecursos } from "../../src/lib/almacen.ts";
import { BASE, capturar, como, comprobar, crearCuenta, ejecutar, esperarTexto, prisma } from "./entorno.mjs";
import { archivosDePrueba } from "./medios.mjs";

const { audio: AUDIO } = archivosDePrueba();

/** Graba dos segundos de un lienzo animado en WebM, dentro del navegador. */
async function videoWebm(pagina) {
  const base64 = await pagina.evaluate(async () => {
    const lienzo = Object.assign(document.createElement("canvas"), { width: 160, height: 90 });
    const g = lienzo.getContext("2d");
    const grabadora = new MediaRecorder(lienzo.captureStream(15), { mimeType: "video/webm" });
    const trozos = [];
    grabadora.ondataavailable = (e) => trozos.push(e.data);
    let tono = 0;
    const pintar = setInterval(() => {
      g.fillStyle = `hsl(${(tono += 24) % 360} 60% 50%)`;
      g.fillRect(0, 0, 160, 90);
    }, 60);
    grabadora.start();
    await new Promise((r) => setTimeout(r, 2000));
    const fin = new Promise((r) => (grabadora.onstop = r));
    grabadora.stop();
    await fin;
    clearInterval(pintar);
    const bytes = new Uint8Array(await new Blob(trozos, { type: "video/webm" }).arrayBuffer());
    let binario = "";
    for (const b of bytes) binario += String.fromCharCode(b);
    return btoa(binario);
  });
  const ruta = join(tmpdir(), "video-prueba.webm");
  writeFileSync(ruta, Buffer.from(base64, "base64"));
  return ruta;
}

async function cargar(pagina, { titulo, ejeId, sesionId, tipo, archivo, contexto }) {
  await pagina.goto(`${BASE}/docente/contenidos`, { waitUntil: "networkidle0" });
  await pagina.type("#titulo", titulo);
  await pagina.select("#ejeId", ejeId);
  await pagina.select("#sesionId", sesionId);
  await pagina.select("#tipo", tipo);
  await (await pagina.$("#archivo")).uploadFile(archivo);
  await pagina.type("#contexto", contexto);
  await pagina.click("::-p-text(Cargar al módulo)");
  await esperarTexto(pagina, "Añade su transcripción", 180_000);
}

const tarjeta = (titulo) => `//article[.//div[contains(., '${titulo}')]]`;

/**
 * Escribe la transcripción en la tarjeta del recurso y la guarda. Devuelve lo que
 * respondió la pantalla: el aviso de guardado o el mensaje de error.
 */
async function transcribir(pagina, recurso, titulo, texto) {
  await pagina.goto(`${BASE}/docente/contenidos`, { waitUntil: "networkidle0" });
  await pagina.click(`::-p-xpath(${tarjeta(titulo)}//button[normalize-space()='Transcripción'])`);
  await pagina.type(`#transcripcion-${recurso.id}`, texto);
  await pagina.click(`::-p-xpath(${tarjeta(titulo)}//button[normalize-space()='Guardar transcripción'])`);
  await pagina.waitForFunction(
    () =>
      document.body.innerText.includes("Transcripción guardada.") ||
      [...document.querySelectorAll('article [role="alert"]')].some((e) => e.textContent.trim()),
    { timeout: 60_000 }
  );
  return pagina.evaluate(
    () =>
      [...document.querySelectorAll('article [role="alert"]')].map((e) => e.textContent.trim()).find(Boolean) ??
      "Transcripción guardada."
  );
}

let archivosAntes = null;

await ejecutar("1.3 · Transcripciones sincronizadas", async ({ abrir }) => {
  archivosAntes = new Set(await listarRecursos());
  const sesion = await prisma.sesion.findFirst({ where: { publicada: true, eje: { caso: { activo: true } } } });
  if (!sesion) throw new Error("No hay ninguna sesión publicada en el módulo activo.");

  const docente = await crearCuenta("docente", "DOCENTE");
  await crearCuenta("est", "ESTUDIANTE", { creadoPorId: docente.id });
  await crearCuenta("admin", "ADMIN");

  const navegador = await abrir();
  const doc = await como(navegador, "prueba.docente", "DOCENTE");
  const est = await como(navegador, "prueba.est", "ESTUDIANTE");
  const adm = await como(navegador, "prueba.admin", "ADMIN");

  // --- Audio recién subido: pendiente ---------------------------------------
  const TITULO_AUDIO = "Relato de la plaza (prueba)";
  await cargar(doc, {
    titulo: TITULO_AUDIO,
    ejeId: sesion.ejeId,
    sesionId: sesion.id,
    tipo: "AUDIO",
    archivo: AUDIO,
    contexto: "Relato grabado en 2010. Prueba automática.",
  });
  const audio = await prisma.recurso.findFirst({ where: { autorId: docente.id, tipo: "AUDIO" } });
  comprobar("al subir un audio avisa de que falta la transcripción", true);
  // El aviso llega antes que la lista refrescada: se espera a ver la tarjeta.
  await doc.waitForFunction(
    (t) => [...document.querySelectorAll("article")].some((a) => a.innerText.includes(t)),
    { timeout: 30_000 },
    TITULO_AUDIO
  );
  comprobar(
    "la tarjeta del docente dice que los estudiantes no lo ven y por qué",
    await doc.evaluate((t) => {
      const art = [...document.querySelectorAll("article")].find((a) => a.innerText.includes(t));
      return art?.innerText.includes("NO LO VEN LOS ESTUDIANTES") && art.innerText.includes("Falta la transcripción.");
    }, TITULO_AUDIO)
  );

  await est.goto(`${BASE}/estudiante/sesion/${sesion.id}`, { waitUntil: "networkidle0" });
  comprobar("el estudiante no lo ve en la sesión", !(await est.evaluate((t) => document.body.innerText.includes(t), TITULO_AUDIO)));
  comprobar(
    "ni por su dirección",
    (await est.evaluate((u) => fetch(u, { redirect: "manual" }).then((r) => r.status), `/api/recursos/${audio.id}`)) === 403
  );

  await adm.goto(`${BASE}/admin/accesibilidad`, { waitUntil: "networkidle0" });
  const filaAdmin = (t) =>
    adm.evaluate((titulo) => {
      const fila = [...document.querySelectorAll("div.grid")].find((f) => f.innerText.includes(titulo));
      return fila?.innerText ?? "";
    }, t);
  const antes = await filaAdmin(TITULO_AUDIO);
  comprobar("la auditoría lo marca: no lo ven, falta la transcripción", antes.includes("NO LO VEN") && antes.includes("Falta la transcripción."));
  comprobar(
    "y ya no existe el botón que fingía corregirlo",
    !(await adm.evaluate(() => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Corregir")))
  );

  // --- El docente transcribe con sus minutos --------------------------------
  const resultado = await transcribir(doc, audio, TITULO_AUDIO, "0:00 Primera línea del relato.\n0:01 Segunda línea, cuando suena el segundo.");
  comprobar("el docente guarda la transcripción con sus minutos", resultado === "Transcripción guardada.", resultado);
  const guardado = await prisma.recurso.findUnique({ where: { id: audio.id } });
  comprobar("se guarda como WebVTT", guardado.transcripcion.startsWith("WEBVTT"), guardado.transcripcion.split("\n")[2]);
  const sincronizada = await doc
    .waitForFunction(
      (t) => [...document.querySelectorAll("article")].find((a) => a.innerText.includes(t))?.innerText.includes("TRANSCRIPCIÓN SINCRONIZADA"),
      { timeout: 20_000 },
      TITULO_AUDIO
    )
    .then(() => true, () => false);
  comprobar("la tarjeta pasa a transcripción sincronizada", sincronizada);

  // --- El estudiante lo escucha y sigue la lectura ---------------------------
  await est.goto(`${BASE}/estudiante/sesion/${sesion.id}`, { waitUntil: "networkidle0" });
  comprobar("ahora el estudiante sí lo ve", await est.evaluate((t) => document.body.innerText.includes(t), TITULO_AUDIO));
  const lineas = await est.$$eval('ol[aria-label="Transcripción sincronizada"] li', (xs) => xs.map((x) => x.innerText));
  comprobar("con la transcripción debajo, línea a línea", lineas.length === 2 && lineas[1].includes("Segunda línea"), `${lineas.length} líneas`);

  const resaltada = await est.$eval(`audio[src="/api/recursos/${audio.id}"]`, async (a) => {
    a.muted = true;
    await a.play();
    await new Promise((r) => setTimeout(r, 1500));
    a.pause();
    return document.querySelector('li button[aria-current="true"]')?.innerText ?? "";
  });
  comprobar("mientras suena, se resalta la línea que va diciendo", resaltada.includes("Segunda línea"), resaltada.replace(/\s+/g, " "));

  await est.click("::-p-text(Primera línea del relato.)");
  const tiempo = await est.$eval(`audio[src="/api/recursos/${audio.id}"]`, (a) => a.currentTime);
  comprobar("pulsar una línea lleva el audio a ese momento", tiempo < 0.5, `${tiempo.toFixed(2)} s`);
  await capturar(est, "transcripcion-estudiante");

  const vtt = await est.evaluate((u) => fetch(u).then(async (r) => ({ status: r.status, tipo: r.headers.get("content-type"), texto: await r.text() })), `/api/recursos/${audio.id}/subtitulos`);
  comprobar("los subtítulos se sirven en WebVTT", vtt.status === 200 && vtt.tipo.startsWith("text/vtt") && vtt.texto.startsWith("WEBVTT"));

  // --- Un video subido exige tiempos ----------------------------------------
  const TITULO_VIDEO = "Recorrido por la vereda (prueba)";
  const video = await videoWebm(doc);
  await cargar(doc, {
    titulo: TITULO_VIDEO,
    ejeId: sesion.ejeId,
    sesionId: sesion.id,
    tipo: "VIDEO",
    archivo: video,
    contexto: "Recorrido grabado en 2012. Prueba automática.",
  });
  const recursoVideo = await prisma.recurso.findFirst({ where: { autorId: docente.id, tipo: "VIDEO" } });

  const rechazo = await transcribir(doc, recursoVideo, TITULO_VIDEO, "Solo texto, sin tiempos.");
  comprobar(
    "a un video subido no le basta un texto sin tiempos",
    rechazo.includes("subtítulos") && !(await prisma.recurso.findUnique({ where: { id: recursoVideo.id } })).transcripcion,
    rechazo
  );

  const conTiempos = await transcribir(doc, recursoVideo, TITULO_VIDEO, "0:00 Llegamos a la vereda.\n0:01 Aquí estaba la escuela.");
  comprobar("con sus minutos, sí", conTiempos === "Transcripción guardada.", conTiempos);

  await est.goto(`${BASE}/estudiante/sesion/${sesion.id}`, { waitUntil: "networkidle0" });
  const cues = await est.$eval(`video[src="/api/recursos/${recursoVideo.id}"]`, async (v) => {
    const pista = v.querySelector("track");
    if (!pista) return -1;
    if (pista.readyState !== 2) await new Promise((r) => { pista.addEventListener("load", r, { once: true }); setTimeout(r, 10_000); });
    return v.textTracks[0]?.cues?.length ?? 0;
  });
  comprobar("el reproductor del video carga los subtítulos como pista", cues === 2, `${cues} subtítulos`);

  // --- La auditoría lo refleja ----------------------------------------------
  await adm.goto(`${BASE}/admin/accesibilidad`, { waitUntil: "networkidle0" });
  const despues = await filaAdmin(TITULO_VIDEO);
  comprobar("la auditoría ya los da por accesibles", despues.includes("LO VEN") && !despues.includes("NO LO VEN") && despues.includes("SINCRONIZADA"));
  const antesDeValidar = await prisma.auditoriaAccesibilidad.findUnique({ where: { recursoId: recursoVideo.id } });
  await adm.click("::-p-text(Ejecutar validación)");
  await adm.waitForFunction(() => !document.body.innerText.includes("Validando..."), { timeout: 60_000 });
  const tras = await prisma.auditoriaAccesibilidad.findUnique({ where: { recursoId: recursoVideo.id } });
  comprobar(
    "ejecutar la validación recalcula y guarda el resultado",
    tras.transcripcion === true && tras.revisadaEn > antesDeValidar.revisadaEn
  );
  await capturar(adm, "auditoria");
}, async () => {
  if (!archivosAntes) return;
  const { borrarCuentasDePrueba } = await import("./entorno.mjs");
  await borrarCuentasDePrueba();
  const nuevos = (await listarRecursos()).filter((n) => !archivosAntes.has(n));
  comprobar("no quedan archivos de recursos huérfanos en el depósito", nuevos.length === 0, nuevos.join(", "));
});
