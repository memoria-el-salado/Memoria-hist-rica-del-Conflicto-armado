/**
 * 2.1 · Cartografía con voz, foto y en grupo (CU02).
 *
 * Un estudiante marca un lugar, graba el relato con el micrófono (simulado), le
 * suma una foto grande que el navegador reduce, y lo siembra a nombre de su
 * grupo. Su compañero de grupo lo ve y el lugar le cuenta para el avance; uno
 * del mismo curso lo ve; uno sin curso y uno de otro docente no lo ven ni
 * pueden abrir su audio o su foto. El autor lo retira, con sus archivos.
 *
 * Se usa la sesión de cartografía publicada del módulo activo; lo que se
 * siembra se borra al terminar.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:cartografia
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { infoArchivo } from "../../src/lib/almacen.ts";
import { BASE, capturar, como, comprobar, crearCuenta, ejecutar, esperarTexto, MICROFONO_SIMULADO, prisma } from "./entorno.mjs";
import { imagenPng } from "./medios.mjs";

const LUGAR = "La plaza de El Salado (prueba)";
const LUGAR_2 = "El arroyo detrás de la escuela (prueba)";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

/** Abre la sesión y, si tiene alerta de cuidado, decide continuar. */
async function abrirSesion(pagina, sesionId) {
  await pagina.goto(`${BASE}/estudiante/sesion/${sesionId}`, { waitUntil: "networkidle0" });
  if (await hay(pagina, "Antes de empezar")) await pagina.click("::-p-text(Entiendo, continuar)");
  await pagina.waitForSelector(".leaflet-container", { timeout: 30_000 });
}

/** Marca un punto haciendo clic en el mapa, algo desplazado del centro. */
async function marcarEnMapa(pagina, dx = 40, dy = -30) {
  const caja = await (await pagina.$(".leaflet-container")).boundingBox();
  await pagina.mouse.click(caja.x + caja.width / 2 + dx, caja.y + caja.height / 2 + dy);
  await esperarTexto(pagina, "Lat ");
}

async function aviso(pagina) {
  await pagina.waitForSelector('[role="alert"], [role="status"]', { timeout: 60_000 });
  return pagina.$eval('[role="alert"], [role="status"]', (e) => e.textContent.trim());
}

/** Estado de una petición hecha desde la página, con la sesión de quien la hace. */
const pedir = (pagina, url) =>
  pagina.evaluate(async (u) => {
    const r = await fetch(u);
    return { estado: r.status, tipo: r.headers.get("content-type") ?? "" };
  }, url);

const progresoDe = async (pagina) => {
  await pagina.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  return Number((await pagina.evaluate(() => document.body.innerText.match(/Progreso (\d+)%/)?.[1])) ?? -1);
};

