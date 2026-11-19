/**
 * WCAG 1.4.4 · El control de tamaño de texto (A / A+ / A++).
 *
 * Mide el tamaño real de los textos en el navegador: el título, el menú y la
 * cabecera tienen que crecer un 12 % con A+ y un 25 % con A++, la elección se
 * recuerda al recargar y en el celular nada se desborda a lo ancho.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:escala-texto
 */
import { BASE, capturar, como, comprobar, crearCuenta, desborde, ejecutar } from "./entorno.mjs";

/** Tamaño de letra calculado, en px, del primer elemento que coincide. */
const tamano = (pagina, selector) =>
  pagina.$eval(selector, (e) => parseFloat(getComputedStyle(e).fontSize)).catch(() => NaN);

const MUESTRAS = {
  título: "main h1",
  menú: "nav ul a span",
  cabecera: "header span.whitespace-nowrap",
};

async function medir(pagina) {
  const r = {};
  for (const [nombre, sel] of Object.entries(MUESTRAS)) r[nombre] = await tamano(pagina, sel);
  return r;
}

const boton = '[aria-label^="Tamaño de texto actual"]';
const cerca = (a, b) => Math.abs(a - b) < 0.02;

await ejecutar("WCAG 1.4.4 · Tamaño de texto", async ({ abrir }) => {
  const docente = await crearCuenta("docente", "DOCENTE");
  await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id });
  const navegador = await abrir();

  for (const [usuario, rol, ruta] of [
    ["prueba.docente", "DOCENTE", "/docente/panel"],
    ["prueba.est1", "ESTUDIANTE", "/estudiante/mapa"],
  ]) {
    const p = await como(navegador, usuario, rol);
    await p.goto(`${BASE}${ruta}`, { waitUntil: "networkidle0" });
    const base = await medir(p);
    comprobar(`${rol}: en «A» los textos tienen su tamaño de diseño`, Object.values(base).every((v) => v > 0), JSON.stringify(base));

    for (const [etiqueta, factor] of [["A+", 1.12], ["A++", 1.25]]) {
      await p.click(boton);
      await p.waitForFunction((e) => document.documentElement.dataset.escala === e, { timeout: 5_000 }, String(factor));
      const ahora = await medir(p);
      const crecen = Object.keys(base).every((k) => cerca(ahora[k] / base[k], factor));
      comprobar(
        `${rol}: con ${etiqueta} crecen el título, el menú y la cabecera un ${Math.round((factor - 1) * 100)} %`,
        crecen,
        Object.keys(base).map((k) => `${k} ${base[k]}→${ahora[k]}`).join(", ")
      );
    }
    comprobar(`${rol}: el botón dice en qué tamaño está`, (await p.$eval(boton, (b) => b.textContent.trim())) === "A++");

    await p.reload({ waitUntil: "networkidle0" });
    await p.waitForFunction(() => document.documentElement.dataset.escala === "1.25", { timeout: 5_000 }).catch(() => {});
    const recargada = await medir(p);
    comprobar(`${rol}: al recargar recuerda A++`, cerca(recargada.título / base.título, 1.25));

    await p.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await p.reload({ waitUntil: "networkidle0" });
    comprobar(`${rol}: con A++ en el celular nada se desborda a lo ancho`, (await desborde(p)) <= 0, `${await desborde(p)} px`);
    await capturar(p, `escala-texto-${rol.toLowerCase()}`);

    await p.setViewport({ width: 1280, height: 900 });
    await p.click(boton);
    await p.waitForFunction(() => !document.documentElement.dataset.escala || document.documentElement.dataset.escala === "1", { timeout: 5_000 });
    const vuelta = await medir(p);
    comprobar(`${rol}: tras A++ vuelve a «A»`, cerca(vuelta.título / base.título, 1));
  }
});
