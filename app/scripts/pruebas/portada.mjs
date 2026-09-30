/**
 * 4.1 · La portada pública.
 *
 * Quien llega sin cuenta ve la portada (antes, «/» lo mandaba al login), con
 * sus secciones y enlaces al login; quien ya entró va directo a su espacio.
 * En un móvil no se desborda.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:portada
 */
import { BASE, capturar, como, comprobar, crearCuenta, ejecutar } from "./entorno.mjs";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

await ejecutar("4.1 · La portada pública", async ({ abrir }) => {
  await crearCuenta("est1", "ESTUDIANTE");
  const navegador = await abrir();

  const contexto = await navegador.createBrowserContext();
  const visita = await contexto.newPage();
  const respuesta = await visita.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  comprobar("sin cuenta, «/» muestra la portada", respuesta.status() === 200 && new URL(visita.url()).pathname === "/");
  comprobar("con el mensaje del mockup", await hay(visita, "Descubre el legado de un pueblo valiente."));
  comprobar(
    "y sus secciones",
    (await hay(visita, "¿Qué vas a descubrir?")) && (await hay(visita, "Resiliencia")) && (await hay(visita, "¿Listo para ser parte de la historia?"))
  );
  comprobar("con un solo h1 y títulos en orden", (await visita.$$eval("h1", (h) => h.length)) === 1 && (await visita.$$eval("h2", (h) => h.length)) >= 3);
  comprobar("la ilustración tiene texto alternativo", Boolean(await visita.$('svg[role="img"][aria-label]')));
  await capturar(visita, "portada");

  await visita.click("::-p-text(Comenzar viaje)");
  await visita.waitForFunction(() => location.pathname === "/login", { timeout: 20_000 });
  comprobar("«Comenzar viaje» lleva al login", true);

  await visita.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await visita.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  comprobar("en el móvil no se desborda", (await visita.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  await capturar(visita, "portada-movil");

  const est = await como(navegador, "prueba.est1", "ESTUDIANTE");
  await est.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  comprobar("quien ya entró va directo a su espacio", new URL(est.url()).pathname === "/estudiante/mapa");
});
