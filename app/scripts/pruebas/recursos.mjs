/**
 * 1.2 · Recursos multimedia de verdad (CU06).
 *
 * Un docente sube un audio de testimonio con alerta de cuidado, una imagen y un
 * video de YouTube. El estudiante los encuentra dentro de la sesión: el audio se
 * reproduce de verdad desde el depósito privado, tras aceptar la alerta. Lo de
 * una sesión sin publicar no le llega, ni por la pantalla ni por su dirección.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:recursos
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { infoArchivo, listarRecursos } from "../../src/lib/almacen.ts";
import { BASE, capturar, comprobar, crearCuenta, ejecutar, entrar, esperarTexto, prisma } from "./entorno.mjs";

// --- Archivos de prueba, generados aquí: nada se descarga -----------------

/** Dos segundos de un tono de 440 Hz, en WAV. Lo bastante real para reproducirse. */
function audioWav() {
  const frecuencia = 8000, muestras = frecuencia * 2;
  const datos = Buffer.alloc(muestras * 2);
  for (let i = 0; i < muestras; i++) datos.writeInt16LE(Math.round(8000 * Math.sin((2 * Math.PI * 440 * i) / frecuencia)), i * 2);
  const cabecera = Buffer.alloc(44);
  cabecera.write("RIFF", 0); cabecera.writeUInt32LE(36 + datos.length, 4); cabecera.write("WAVE", 8);
  cabecera.write("fmt ", 12); cabecera.writeUInt32LE(16, 16); cabecera.writeUInt16LE(1, 20); cabecera.writeUInt16LE(1, 22);
  cabecera.writeUInt32LE(frecuencia, 24); cabecera.writeUInt32LE(frecuencia * 2, 28); cabecera.writeUInt16LE(2, 32);
  cabecera.writeUInt16LE(16, 34); cabecera.write("data", 36); cabecera.writeUInt32LE(datos.length, 40);
  return Buffer.concat([cabecera, datos]);
}

/** Una imagen PNG de 16×16 en el terracota de la plataforma. */
function imagenPng() {
  const trozo = (tipo, datos) => {
    const t = Buffer.from(tipo);
    const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, datos])));
    return Buffer.concat([largo, t, datos, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(16, 0); ihdr.writeUInt32BE(16, 4); ihdr[8] = 8; ihdr[9] = 2;
  const fila = Buffer.concat([Buffer.from([0]), Buffer.from(Array(16).fill([0xd9, 0x5d, 0x39]).flat())]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo("IHDR", ihdr),
    trozo("IDAT", deflateSync(Buffer.concat(Array(16).fill(fila)))),
    trozo("IEND", Buffer.alloc(0)),
  ]);
}

const AUDIO = join(tmpdir(), "testimonio-prueba.wav");
const IMAGEN = join(tmpdir(), "foto-prueba.png");
writeFileSync(AUDIO, audioWav());
writeFileSync(IMAGEN, imagenPng());

// --- Ayudas ----------------------------------------------------------------

async function como(navegador, usuario, rol) {
  const contexto = await navegador.createBrowserContext();
  const pagina = await contexto.newPage();
  pagina.on("dialog", (d) => d.accept());
  await entrar(pagina, usuario, rol);
  return pagina;
}