await ejecutar("2.1 · Cartografía con voz, foto y en grupo", async ({ abrir }) => {
  const sesion = await prisma.sesion.findFirst({
    where: { publicada: true, pantalla: "cartografia", eje: { caso: { activo: true } } },
    orderBy: [{ eje: { orden: "asc" } }, { orden: "asc" }],
  });
  if (!sesion) throw new Error("No hay una sesión de cartografía publicada en el módulo activo.");
  console.log(`  (sesión de prueba: ${sesion.codigo} ${sesion.titulo})\n`);

  const docente = await crearCuenta("docente", "DOCENTE");
  const curso = await prisma.curso.create({ data: { nombre: "Prueba 9A", anio: 2026, docenteId: docente.id } });
  const grupo = await prisma.grupo.create({ data: { nombre: "Prueba Robles", cursoId: curso.id } });
  const enGrupo = { creadoPorId: docente.id, cursoId: curso.id, grupoId: grupo.id };
  const e1 = await crearCuenta("est1", "ESTUDIANTE", { ...enGrupo, nombre: "Prueba est1" });
  await crearCuenta("est2", "ESTUDIANTE", { ...enGrupo, nombre: "Prueba est2" });
  await crearCuenta("est3", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: curso.id, nombre: "Prueba est3" });
  await crearCuenta("est4", "ESTUDIANTE", { creadoPorId: docente.id, nombre: "Prueba est4" });
  const otroDocente = await crearCuenta("otro.docente", "DOCENTE");
  await crearCuenta("otro.est", "ESTUDIANTE", { creadoPorId: otroDocente.id });

  // Una foto del tamaño de las de un teléfono.
  const fotoGrande = join(tmpdir(), "foto-lugar-prueba.png");
  writeFileSync(fotoGrande, imagenPng(3000, 2000));

  const navegador = await abrir(MICROFONO_SIMULADO);

  // --- El estudiante marca, graba y fotografía ------------------------------
  const est1 = await como(navegador, "prueba.est1", "ESTUDIANTE");
  await abrirSesion(est1, sesion.id);
  await marcarEnMapa(est1);
  await est1.type("#lugar", LUGAR);
  await est1.click("::-p-text(Sembrar en el mapa)");
  comprobar("sin relato escrito ni grabado, pide uno", (await aviso(est1)) === "Cuenta qué te evoca el lugar: escríbelo o grábalo.");

  await est1.click("::-p-text(Grabar relato en audio)");
  await esperarTexto(est1, "Detener");
  await new Promise((r) => setTimeout(r, 2500));
  await est1.click("::-p-text(Detener)");
  await esperarTexto(est1, "Relato grabado");
  comprobar("graba el relato con el micrófono y deja escucharlo", Boolean(await est1.$('audio[aria-label="Escuchar tu relato grabado"]')));

  await (await est1.$("#foto-lugar")).uploadFile(fotoGrande);
  await esperarTexto(est1, "Foto lista");
  await capturar(est1, "cartografia-formulario");

  await est1.click("::-p-text(De mi grupo · Prueba Robles)");
  await est1.click("::-p-text(Sembrar en el mapa)");
  await esperarTexto(est1, "Lugar sembrado en nombre de tu grupo.", 120_000);

  const marca = await prisma.marcaCartografia.findFirst({ where: { autorId: e1.id } });
  comprobar(
    "la marca guarda la grabación, la foto y el grupo",
    Boolean(marca?.audioArchivo?.startsWith("cartografia/") && marca.foto?.startsWith("cartografia/") && marca.grupoId === grupo.id),
    `${marca?.audioMime} · ${marca?.audioSegundos} s`
  );
  comprobar("con su duración real", (marca?.audioSegundos ?? 0) >= 2);
  const infoFoto = marca?.foto ? await infoArchivo(marca.foto) : null;
  comprobar("la foto llega reducida a JPEG", infoFoto?.tipo === "image/jpeg", `${Math.round((infoFoto?.tamano ?? 0) / 1024)} KB`);

  await est1.reload({ waitUntil: "networkidle0" });
  await est1.waitForSelector(`img[alt="Foto de ${LUGAR}"]`);
  const lado = await est1.$eval(`img[alt="Foto de ${LUGAR}"]`, async (img) => {
    if (!img.complete) await new Promise((r) => (img.onload = r));
    return Math.max(img.naturalWidth, img.naturalHeight);
  });
  comprobar("y a 1600 px de lado, como mucho", lado > 0 && lado <= 1600, `${lado} px`);
  const audio = await pedir(est1, `/api/cartografia/${marca.id}/audio`);
  comprobar("el audio se sirve desde el depósito privado", audio.estado === 200 && audio.tipo.startsWith("audio/"), audio.tipo);
  await capturar(est1, "cartografia-marca");

  // --- El compañero de grupo -------------------------------------------------
  const est2 = await como(navegador, "prueba.est2", "ESTUDIANTE");
  await abrirSesion(est2, sesion.id);
  comprobar(
    "el compañero de grupo ve el lugar, a nombre del grupo",
    (await hay(est2, LUGAR)) && (await hay(est2, "Grupo Prueba Robles")) && (await hay(est2, "sembrado por Prueba est1"))
  );
  comprobar("con la nota de que el relato es solo en audio", await hay(est2, "Relato solo en audio."));
  comprobar("pero no puede retirarlo", !(await est2.$(`[aria-label="Retirar ${LUGAR}"]`)));
  comprobar("y el lugar le cuenta en su avance", (await progresoDe(est2)) > 0);

  // --- Del mismo curso, sin grupo --------------------------------------------
  const est3 = await como(navegador, "prueba.est3", "ESTUDIANTE");
  await abrirSesion(est3, sesion.id);
  comprobar("un compañero de curso fuera del grupo lo ve", await hay(est3, LUGAR));
  comprobar("no tiene la opción de sembrar a nombre de un grupo", !(await hay(est3, "¿DE QUIÉN ES ESTE LUGAR?")));
  comprobar("y el lugar del grupo no le cuenta a él", (await progresoDe(est3)) === 0);

  await abrirSesion(est3, sesion.id);
  await marcarEnMapa(est3, -60, 40);
  await est3.type("#lugar", LUGAR_2);
  await est3.type("#relato", "Ahí nos bañábamos después de clase.");
  await est3.click("::-p-text(Sembrar en el mapa)");
  await esperarTexto(est3, "Lugar sembrado en la cartografía colectiva.");
  comprobar("también se puede sembrar solo con el relato escrito", Boolean(await prisma.marcaCartografia.findFirst({ where: { lugar: LUGAR_2, audioArchivo: null, foto: null } })));

  // --- Fuera del curso ------------------------------------------------------
  const est4 = await como(navegador, "prueba.est4", "ESTUDIANTE");
  await abrirSesion(est4, sesion.id);
  comprobar("un estudiante del mismo docente sin curso no lo ve", !(await hay(est4, LUGAR)));
  comprobar("ni abre su foto", (await pedir(est4, `/api/cartografia/${marca.id}/foto`)).estado === 404);

  const otro = await como(navegador, "prueba.otro.est", "ESTUDIANTE");
  await abrirSesion(otro, sesion.id);
  comprobar("uno de otro docente no lo ve", !(await hay(otro, LUGAR)) && !(await hay(otro, LUGAR_2)));
  comprobar("ni abre su audio", (await pedir(otro, `/api/cartografia/${marca.id}/audio`)).estado === 404);

  const doc = await como(navegador, "prueba.docente", "DOCENTE");
  const fotoDocente = await pedir(doc, `/api/cartografia/${marca.id}/foto`);
  comprobar("el docente del autor sí abre la foto", fotoDocente.estado === 200 && fotoDocente.tipo === "image/jpeg");

  // --- El autor retira el lugar ---------------------------------------------
  await abrirSesion(est1, sesion.id);
  comprobar("el autor ve el lugar de su compañero de curso", await hay(est1, LUGAR_2));
  await est1.click(`[aria-label="Retirar ${LUGAR}"]`);
  await esperarTexto(est1, "Lugar retirado.");
  const [quedaMarca, quedaAudio, quedaFoto] = await Promise.all([
    prisma.marcaCartografia.findUnique({ where: { id: marca.id } }),
    infoArchivo(marca.audioArchivo),
    infoArchivo(marca.foto),
  ]);
  comprobar("retirar borra el lugar, su grabación y su foto", !quedaMarca && !quedaAudio && !quedaFoto);
});
