/**
 * 4.4 · Simulador de tierras con el plano de lotes.
 *
 * Un estudiante da lotes arrastrando una familia, eligiéndola y tocando el
 * lote, y desde el propio lote; no puede pasar del tope de 40 ha por familia;
 * elige un subsidio y ve el estado de la familia en su lote; los indicadores
 * de presupuesto, hectáreas y riesgo cambian con cada decisión. Al validar
 * se guardan los lotes, y al volver siguen ahí. Reiniciar lo borra.
 *
 * Se hace sobre un módulo de prueba inactivo, que se borra al terminar. Las
 * familias son las del simulador, que ya están en la base.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:simulador
 */
import { BASE, capturar, como, comprobar, crearCuenta, crearModuloDePrueba, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);
const lote = (id) => `button[data-lote="${id}"]`;
const textoDe = (pagina, selector) => pagina.$eval(selector, (e) => e.innerText.replace(/\s+/g, " "));

/** Arrastrar con los eventos del navegador (el modo sin cabeza no arrastra con el ratón simulado). */
async function arrastrar(pagina, familia, loteId) {
  await pagina.evaluate(
    (f, l) => {
      const origen = document.querySelector(`li[aria-label="${f}"]`);
      const destino = document.querySelector(`button[data-lote="${l}"]`);
      const datos = new DataTransfer();
      for (const [nodo, tipo] of [[origen, "dragstart"], [destino, "dragover"], [destino, "drop"]]) {
        nodo.dispatchEvent(new DragEvent(tipo, { bubbles: true, cancelable: true, dataTransfer: datos }));
      }
    },
    familia,
    loteId
  );
}

async function esperarEnLote(pagina, loteId, texto) {
  await pagina.waitForFunction((s, t) => document.querySelector(s)?.innerText.includes(t), { timeout: 20_000 }, lote(loteId), texto);
}

let modulo;

