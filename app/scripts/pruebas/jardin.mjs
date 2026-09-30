/**
 * 2.2 · Jardín con creaciones (CU04).
 *
 * Un estudiante siembra tres flores: con un poema, con un dibujo hecho en el
 * lienzo y con la foto de una obra en papel. Al abrir cada flor se ve su
 * creación. Su compañero de curso las ve con su nombre; un estudiante de otro
 * curso y uno de otro docente no las ven ni abren sus imágenes; el docente sí.
 * El autor retira una, con su imagen.
 *
 * Para no publicar una sesión real, la prueba crea un módulo inactivo con una
 * sesión de jardín, que ningún estudiante real ve, y lo borra al terminar.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:jardin
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { infoArchivo } from "../../src/lib/almacen.ts";
import { BASE, capturar, como, comprobar, crearCuenta, crearModuloDePrueba, ejecutar, esperarTexto, prisma } from "./entorno.mjs";
import { imagenPng } from "./medios.mjs";

const POEMA = ["Tu voz sigue en la plaza", "cuando llueve sobre El Salado,", "y el tambor la trae de vuelta."];
const DESCRIPCION = "Una escuela con un árbol de mango y niños jugando";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

const pedir = (pagina, url) =>
  pagina.evaluate(async (u) => {
    const r = await fetch(u);
    return { estado: r.status, tipo: r.headers.get("content-type") ?? "" };
  }, url);

async function vaciar(pagina, selector) {
  await pagina.$eval(selector, (el) => el.select());
  await pagina.keyboard.press("Backspace");
}

/** Abre el formulario, llena lo común y elige la creación. */
async function empezarFlor(pagina, nombre, creacion) {
  if (!(await pagina.$("#nombre"))) await pagina.click("::-p-text(Sembrar una Memoria)");
  await pagina.waitForSelector("#nombre");
  await vaciar(pagina, "#nombre");
  await pagina.type("#nombre", nombre);
  await vaciar(pagina, "#legado");
  await pagina.type("#legado", "Maestra de la escuela; enseñó a leer a medio pueblo.");
  await pagina.click(`::-p-xpath(//button[normalize-space()="${creacion}"])`);
}

/** Siembra y espera el aviso que se indica: el de éxito nombra a la persona honrada. */
async function sembrar(pagina, esperado) {
  await pagina.click("::-p-text(Sembrar en el jardín)");
  await pagina.waitForFunction(
    (t) => [...document.querySelectorAll('[role="alert"], [role="status"]')].some((e) => e.textContent.includes(t)),
    { timeout: 60_000 },
    esperado
  );
  return true;
}

let sesionId;
let casoId;

