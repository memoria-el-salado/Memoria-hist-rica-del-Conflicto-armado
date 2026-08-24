/**
 * Recorre todas las pantallas y avisa si alguna se sale a lo ancho.
 *
 * Un desborde horizontal obliga a arrastrar la página de lado y, en pantallas
 * pequeñas, deja controles fuera de alcance. Se comprueba en un portátil y en
 * una tableta, que son los dos tamaños que la plataforma dice soportar.
 *
 *   node scripts/comprobar-ancho.mjs
 */
import { existsSync } from "fs";
import puppeteer from "puppeteer-core";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import "dotenv/config";

const BASE = "http://localhost:3000";
const CLAVE = "Roble7#cauce.p";
const TAMANOS = [
  { nombre: "portátil", ancho: 1440, alto: 900 },
  { nombre: "tableta", ancho: 1024, alto: 768 },
];

const NAVEGADORES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL) });

async function main() {
  const sesiones = await prisma.sesion.findMany({
    where: { publicada: true, eje: { caso: { activo: true } } },
    orderBy: { codigo: "asc" },
  });

  const cuentas = [
    {
      usuario: "liliana.ramirez",
      rol: "Docente",
      rutas: [
        "/docente/panel",
        "/docente/contenidos",
        "/docente/estudiantes",
        "/docente/subpoblaciones",
        "/docente/foros",
        "/cambiar-contrasena",
      ],
    },
    {
      usuario: "maria.estrada",
      rol: "Estudiante",
      rutas: ["/estudiante/mapa", "/estudiante/diario", ...sesiones.map((s) => `/estudiante/sesion/${s.id}`)],
    },
    {
      usuario: "admin.sistema",
      rol: "Administrador",
      rutas: ["/admin/docentes", "/admin/importar", "/admin/casos", "/admin/accesibilidad"],
    },
  ];

  const browser = await puppeteer.launch({
    executablePath: NAVEGADORES.find((r) => existsSync(r)),
    headless: "new",
  });

  let fallos = 0;

  for (const tamano of TAMANOS) {
    console.log(`\n=== ${tamano.nombre} (${tamano.ancho}px) ===`);

    for (const cuenta of cuentas) {
      const contexto = await browser.createBrowserContext();
      const pagina = await contexto.newPage();
      await pagina.setViewport({ width: tamano.ancho, height: tamano.alto });

      await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
      await pagina.evaluate((etiqueta) => {
        [...document.querySelectorAll("button")]
          .find((b) => b.textContent.trim() === etiqueta)
          ?.click();
      }, cuenta.rol);
      await pagina.type("#usuario", cuenta.usuario);
      await pagina.type("#password", CLAVE);
      await Promise.all([
        pagina.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
        pagina.evaluate(() => {
          [...document.querySelectorAll("button")]
            .find((b) => b.textContent.includes("Entrar a la Plataforma"))
            ?.click();
        }),
      ]);

      for (const ruta of cuenta.rutas) {
        await pagina.goto(BASE + ruta, { waitUntil: "networkidle0", timeout: 45000 });
        await new Promise((r) => setTimeout(r, 600));

        const medida = await pagina.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));

        const exceso = medida.scroll - medida.viewport;
        if (exceso > 1) {
          fallos += 1;
          console.log(`  ${ruta.padEnd(42)} se sale ${exceso}px`);
        }
      }

      await contexto.close();
    }
  }

  await browser.close();
  console.log(fallos === 0 ? "\nNinguna pantalla se sale a lo ancho." : `\n${fallos} pantallas con desborde.`);
}

main().finally(() => prisma.$disconnect());
