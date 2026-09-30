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
import { eliminarArchivo } from "../../src/lib/almacen.ts";

export const BASE = process.env.BASE_PRUEBAS ?? "http://localhost:3000";
export const CLAVE = "Roble7#cauce.p";
export const PREFIJO = "prueba.";

/**
 * Pocas conexiones: el pooler de sesión de Supabase admite 15 clientes, y el
 * servidor de desarrollo ya abre hasta 10. Con el valor por defecto de `pg`
 * (10) las dos juntas lo agotan.
 */
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "", max: 3 }),
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
      // Sin explorador, el mapa pide elegirlo: las pruebas que no tratan de eso
      // entran como si ya lo hubieran hecho.
      ...(rol === "ESTUDIANTE" ? { explorador: "CURIOSO" } : {}),
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
    // Las flores quedarían sin autor (y sus dibujos, en el depósito): se borran antes.
    const flores = await prisma.florJardin.findMany({ where: { autorId: { in: ids } }, select: { imagen: true } });
    for (const f of flores) if (f.imagen) await eliminarArchivo(f.imagen);
    await prisma.florJardin.deleteMany({ where: { autorId: { in: ids } } });
    await prisma.foro.deleteMany({ where: { autorId: { in: ids } } });
    // Los recursos llevan su archivo en el depósito: se borra antes que la ficha.
    const recursos = await prisma.recurso.findMany({ where: { autorId: { in: ids } }, select: { archivo: true } });
    for (const r of recursos) if (r.archivo) await eliminarArchivo(r.archivo);
    await prisma.recurso.deleteMany({ where: { autorId: { in: ids } } });
    // Las marcas de la cartografía se borran con su autor, pero su grabación y
    // su foto viven en el depósito.
    const marcas = await prisma.marcaCartografia.findMany({ where: { autorId: { in: ids } }, select: { audioArchivo: true, foto: true } });
    for (const m of marcas) for (const r of [m.audioArchivo, m.foto]) if (r) await eliminarArchivo(r);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  return prisma.user.count({ where: { usuario: { startsWith: PREFIJO } } });
}

/**
 * Módulos temporales para probar actividades sin publicar una sesión real.
 * Nacen inactivos, así que ningún estudiante real los ve, y su nombre lleva
 * este prefijo para que la limpieza no pueda confundirlos con uno de verdad.
 */
export const PREFIJO_MODULO = "Módulo de prueba (se borra solo)";

/**
 * Crea el módulo con una sesión publicada por actividad. Recibe una pantalla,
 * o una lista de pantallas o de { pantalla, titulo }. Con una sola pantalla
 * devuelve { casoId, sesionId }; con una lista, { casoId, sesiones: [ids] }.
 */
export async function crearModuloDePrueba(pantallas) {
  const lista = (Array.isArray(pantallas) ? pantallas : [pantallas]).map((p) => (typeof p === "string" ? { pantalla: p } : p));
  const caso = await prisma.caso.create({
    data: {
      nombre: `${PREFIJO_MODULO} ${lista.map((p) => p.pantalla).join("-")} ${Date.now()}`,
      depto: "Prueba",
      ejes: {
        create: {
          numero: 1,
          nombre: "Eje de prueba",
          descripcion: "Eje de prueba",
          tono: "#1B8A8A",
          orden: 0,
          sesiones: {
            create: lista.map((p, i) => ({
              codigo: `9.${i + 1}`,
              titulo: p.titulo ?? `Sesión de prueba (${p.pantalla})`,
              tipo: p.pantalla,
              pantalla: p.pantalla,
              publicada: true,
              orden: i,
            })),
          },
        },
      },
    },
    include: { ejes: { include: { sesiones: { orderBy: { orden: "asc" } } } } },
  });
  const sesiones = caso.ejes[0].sesiones.map((s) => s.id);
  return Array.isArray(pantallas) ? { casoId: caso.id, sesiones } : { casoId: caso.id, sesionId: sesiones[0] };
}