await ejecutar(
  "2.2 · Jardín con creaciones",
  async ({ abrir }) => {
    ({ casoId, sesionId } = await crearModuloDePrueba("jardin"));

    const docente = await crearCuenta("docente", "DOCENTE");
    const curso = await prisma.curso.create({ data: { nombre: "Prueba 8B", anio: 2026, docenteId: docente.id } });
    const e1 = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: curso.id, nombre: "Prueba est1" });
    await crearCuenta("est2", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: curso.id, nombre: "Prueba est2" });
    await crearCuenta("est3", "ESTUDIANTE", { creadoPorId: docente.id, nombre: "Prueba est3" });
    const otro = await crearCuenta("otro.docente", "DOCENTE");
    await crearCuenta("otro.est", "ESTUDIANTE", { creadoPorId: otro.id });

    const obra = join(tmpdir(), "obra-prueba.png");
    writeFileSync(obra, imagenPng(2000, 1500));

    const navegador = await abrir();
    const url = `${BASE}/estudiante/sesion/${sesionId}`;

    // --- Un poema ---------------------------------------------------------------
    const est1 = await como(navegador, "prueba.est1", "ESTUDIANTE");
    await est1.goto(url, { waitUntil: "networkidle0" });
    await empezarFlor(est1, "Prueba Margoth (poema)", "Un poema");
    comprobar("un poema sin versos no se siembra", await sembrar(est1, "Escribe el poema antes de sembrar."));

    await est1.type("#texto-creacion", POEMA.join("\n"));
    comprobar("con sus versos, sí", await sembrar(est1, "La flor de Prueba Margoth (poema) ya está en el jardín."));
    const poema = await prisma.florJardin.findFirst({ where: { autorId: e1.id, creacion: "POEMA" } });
    comprobar("el poema guarda sus saltos de línea", poema?.texto === POEMA.join("\n"));

    // --- Un dibujo ------------------------------------------------------------
    await empezarFlor(est1, "Prueba Margoth (dibujo)", "Un dibujo");
    comprobar("un dibujo en blanco no se siembra", await sembrar(est1, "Haz tu dibujo antes de sembrar."));

    const lienzo = await est1.$("canvas");
    // Al centro de la pantalla: arriba del todo quedaría bajo la cabecera fija.
    await lienzo.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const caja = await lienzo.boundingBox();
    await est1.mouse.move(caja.x + 60, caja.y + 60);
    await est1.mouse.down();
    for (let i = 1; i <= 12; i++) await est1.mouse.move(caja.x + 60 + i * 25, caja.y + 60 + Math.sin(i) * 40);
    await est1.mouse.up();
    await est1.waitForFunction(() => ![...document.querySelectorAll("button")].find((b) => b.textContent === "Deshacer")?.disabled);
    await est1.type("#descripcion-imagen", DESCRIPCION);
    await capturar(est1, "jardin-dibujo");
    comprobar("dibujado en el lienzo, se siembra", await sembrar(est1, "La flor de Prueba Margoth (dibujo) ya está en el jardín."));
    const dibujo = await prisma.florJardin.findFirst({ where: { autorId: e1.id, creacion: "DIBUJO" } });
    const infoDibujo = dibujo?.imagen ? await infoArchivo(dibujo.imagen) : null;
    comprobar("el dibujo llega al depósito en PNG, con su descripción", infoDibujo?.tipo === "image/png" && dibujo.descripcion === DESCRIPCION, `${Math.round((infoDibujo?.tamano ?? 0) / 1024)} KB`);

    // --- La foto de una obra en papel -----------------------------------------
    await empezarFlor(est1, "Prueba Margoth (obra)", "Foto de un dibujo o una obra");
    await (await est1.$("#foto-obra")).uploadFile(obra);
    await esperarTexto(est1, "Foto lista");
    comprobar("la foto de una obra se siembra", await sembrar(est1, "La flor de Prueba Margoth (obra) ya está en el jardín."));
    const foto = await prisma.florJardin.findFirst({ where: { autorId: e1.id, creacion: "FOTO" } });
    comprobar("reducida a JPEG", foto?.imagen?.endsWith(".jpg") && (await infoArchivo(foto.imagen))?.tipo === "image/jpeg");

    // --- Abrir una flor ---------------------------------------------------------
    await est1.reload({ waitUntil: "networkidle0" });
    comprobar("el jardín muestra las tres flores con su creación", (await est1.$$('[aria-haspopup="dialog"]')).length === 3 && (await hay(est1, "Poema")));
    await est1.click('[aria-label^="Prueba Margoth (poema)"]');
    await est1.waitForSelector("dialog[open]");
    const textoDialogo = await est1.$eval("dialog[open]", (d) => d.innerText);
    comprobar("al abrir la flor se lee el poema, verso a verso", POEMA.every((v) => textoDialogo.includes(v)) && textoDialogo.includes(`${POEMA[0]}\n${POEMA[1]}`));
    await capturar(est1, "jardin-poema");
    await est1.keyboard.press("Escape");
    await est1.waitForFunction(() => !document.querySelector("dialog[open]"));
    comprobar("y se cierra con Escape", true);

    // --- El compañero de curso ------------------------------------------------
    const est2 = await como(navegador, "prueba.est2", "ESTUDIANTE");
    await est2.goto(url, { waitUntil: "networkidle0" });
    await est2.click('[aria-label^="Prueba Margoth (dibujo)"]');
    await est2.waitForSelector(`dialog[open] img[alt="${DESCRIPCION}"]`);
    const ancho = await est2.$eval("dialog[open] img", async (img) => {
      if (!img.complete) await new Promise((r) => (img.onload = r));
      return img.naturalWidth;
    });
    comprobar("un compañero de curso abre el dibujo, con su descripción como texto alternativo", ancho === 900, `${ancho} px`);
    comprobar("con el nombre de quien lo sembró", await hay(est2, "Sembrada por Prueba est1"));
    comprobar("pero no puede retirarlo", !(await hay(est2, "Retirar mi flor")));
    await capturar(est2, "jardin-dibujo-abierto");

    // --- Fuera del curso ------------------------------------------------------
    const est3 = await como(navegador, "prueba.est3", "ESTUDIANTE");
    await est3.goto(url, { waitUntil: "networkidle0" });
    comprobar("un estudiante de otro curso no ve las flores", await hay(est3, "No hay memorias sembradas"));
    comprobar("ni abre sus imágenes", (await pedir(est3, `/api/jardin/${dibujo.id}/imagen`)).estado === 404);

    const otroEst = await como(navegador, "prueba.otro.est", "ESTUDIANTE");
    await otroEst.goto(url, { waitUntil: "networkidle0" });
    comprobar("uno de otro docente tampoco", (await hay(otroEst, "No hay memorias sembradas")) && (await pedir(otroEst, `/api/jardin/${foto.id}/imagen`)).estado === 404);

    const doc = await como(navegador, "prueba.docente", "DOCENTE");
    const vista = await pedir(doc, `/api/jardin/${dibujo.id}/imagen`);
    comprobar("el docente del autor sí abre el dibujo", vista.estado === 200 && vista.tipo === "image/png");

    // --- El autor retira una flor ----------------------------------------------
    await est1.click('[aria-label^="Prueba Margoth (dibujo)"]');
    await est1.waitForSelector("dialog[open]");
    await est1.click("::-p-text(Retirar mi flor)");
    await esperarTexto(est1, "Flor retirada del jardín.");
    const [queda, quedaImagen] = await Promise.all([prisma.florJardin.findUnique({ where: { id: dibujo.id } }), infoArchivo(dibujo.imagen)]);
    comprobar("retirar borra la flor y su dibujo", !queda && !quedaImagen);
  },
  async () => {
    // El módulo de prueba lo borra el entorno, con las imágenes de sus flores.
    comprobar("se usó un módulo de prueba, no uno real", Boolean(casoId) && !(await prisma.caso.findUnique({ where: { id: casoId } }))?.activo);
  }
);
