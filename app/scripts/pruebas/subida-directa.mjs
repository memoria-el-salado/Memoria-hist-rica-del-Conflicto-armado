/**
 * 0.1 · Subida directa a Supabase.
 *
 * El administrador sube la guía completa de El Salado (15,9 MB), que por el
 * servidor de la aplicación no pasaría del límite de 4,5 MB de Vercel. Comprueba
 * que el archivo viaja directo al depósito, que llega entero y que el
 * importador propone su estructura. Todo lo que crea lo borra al terminar.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:subida [ruta/a/una-guia.pdf]
 */
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { eliminarDocumento, leerDocumento, listarDocumentos } from "../../src/lib/almacen.ts";
import { BASE, comprobar, crearCuenta, ejecutar, entrar, esperarTexto, prisma } from "./entorno.mjs";

const GUIA =
  process.argv[2] ??
  join(
    process.env.HOME,
    "Documents/caja-de-herramientas_un-viaje-por-la-memoria-historica_aprender-la-paz-y-desaprender-la-guerra/el-salado.pdf"
  );

/** Archivos del depósito sin ficha en la base. */
async function huerfanos() {
  const fichas = new Set((await prisma.documentoFuente.findMany({ select: { id: true } })).map((d) => d.id));
  return (await listarDocumentos()).filter((id) => !fichas.has(id));
}

let huerfanosAntes = [];

/** Documentos que ya existían: la limpieza nunca los toca. `null` hasta leerlos. */
let previos = null;
const inicio = new Date();