await ejecutar("4.4 · Simulador con plano de lotes", async ({ abrir }) => {
  const familias = await prisma.familia.findMany({ orderBy: { orden: "asc" } });
  comprobar("las familias del simulador están en la base", familias.length === 20, `${familias.length}`);
  // Una familia grande sin prioridad alta y una pequeña de prioridad alta.
  const grande = familias.filter((f) => f.prioridad !== "ALTA").sort((a, b) => b.personas - a.personas)[0];
  const pequena = familias.filter((f) => f.prioridad === "ALTA").sort((a, b) => a.personas - b.personas)[0];
  const corto = (f) => f.nombre.replace(/^Familia /, "");

  modulo = await crearModuloDePrueba("simulador");
  const docente = await crearCuenta("docente", "DOCENTE");
  const est = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id });

  const navegador = await abrir();
  const p = await como(navegador, "prueba.est1", "ESTUDIANTE");
  await p.goto(`${BASE}/estudiante/sesion/${modulo.sesionId}`, { waitUntil: "networkidle0" });
  comprobar("muestra los 20 lotes del plano y las 20 familias", (await p.$$("button[data-lote]")).length === 20 && (await p.$$('section[aria-labelledby="titulo-familias"] li')).length === 20);
  comprobar("con toda la tierra y el presupuesto disponibles", (await hay(p, "Familias sin tierra (20)")) && (await hay(p, "200 ha")) && (await hay(p, "$100.000")));

  // --- Tres maneras de dar un lote ---------------------------------------------
  await arrastrar(p, grande.nombre, "L01");
  await esperarEnLote(p, "L01", corto(grande));
  comprobar("arrastrando la familia al lote", (await textoDe(p, lote("L01"))).includes("Hectáreas OK"));

  await p.click(`::-p-xpath(//li[@aria-label="${pequena.nombre}"]//button[normalize-space()="Elegir"])`);
  await p.click(lote("L05"));
  await esperarEnLote(p, "L05", corto(pequena));
  comprobar("eligiendo la familia y tocando el lote", true);
  const enL05 = await textoDe(p, lote("L05"));
  comprobar(
    "el lote dice si la tierra alcanza y si falta subsidio",
    enL05.includes(`Pocas ha (${pequena.personas * 2} sugeridas)`) && enL05.includes("Subsidio insuficiente"),
    enL05
  );

  await p.select(`#subsidio-${pequena.id}`, "AGRICULTURA");
  await esperarEnLote(p, "L05", "Subsidio justo");
  comprobar("con subsidio, el lote lo refleja", true);

  await p.click(lote("L02"));
  await p.waitForSelector("#familia-del-lote");
  await p.select("#familia-del-lote", grande.id);
  await esperarEnLote(p, "L02", corto(grande));
  comprobar("desde el lote, eligiendo a quién dárselo", (await hay(p, `40 ha · lote 01, 02`)));

  await p.click(lote("L03"));
  await p.waitForFunction(() => document.querySelector("#familia-del-lote")?.previousElementSibling?.textContent.includes("Lote 03"), { timeout: 10_000 });
  await p.select("#familia-del-lote", grande.id);
  await esperarTexto(p, "Una familia puede recibir hasta 40 ha; con este lote tendría 55.");
  comprobar("no deja pasar del tope por familia", !(await textoDe(p, lote("L03"))).includes(corto(grande)));

  await p.click(lote("L02"));
  await p.waitForFunction(() => document.querySelector("#familia-del-lote")?.previousElementSibling?.textContent.includes("Lote 02"), { timeout: 10_000 });
  await p.select("#familia-del-lote", "");
  await esperarEnLote(p, "L02", "ASIGNAR FAMILIA");
  comprobar("un lote se puede dejar libre otra vez", true);

  // --- Indicadores ---------------------------------------------------------------
  comprobar(
    "los indicadores siguen las decisiones",
    (await hay(p, "175 ha")) && (await hay(p, "$95.000")) && (await hay(p, "Familias sin tierra (18)")) && (await hay(p, "ALTO")),
    "175 ha, $95.000, 18 sin tierra, riesgo alto con prioritarias sin tierra"
  );

  // --- Validar y volver -------------------------------------------------------------
  await p.click(`::-p-xpath(//button[normalize-space()="Validar distribución"])`);
  await esperarTexto(p, "Distribución guardada. Índice de equidad:");
  comprobar("valida y muestra los criterios", await hay(p, "familias de prioridad alta sin tierra"));
  const simulacion = await prisma.simulacion.findFirst({ where: { userId: est.id, sesionId: modulo.sesionId }, include: { asignaciones: true } });
  const de = (f) => simulacion?.asignaciones.find((a) => a.familiaId === f.id);
  comprobar(
    "guarda los lotes, las hectáreas y el subsidio",
    de(grande)?.lotes.join() === "L01" && de(grande)?.hectareas === 20 && de(pequena)?.lotes.join() === "L05" && de(pequena)?.subsidio === "AGRICULTURA",
    JSON.stringify(simulacion?.asignaciones.map((a) => [a.lotes, a.hectareas, a.subsidio]))
  );
  comprobar("con su índice de equidad", simulacion?.validadaEn && simulacion.indiceEquidad > 0);
  await capturar(p, "simulador");

  await p.reload({ waitUntil: "networkidle0" });
  comprobar("al volver, los lotes siguen asignados", (await textoDe(p, lote("L01"))).includes(corto(grande)) && (await textoDe(p, lote("L05"))).includes("Subsidio justo"));

  await p.click(`::-p-xpath(//button[normalize-space()="Reiniciar"])`);
  await esperarTexto(p, "Familias sin tierra (20)");
  let vacia = false;
  for (let i = 0; i < 20 && !vacia; i++) {
    vacia = (await prisma.asignacion.count({ where: { simulacion: { userId: est.id } } })) === 0;
    if (!vacia) await new Promise((r) => setTimeout(r, 500));
  }
  comprobar("reiniciar lo deja todo libre", vacia);

  await p.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await p.reload({ waitUntil: "networkidle0" });
  comprobar("el plano no se desborda en el móvil", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
});