async function esperarRecursos(autorId, cuantos) {
  for (let i = 0; i < 120; i++) {
    if ((await prisma.recurso.count({ where: { autorId } })) >= cuantos) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No se registraron ${cuantos} recursos a tiempo.`);
}

/** Rellena el formulario de nuevo recurso y lo envía. */
async function cargar(pagina, { titulo, ejeId, sesionId = "", tipo, archivo, enlace, contexto, alerta = false }) {
  if (titulo) await pagina.type("#titulo", titulo);
  await pagina.select("#ejeId", ejeId);
  await pagina.select("#sesionId", sesionId);
  await pagina.select("#tipo", tipo);
  if (enlace) {
    await pagina.click("::-p-text(Pegar enlace)");
    await pagina.type("#enlace", enlace);
  } else if (archivo) {
    await (await pagina.$("#archivo")).uploadFile(archivo);
  }
  if (contexto) await pagina.type("#contexto", contexto);
  if (alerta) await pagina.click("::-p-text(Alerta de cuidado:)");
  await pagina.click("::-p-text(Cargar al módulo)");
}

async function aviso(pagina) {
  await pagina.waitForFunction(() => document.querySelector('form [role="alert"]')?.textContent.trim(), { timeout: 30_000 });
  return pagina.$eval('form [role="alert"]', (e) => e.textContent.trim());
}

// --- Prueba ----------------------------------------------------------------

let huerfanosAntes = null;

await ejecutar("1.2 · Recursos multimedia de verdad", async ({ abrir }) => {
  huerfanosAntes = new Set(await listarRecursos());

  // Una sesión publicada del módulo activo y otra, del mismo eje, sin publicar.
  const publicada = await prisma.sesion.findFirst({
    where: { publicada: true, eje: { caso: { activo: true } } },
    include: { eje: true },
  });
  if (!publicada) throw new Error("No hay ninguna sesión publicada en el módulo activo.");
  const sinPublicar = await prisma.sesion.findFirst({ where: { publicada: false, eje: { casoId: publicada.eje.casoId } } });

  const docente = await crearCuenta("docente", "DOCENTE");
  await crearCuenta("est", "ESTUDIANTE", { creadoPorId: docente.id });
  await crearCuenta("docente2", "DOCENTE");

  const navegador = await abrir();
  const doc = await como(navegador, "prueba.docente", "DOCENTE");
  const peticiones = [];
  doc.on("request", (r) => peticiones.push({ metodo: r.method(), url: r.url() }));
  await doc.goto(`${BASE}/docente/contenidos`, { waitUntil: "networkidle0" });

  // --- Lo que se rechaza antes de subir nada --------------------------------
  await cargar(doc, { titulo: "Sin contexto", ejeId: publicada.ejeId, tipo: "AUDIO", archivo: AUDIO });
  comprobar("pide el contexto histórico", (await aviso(doc)) === "El contexto histórico es obligatorio para publicar.");
  comprobar("y no sube nada mientras falte", !peticiones.some((p) => p.metodo === "PUT"));

  await doc.goto(`${BASE}/docente/contenidos`, { waitUntil: "networkidle0" });
  await cargar(doc, { titulo: "Foto como audio", ejeId: publicada.ejeId, tipo: "AUDIO", archivo: IMAGEN, contexto: "Prueba." });
  comprobar("rechaza un archivo que no es del tipo elegido", (await aviso(doc)).startsWith("Para un audio se admiten"));

  // --- Tres recursos buenos y uno de una sesión sin publicar ----------------
  await doc.goto(`${BASE}/docente/contenidos`, { waitUntil: "networkidle0" });
  await cargar(doc, {
    titulo: "Testimonio de retorno (prueba)",
    ejeId: publicada.ejeId,
    sesionId: publicada.id,
    tipo: "AUDIO",
    archivo: AUDIO,
    contexto: "Relato grabado en 2010 durante el retorno a El Salado. Prueba automática.",
    alerta: true,
  });
  await esperarRecursos(docente.id, 1);
  const audio = await prisma.recurso.findFirst({ where: { autorId: docente.id, tipo: "AUDIO" } });
  const info = audio?.archivo ? await infoArchivo(audio.archivo) : null;
  comprobar("el audio queda en el depósito con su tipo", info?.tipo === "audio/wav" && audio.mime === "audio/wav", info?.tipo);
  comprobar("con el tamaño exacto del archivo", info?.tamano === audioWav().length && audio.tamano === info?.tamano, `${info?.tamano} bytes`);
  comprobar(
    "subió directo al depósito, no por el servidor",
    peticiones.some((p) => p.metodo === "PUT" && p.url.includes("/storage/v1/object/upload/sign/"))
  );
  const auditoria = await prisma.auditoriaAccesibilidad.findUnique({ where: { recursoId: audio.id } });
  comprobar("un audio entra a la auditoría sin transcripción", auditoria?.transcripcion === false);

  await doc.goto(`${BASE}/docente/contenidos`, { waitUntil: "networkidle0" });
  await cargar(doc, {
    titulo: "Fotografía de la plaza (prueba)",
    ejeId: publicada.ejeId,
    tipo: "IMAGEN",
    archivo: IMAGEN,
    contexto: "La plaza de El Salado en 2002, antes del retorno. Prueba automática.",
  });
  await esperarRecursos(docente.id, 2);

  await doc.goto(`${BASE}/docente/contenidos`, { waitUntil: "networkidle0" });
  await cargar(doc, {
    titulo: "Documental (prueba)",
    ejeId: publicada.ejeId,
    tipo: "VIDEO",
    enlace: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    contexto: "Documental del CNMH sobre El Salado. Prueba automática.",
  });
  await esperarRecursos(docente.id, 3);

  let oculto = null;
  if (sinPublicar) {
    await doc.goto(`${BASE}/docente/contenidos`, { waitUntil: "networkidle0" });
    await cargar(doc, {
      titulo: "Audio de sesión sin publicar (prueba)",
      ejeId: sinPublicar.ejeId,
      sesionId: sinPublicar.id,
      tipo: "AUDIO",
      archivo: AUDIO,
      contexto: "No debería verlo el estudiante todavía.",
    });
    await esperarRecursos(docente.id, 4);
    oculto = await prisma.recurso.findFirst({ where: { autorId: docente.id, sesionId: sinPublicar.id } });
  }
  await doc.goto(`${BASE}/docente/contenidos`, { waitUntil: "networkidle0" });
  await capturar(doc, "recursos-docente");

  // --- El estudiante, dentro de la sesión -----------------------------------
  const est = await como(navegador, "prueba.est", "ESTUDIANTE");
  await est.goto(`${BASE}/estudiante/sesion/${publicada.id}`, { waitUntil: "networkidle0" });
  const texto = await est.evaluate(() => document.body.innerText);
  comprobar("ve el material de la sesión", texto.includes("MATERIAL DE LA SESIÓN") && texto.includes("Testimonio de retorno (prueba)"));
  comprobar("y el que el docente cargó para todo el eje", texto.includes("Fotografía de la plaza (prueba)") && texto.includes("Documental (prueba)"));
  comprobar("pero no el de una sesión sin publicar", !texto.includes("Audio de sesión sin publicar"));

  comprobar(
    "el audio con alerta muestra primero el aviso y no se carga",
    texto.includes("ALERTA DE CUIDADO") && !(await est.$(`audio[src="/api/recursos/${audio.id}"]`))
  );
  await est.click("::-p-text(Ver el recurso)");
  await est.waitForSelector(`audio[src="/api/recursos/${audio.id}"]`);
  const duracion = await est.$eval(`audio[src="/api/recursos/${audio.id}"]`, (a) =>
    new Promise((ok) => {
      a.preload = "metadata";
      a.addEventListener("loadedmetadata", () => ok(a.duration), { once: true });
      a.addEventListener("error", () => ok(-1), { once: true });
      a.load();
    })
  );
  comprobar("al aceptarlo, el audio se reproduce desde el depósito privado", Math.abs(duracion - 2) < 0.2, `${duracion?.toFixed?.(2)} s`);

  const anchoImagen = await est.$eval('img[alt^="La plaza de El Salado"]', (img) =>
    img.complete ? img.naturalWidth : new Promise((ok) => (img.onload = () => ok(img.naturalWidth)))
  );
  comprobar("la imagen se ve, con su contexto como texto alternativo", anchoImagen === 16);
  const iframe = await est.$eval("iframe", (f) => f.src).catch(() => "");
  comprobar("el video de YouTube se incrusta sin cookies", iframe === "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  await capturar(est, "recursos-estudiante");

  // --- Por su dirección -----------------------------------------------------
  const estado = (url) => est.evaluate((u) => fetch(u, { redirect: "manual" }).then((r) => r.status || r.type), url);
  const alDeposito = await est.evaluate(
    (u) => fetch(u, { headers: { Range: "bytes=0-99" } }).then((r) => ({ status: r.status, url: r.url })),
    `/api/recursos/${audio.id}`
  );
  comprobar(
    "la dirección del recurso lleva al depósito y admite pedirlo por partes",
    alDeposito.status === 206 && alDeposito.url.includes("/storage/v1/object/sign/")
  );
  if (oculto) {
    comprobar("un recurso de sesión sin publicar responde 403 al estudiante", (await estado(`/api/recursos/${oculto.id}`)) === 403);
  }
  const anonimo = await (await navegador.createBrowserContext()).newPage();
  const sinSesion = await anonimo.goto(`${BASE}/api/recursos/${audio.id}`);
  comprobar("sin sesión responde 401", sinSesion.status() === 401);

  // --- Solo el autor lo cambia o lo retira ----------------------------------
  const doc2 = await como(navegador, "prueba.docente2", "DOCENTE");
  await doc2.goto(`${BASE}/docente/contenidos`, { waitUntil: "networkidle0" });
  const retirables = await doc2.$$("::-p-text(Retirar)");
  comprobar(
    "otro docente ve el material del módulo pero no puede retirarlo",
    (await doc2.evaluate(() => document.body.innerText.includes("Testimonio de retorno (prueba)"))) && retirables.length === 0
  );

  const imagen = await prisma.recurso.findFirst({ where: { autorId: docente.id, tipo: "IMAGEN" } });
  await doc.goto(`${BASE}/docente/contenidos`, { waitUntil: "networkidle0" });
  const botones = await doc.$$("::-p-xpath(//article[.//div[contains(., 'Fotografía de la plaza (prueba)')]]//button[normalize-space()='Retirar'])");
  await botones[0].click();
  await esperarTexto(doc, "se retiró del módulo");
  comprobar(
    "el autor retira un recurso y su archivo se borra del depósito",
    !(await prisma.recurso.findUnique({ where: { id: imagen.id } })) && !(await infoArchivo(imagen.archivo))
  );
}, async () => {
  if (!huerfanosAntes) return;
  // La limpieza común borra los recursos de las cuentas de prueba con sus archivos.
  const { borrarCuentasDePrueba } = await import("./entorno.mjs");
  await borrarCuentasDePrueba();
  const nuevos = (await listarRecursos()).filter((n) => !huerfanosAntes.has(n));
  comprobar("no quedan archivos de recursos huérfanos en el depósito", nuevos.length === 0, nuevos.join(", "));
});