await ejecutar(
  `0.1 · Subida directa de ${basename(GUIA)} (${(statSync(GUIA).size / 1048576).toFixed(1)} MB)`,
  async ({ abrir }) => {
    previos = new Set((await prisma.documentoFuente.findMany({ select: { id: true } })).map((d) => d.id));
    huerfanosAntes = await huerfanos();
    await crearCuenta("admin", "ADMIN");

    const navegador = await abrir();
    const pagina = await navegador.newPage();

    // Se registra por dónde viaja cada byte.
    const peticiones = [];
    pagina.on("request", (r) =>
      peticiones.push({ url: r.url(), metodo: r.method(), cuerpo: r.postData()?.length ?? 0 })
    );

    await entrar(pagina, "prueba.admin", "ADMIN");
    await pagina.goto(`${BASE}/admin/importar`, { waitUntil: "networkidle0" });

    // --- Un archivo que no es PDF se rechaza antes de subir nada ----------
    const noPdf = join(tmpdir(), "notas.txt");
    writeFileSync(noPdf, "esto no es un pdf");
    await (await pagina.$("#archivo")).uploadFile(noPdf);
    await pagina.click("::-p-text(Analizar documento)");
    await esperarTexto(pagina, "El archivo debe ser un PDF.");
    comprobar("rechaza un archivo que no es PDF", true);
    comprobar(
      "sin subir nada al depósito",
      !peticiones.some((p) => p.metodo === "PUT" && p.url.includes("supabase.co"))
    );

    // --- La guía completa ---------------------------------------------------
    // Se recarga para que el aviso del paso anterior no se confunda con este.
    await pagina.goto(`${BASE}/admin/importar`, { waitUntil: "networkidle0" });
    peticiones.length = 0;
    const t0 = Date.now();
    const tramos = {};
    pagina.on("requestfinished", (r) => {
      const t = (Date.now() - t0) / 1000;
      if (r.method() === "PUT" && r.url().includes("/upload/sign/")) tramos.subida = t.toFixed(1);
      else if (r.method() === "POST" && r.url().startsWith(BASE) && tramos.subida) {
        tramos.analisis = (t - Number(tramos.subida)).toFixed(1);
        tramos.fin = t;
      }
    });
    await (await pagina.$("#archivo")).uploadFile(GUIA);
    // Se anota cada texto que muestra el botón, para ver el porcentaje avanzar.
    await pagina.evaluate(() => {
      window.__textosBoton = [];
      const boton = document.querySelector('form button[type="submit"]');
      new MutationObserver(() => window.__textosBoton.push(boton.textContent)).observe(boton, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
    await pagina.click("::-p-text(Analizar documento)");
    // Termina con la estructura para revisar o con un mensaje de error: se
    // espera a cualquiera de los dos para poder decir cuál fue.
    await pagina.waitForFunction(
      () =>
        document.body.innerText.includes("REVISA LA ESTRUCTURA DETECTADA") ||
        [...document.querySelectorAll('[role="alert"]')].some((e) => e.textContent.trim()),
      { timeout: 600_000 } // depende de la conexión: a 1 Mbit/s, 16 MB son más de dos minutos
    );
    const segundos = (Date.now() - t0) / 1000;
    const alerta = await pagina.$$eval('[role="alert"]', (xs) => xs.map((x) => x.textContent.trim()).filter(Boolean).join(" | "));
    const revisar = await pagina.evaluate(() => document.body.innerText.includes("REVISA LA ESTRUCTURA DETECTADA"));
    await pagina.screenshot({ path: join(tmpdir(), "subida-directa.png"), fullPage: true });
    comprobar("el importador propone la estructura", revisar, alerta ? `aviso: ${alerta}` : `${segundos.toFixed(1)} s`);

    const porcentajes = [
      ...new Set(
        (await pagina.evaluate(() => window.__textosBoton))
          .map((t) => t.match(/Subiendo (\d+) %/)?.[1])
          .filter(Boolean)
          .map(Number)
      ),
    ];
    comprobar(
      "el botón muestra el porcentaje de subida avanzando",
      porcentajes.length >= 3 && porcentajes.every((n, i) => i === 0 || n > porcentajes[i - 1]),
      `${porcentajes.length} valores: ${porcentajes.slice(0, 3).join(", ")} … ${porcentajes.at(-1)} %`
    );

    const subida = peticiones.find((p) => p.metodo === "PUT" && p.url.includes("/storage/v1/object/upload/sign/"));
    comprobar("el archivo viaja directo a Supabase", Boolean(subida), tramos.subida ? `subida en ${tramos.subida} s` : "");
    if (tramos.analisis) console.log(`            análisis en el servidor: ${tramos.analisis} s · pintar la revisión: ${(segundos - tramos.fin).toFixed(1)} s`);
    const alServidor = Math.max(0, ...peticiones.filter((p) => p.url.startsWith(BASE)).map((p) => p.cuerpo));
    comprobar(
      "al servidor de la aplicación no le llega el archivo",
      alServidor < 64 * 1024,
      `mayor petición: ${(alServidor / 1024).toFixed(1)} KB`
    );

    const nuevo = (await prisma.documentoFuente.findMany()).find((d) => !previos.has(d.id));
    comprobar("se crea la ficha del documento", Boolean(nuevo), nuevo ? `${nuevo.paginas} páginas` : "");
    comprobar("con el nombre del archivo original", nuevo?.nombreArchivo === basename(GUIA));

    if (nuevo) {
      const guardado = await leerDocumento(nuevo.id);
      const original = readFileSync(GUIA);
      comprobar(
        "el depósito guarda el archivo entero",
        Buffer.compare(Buffer.from(guardado), original) === 0,
        `${(guardado.byteLength / 1048576).toFixed(2)} MB`
      );
    }

    const ejes = await pagina.$$eval("input", (xs) => xs.length);
    comprobar("la pantalla de revisión muestra campos para editar", ejes > 5, `${ejes} campos`);
  },
  async () => {
    // Solo se borran los documentos que creó esta prueba. Si no se llegó a
    // saber cuáles había antes, no se borra nada.
    if (!previos) return;
    const creados = (
      await prisma.documentoFuente.findMany({
        where: { nombreArchivo: basename(GUIA), subidoEn: { gte: inicio } },
        select: { id: true },
      })
    ).filter((d) => !previos.has(d.id));
    for (const d of creados) {
      await prisma.documentoFuente.delete({ where: { id: d.id } });
      await eliminarDocumento(d.id);
    }

    // Una subida que falla a medias no puede dejar el archivo en el depósito.
    const nuevos = (await huerfanos()).filter((id) => !huerfanosAntes.includes(id));
    comprobar("no quedan archivos huérfanos en el depósito", nuevos.length === 0, nuevos.join(", "));
  }
);
