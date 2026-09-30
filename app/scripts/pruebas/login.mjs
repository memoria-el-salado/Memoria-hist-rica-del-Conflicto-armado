/**
 * 4.2 · El login del mockup y la primera entrada.
 *
 * El login deja ver la contraseña, explica quién la restablece según el rol
 * (la plataforma no envía correos) y ya no ofrece unas «credenciales
 * educativas» que no existen. En su primera entrada, el estudiante elige a su
 * explorador, que lo acompaña en la cabecera y puede cambiar después.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:login
 */
import { BASE, capturar, CLAVE, comprobar, crearCuenta, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

await ejecutar("4.2 · Login y primera entrada", async ({ abrir }) => {
  const est = await crearCuenta("est1", "ESTUDIANTE", { nombre: "Prueba Estudiante", explorador: null });
  const navegador = await abrir();
  const contexto = await navegador.createBrowserContext();
  const p = await contexto.newPage();

  // --- El login ------------------------------------------------------------------
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  comprobar("ya no ofrece credenciales educativas que no existen", !(await hay(p, "Credenciales Educativas")));

  await p.click("::-p-text(¿Olvidaste tu contraseña?)");
  await esperarTexto(p, "Elige arriba si eres estudiante");
  await p.click('::-p-xpath(//button[.//span[normalize-space()="Estudiante"]])');
  await esperarTexto(p, "Pídele a tu docente una contraseña provisional nueva");
  comprobar("«¿Olvidaste tu contraseña?» dice quién la restablece según el rol", true);

  await p.type("#password", CLAVE);
  await p.click('[aria-label="Mostrar la contraseña"]');
  comprobar("la contraseña se puede ver", (await p.$eval("#password", (i) => i.type)) === "text");
  await p.click('[aria-label="Ocultar la contraseña"]');
  comprobar("y volver a ocultar", (await p.$eval("#password", (i) => i.type)) === "password");
  await capturar(p, "login");

  await p.click("::-p-text(← Volver al inicio)");
  await p.waitForFunction(() => location.pathname === "/", { timeout: 20_000 });
  comprobar("desde el login se vuelve a la portada", await hay(p, "Descubre el legado"));

  // --- Primera entrada ----------------------------------------------------------------
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await p.click('::-p-xpath(//button[.//span[normalize-space()="Estudiante"]])');
  await p.type("#usuario", "prueba.est1");
  await p.type("#password", CLAVE);
  await Promise.all([p.waitForFunction(() => location.pathname === "/estudiante/explorador", { timeout: 30_000 }), p.click('button[type="submit"]')]);
  comprobar("en la primera entrada, pide elegir explorador", await hay(p, "Elige tu explorador"));
  comprobar("con los cuatro del mockup", (await p.$$('input[name="explorador"]')).length === 4);
  await capturar(p, "explorador");

  await p.click("::-p-text(Continuar al mapa)");
  await esperarTexto(p, "Elige uno de los cuatro exploradores.");
  await p.click("::-p-text(GUARDIÁN)");
  await p.click("::-p-text(Continuar al mapa)");
  await p.waitForFunction(() => location.pathname === "/estudiante/mapa", { timeout: 20_000 });
  comprobar("elegido, llega a su mapa", (await prisma.user.findUnique({ where: { id: est.id } })).explorador === "GUARDIAN");
  comprobar("y su explorador lo acompaña en la cabecera", Boolean(await p.$('header span[title="Prueba Estudiante"] svg')));

  await p.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  comprobar("ya no se lo vuelve a pedir", new URL(p.url()).pathname === "/estudiante/mapa");

  await p.click("::-p-text(Cambiar mi explorador)");
  await p.waitForFunction(() => location.pathname === "/estudiante/explorador", { timeout: 20_000 });
  comprobar("puede cambiarlo después", (await hay(p, "Cambia tu explorador")) && (await p.$eval('input[value="GUARDIAN"]', (i) => i.checked)));

  await p.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await p.reload({ waitUntil: "networkidle0" });
  comprobar("la elección no se desborda en el móvil", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
});