/** Borra los módulos de prueba y los archivos que se subieron en ellos. */
export async function borrarModulosDePrueba() {
  const casos = await prisma.caso.findMany({
    where: { nombre: { startsWith: PREFIJO_MODULO } },
    include: { ejes: { include: { sesiones: { include: { flores: { select: { imagen: true } }, marcas: { select: { audioArchivo: true, foto: true } } } } } } },
  });
  for (const c of casos) {
    const sesiones = c.ejes.flatMap((e) => e.sesiones);
    const rutas = [
      ...sesiones.flatMap((s) => s.flores.map((f) => f.imagen)),
      ...sesiones.flatMap((s) => s.marcas.flatMap((m) => [m.audioArchivo, m.foto])),
    ];
    for (const r of rutas) if (r) await eliminarArchivo(r);
    await prisma.caso.delete({ where: { id: c.id } });
  }
  return prisma.caso.count({ where: { nombre: { startsWith: PREFIJO_MODULO } } });
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
    await prueba({ abrir: async (argumentos) => (navegador = await abrirNavegador(argumentos)) });
  } catch (error) {
    comprobar("la prueba terminó sin errores", false, error instanceof Error ? error.message : String(error));
    // Con DEPURAR=1 se imprime la traza completa, para saber dónde se cortó.
    if (process.env.DEPURAR) console.error(error);
  } finally {
    await navegador?.close().catch(() => {});
    await limpiar().catch((e) => comprobar("limpieza", false, e.message));
    const modulos = await borrarModulosDePrueba();
    if (modulos) comprobar("no quedan módulos de prueba", false, `${modulos} sin borrar`);
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

/**
 * Usa el Chrome o el Edge ya instalados: no se descarga ningún navegador.
 * `argumentos` añade opciones de arranque, como el micrófono simulado.
 */
export async function abrirNavegador(argumentos = []) {
  const ruta = NAVEGADORES.find((r) => existsSync(r));
  if (!ruta) throw new Error("No se encontró Chrome ni Edge en el equipo.");
  return puppeteer.launch({
    executablePath: ruta,
    headless: true,
    args: argumentos,
    defaultViewport: { width: 1280, height: 900 },
    // Por encima de la espera más larga (la subida de la guía, hasta 10 min):
    // con el valor por defecto, 3 min, una conexión lenta corta la espera antes.
    protocolTimeout: 900_000,
  });
}

/** Micrófono y cámara simulados, con el permiso ya concedido: para probar la grabación. */
export const MICROFONO_SIMULADO = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"];

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

/**
 * Abre una sesión de navegador aislada, con sus propias cookies, y entra. Los
 * diálogos de confirmación se aceptan, como haría quien pulsa «Aceptar».
 */
export async function como(navegador, usuario, rol) {
  const contexto = await navegador.createBrowserContext();
  const pagina = await contexto.newPage();
  pagina.on("dialog", (d) => d.accept());
  await entrar(pagina, usuario, rol);
  return pagina;
}

/**
 * Guarda una captura si se pidió con CAPTURAS=<carpeta>, para revisar a ojo
 * cómo queda la pantalla. Sin la variable no hace nada.
 */
export async function capturar(pagina, nombre) {
  if (!process.env.CAPTURAS) return;
  await pagina.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true });
}

/**
 * Abre una página y espera a que cargue, y como mucho diez segundos más a que
 * la red se calme. Para pantallas con mapa: sus mosaicos vienen de
 * OpenStreetMap, y un servidor ajeno lento no debe tumbar una prueba.
 */
export async function visitar(pagina, url) {
  const respuesta = await pagina.goto(url, { waitUntil: "load" });
  await pagina.waitForNetworkIdle({ idleTime: 500, timeout: 10_000 }).catch(() => {});
  return respuesta;
}

/** Espera a que aparezca un texto en la página. */
export function esperarTexto(pagina, texto, timeout = 30_000) {
  return pagina.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, texto);
}
