/**
 * Lo que comparten las pruebas de extremo a extremo de la v2.
 *
 * Las pruebas corren contra la aplicación en marcha (`npm run dev`) y contra la
 * misma base que usa la plataforma publicada. Por eso todo lo que crean lleva
 * cuentas con el prefijo `prueba.` y se borra al terminar, falle o no la prueba:
 * usa siempre `ejecutar()`, que se encarga de la limpieza.
 */
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import puppeteer from "puppeteer-core";
import "dotenv/config";

export const BASE = process.env.BASE_PRUEBAS ?? "http://localhost:3000";
export const CLAVE = "Roble7#cauce.p";
export const PREFIJO = "prueba.";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

const ETIQUETA_ROL = { ESTUDIANTE: "Estudiante", DOCENTE: "Docente", ADMIN: "Administrador" };

/** Crea una cuenta de prueba ya activa, sin contraseña provisional. */
export async function crearCuenta(sufijo, rol, extra = {}) {
  const usuario = `${PREFIJO}${sufijo}`;
  await prisma.user.deleteMany({ where: { usuario } });
  return prisma.user.create({
    data: {
      usuario,
      email: `${usuario}@memoriaelsalado.edu.co`,
      nombre: `Prueba ${sufijo}`,
      iniciales: "PR",
      rol,
      passwordHash: await bcrypt.hash(CLAVE, 10),
      debeCambiarContrasena: false,
      ...extra,
    },
  });
}

/**
 * Borra las cuentas de prueba. Algunas relaciones dejan el contenido huérfano
 * en vez de borrarlo (`onDelete: SetNull`), así que ese contenido se borra antes.
 */
export async function borrarCuentasDePrueba() {
  const cuentas = await prisma.user.findMany({
    where: { usuario: { startsWith: PREFIJO } },
    select: { id: true },
  });
  const ids = cuentas.map((c) => c.id);
  if (ids.length) {
    await prisma.florJardin.deleteMany({ where: { autorId: { in: ids } } });
    await prisma.foro.deleteMany({ where: { autorId: { in: ids } } });
    await prisma.recurso.deleteMany({ where: { autorId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  return prisma.user.count({ where: { usuario: { startsWith: PREFIJO } } });
}

// ---------------------------------------------------------------------------
// Resultado

const fallos = [];

/** Anota una comprobación y la imprime. La prueba falla si alguna no se cumple. */
export function comprobar(descripcion, cumple, detalle = "") {
  console.log(`  ${cumple ? "correcto" : "FALLA   "}  ${descripcion}${detalle ? ` · ${detalle}` : ""}`);
  if (!cumple) fallos.push(descripcion);
}

/**
 * Ejecuta la prueba y limpia después, pase lo que pase. Sale con código 1 si
 * alguna comprobación falló, para que se pueda encadenar con otros comandos.
 */
export async function ejecutar(titulo, prueba, limpiar = async () => {}) {
  console.log(`\n${titulo}\n`);
  let navegador;
  try {
    await prueba({ abrir: async () => (navegador = await abrirNavegador()) });
  } catch (error) {
    comprobar("la prueba terminó sin errores", false, error instanceof Error ? error.message : String(error));
  } finally {
    await navegador?.close().catch(() => {});
    await limpiar().catch((e) => comprobar("limpieza", false, e.message));
    const restantes = await borrarCuentasDePrueba();
    comprobar("no quedan cuentas de prueba en la base", restantes === 0);
    await prisma.$disconnect();
  }
  console.log(fallos.length ? `\n${fallos.length} comprobación(es) fallida(s).` : "\nTodo correcto.");
  process.exitCode = fallos.length ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Navegador

const NAVEGADORES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

/** Usa el Chrome o el Edge ya instalados: no se descarga ningún navegador. */
export async function abrirNavegador() {
  const ruta = NAVEGADORES.find((r) => existsSync(r));
  if (!ruta) throw new Error("No se encontró Chrome ni Edge en el equipo.");
  return puppeteer.launch({ executablePath: ruta, headless: true, defaultViewport: { width: 1280, height: 900 } });
}

/** Entra por la pantalla de login, como lo haría una persona. */
export async function entrar(pagina, usuario, rol) {
  await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await pagina.click(`::-p-xpath(//button[.//span[normalize-space()="${ETIQUETA_ROL[rol]}"]])`);
  await pagina.type("#usuario", usuario);
  await pagina.type("#password", CLAVE);
  await Promise.all([
    pagina.waitForFunction(() => !location.pathname.startsWith("/login"), { timeout: 30_000 }),
    pagina.click('button[type="submit"]'),
  ]);
}

/** Espera a que aparezca un texto en la página. */
export function esperarTexto(pagina, texto, timeout = 30_000) {
  return pagina.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, texto);
}
