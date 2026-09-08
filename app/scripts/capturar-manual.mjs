/**
 * Captura las pantallas de la aplicación para ilustrar el Manual de Usuario.
 *
 * Usa el Chrome o el Edge ya instalados en el equipo, sin descargar navegadores.
 * Requiere la aplicación en marcha y los datos de demostración cargados:
 *
 *   npm run dev
 *   npx tsx scripts/datos-demostracion.ts <guia.pdf> <guia-maestros.pdf>
 *   node scripts/capturar-manual.mjs
 */
import { existsSync } from "fs";
import { mkdir, rm } from "fs/promises";
import path from "path";
import puppeteer from "puppeteer-core";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const BASE = "http://localhost:3000";
const CLAVE = "Roble7#cauce.p";
const SALIDA = path.join(process.cwd(), "manual", "capturas");

const NAVEGADORES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

function navegador() {
  const encontrado = NAVEGADORES.find((r) => existsSync(r));
  if (!encontrado) throw new Error("No se encontró Chrome ni Edge en el equipo.");
  return encontrado;
}

async function main() {
  await rm(SALIDA, { recursive: true, force: true });
  await mkdir(SALIDA, { recursive: true });

  const sesiones = await prisma.sesion.findMany({
    where: { publicada: true, eje: { caso: { activo: true } } },
    orderBy: { codigo: "asc" },
  });
  const porCodigo = (c) => sesiones.find((s) => s.codigo === c);

  const browser = await puppeteer.launch({
    executablePath: navegador(),
    headless: "new",
    args: ["--force-device-scale-factor=2", "--hide-scrollbars"],
  });

  const pagina = await browser.newPage();
  await pagina.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // El indicador de desarrollo de Next se superpone a la interfaz y no forma
  // parte de la aplicación: no debe aparecer en el manual.
  await pagina.evaluateOnNewDocument(() => {
    const estilo = document.createElement("style");
    estilo.textContent =
      "nextjs-portal, #__next-build-watcher, [data-nextjs-toast] { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => document.head.append(estilo));
  });

  let contador = 0;
  const tomadas = [];

  /** Guarda una captura numerada, con nombre legible. */
  async function capturar(nombre, opciones = {}) {
    contador += 1;
    const archivo = `${String(contador).padStart(2, "0")}-${nombre}.png`;
    await new Promise((r) => setTimeout(r, opciones.esperar ?? 700));
    await pagina.screenshot({
      path: path.join(SALIDA, archivo),
      fullPage: Boolean(opciones.completa),
    });
    tomadas.push(archivo);
    console.log("  ", archivo);
  }

  async function ir(ruta, opciones = {}) {
    await pagina.goto(BASE + ruta, { waitUntil: "networkidle0", timeout: 45000 });
    if (opciones.esperar) await new Promise((r) => setTimeout(r, opciones.esperar));
  }

  async function salir() {
    const contexto = browser.defaultBrowserContext();
    await contexto.clearPermissionOverrides();
    const cliente = await pagina.createCDPSession();
    await cliente.send("Network.clearBrowserCookies");
  }

  async function entrar(usuario, rolEtiqueta, clave = CLAVE) {
    await ir("/login");
    await pagina.evaluate((etiqueta) => {
      const botones = [...document.querySelectorAll("button")];
      botones.find((b) => b.textContent.trim() === etiqueta)?.click();
    }, rolEtiqueta);
    await pagina.type("#usuario", usuario);
    await pagina.type("#password", clave);
    await Promise.all([
      pagina.waitForNavigation({ waitUntil: "networkidle0", timeout: 45000 }).catch(() => {}),
      pagina.evaluate(() => {
        const botones = [...document.querySelectorAll("button")];
        botones.find((b) => b.textContent.includes("Entrar a la Plataforma"))?.click();
      }),
    ]);
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("Capturando:");

  // ---------------------------------------------------------------- Acceso
  await ir("/login");
  await capturar("login-vacio");

  await pagina.evaluate(() => {
    const botones = [...document.querySelectorAll("button")];
    botones.find((b) => b.textContent.trim() === "Estudiante")?.click();
  });
  await capturar("login-rol-elegido");

  // -------------------------------------------------------------- Docente
  await entrar("liliana.ramirez", "Docente");
  await capturar("docente-panel");

  await ir("/docente/contenidos");
  await capturar("docente-contenidos");

  await ir("/docente/estudiantes");
  await capturar("docente-estudiantes");

  await ir("/docente/subpoblaciones");
  await capturar("docente-subpoblaciones");

  await ir("/docente/foros");
  await capturar("docente-foros");

  await ir("/cambiar-contrasena");
  await capturar("cambiar-contrasena");

  // Primer ingreso: una cuenta que todavía usa la contraseña provisional no
  // llega a ninguna otra pantalla hasta elegir la suya.
  await salir();
  await entrar("andres.villalba", "Estudiante", "Vela.trigo78");
  await capturar("primer-ingreso");

  // ------------------------------------------------------------ Estudiante
  await salir();
  await entrar("maria.estrada", "Estudiante");
  await capturar("estudiante-mapa");

  // El mapa despliega las sesiones al pulsar un eje.
  await pagina.evaluate(() => {
    const tarjetas = [...document.querySelectorAll("button, [role=button]")];
    tarjetas.find((t) => /Identidad|EJE 1/i.test(t.textContent))?.click();
  });
  await capturar("estudiante-mapa-eje", { esperar: 1200 });

  const rutas = [
    ["1.1", "estudiante-cartografia", 2500],
    ["1.2", "estudiante-tradicion-oral", 1000],
    ["1.3", "estudiante-anotaciones", 1000],
    ["1.4", "estudiante-simulador", 1200],
  ];
  for (const [codigo, nombre, espera] of rutas) {
    const s = porCodigo(codigo);
    if (!s) continue;
    await ir(`/estudiante/sesion/${s.id}`, { esperar: espera });
    await capturar(nombre);
  }

  await ir("/estudiante/diario");
  await capturar("estudiante-diario");

  // ---------------------------------------------------------- Administrador
  await salir();
  await entrar("admin.sistema", "Administrador");

  if (pagina.url().includes("/login") || pagina.url().includes("cambiar-contrasena")) {
    throw new Error(
      "El administrador no entró. Ejecuta antes scripts/datos-demostracion.ts, que deja su cuenta lista."
    );
  }

  await ir("/admin/docentes");
  await capturar("admin-docentes");

  await ir("/admin/importar");
  await capturar("admin-importar");

  await ir("/admin/casos");
  await capturar("admin-casos");

  await ir("/admin/accesibilidad");
  await capturar("admin-accesibilidad");

  await browser.close();
  console.log(`\n${tomadas.length} capturas en manual/capturas`);
}

main().finally(() => prisma.$disconnect());
