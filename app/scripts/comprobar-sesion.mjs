/**
 * Comprobación de extremo a extremo: entra como estudiante y abre una sesión
 * para verificar que la página muestra el contenido del documento importado y
 * no un texto de ejemplo.
 *
 *   node scripts/comprobar-sesion.mjs
 */
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import "dotenv/config";

const BASE = "http://localhost:3000";
const CLAVE = "Roble7#cauce.p";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL) });

const galleta = new Map();

function guardarCookies(respuesta) {
  for (const linea of respuesta.headers.getSetCookie?.() ?? []) {
    const [par] = linea.split(";");
    const i = par.indexOf("=");
    galleta.set(par.slice(0, i), par.slice(i + 1));
  }
}

const cabecera = () => [...galleta].map(([k, v]) => `${k}=${v}`).join("; ");

async function pedir(ruta, opciones = {}) {
  const res = await fetch(BASE + ruta, {
    ...opciones,
    redirect: "manual",
    headers: { ...(opciones.headers ?? {}), cookie: cabecera() },
  });
  guardarCookies(res);
  return res;
}

async function main() {
  const docente = await prisma.user.findFirst({ where: { rol: "DOCENTE" } });
  const creadoPorId = docente?.id ?? null;

  await prisma.user.deleteMany({ where: { usuario: "prueba.estudiante" } });
  const estudiante = await prisma.user.create({
    data: {
      usuario: "prueba.estudiante",
      email: "prueba.estudiante@memoriaelsalado.edu.co",
      nombre: "Estudiante De Prueba",
      iniciales: "EP",
      rol: "ESTUDIANTE",
      passwordHash: await bcrypt.hash(CLAVE, 10),
      debeCambiarContrasena: false,
      creadoPorId,
    },
  });

  const { csrfToken } = await (await pedir("/api/auth/csrf")).json();

  const entrada = await pedir("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      usuario: "prueba.estudiante",
      password: CLAVE,
      rol: "ESTUDIANTE",
    }),
  });
  console.log("Entrada:", entrada.status, entrada.headers.get("location") ?? "");

  const mapa = await pedir("/estudiante/mapa");
  const htmlMapa = await mapa.text();
  // Las sesiones se listan al desplegar un eje, ya en el navegador, así que
  // aquí solo se comprueba que la ruta responda y no anuncie ruta vacía.
  const sinRuta = htmlMapa.includes("todavía no está disponible");
  console.log(`Mapa del viaje: ${mapa.status} · ruta pedagógica ${sinRuta ? "VACÍA" : "cargada"}`);

  // Se revisan sesiones de distintas actividades.
  const sesiones = await prisma.sesion.findMany({
    where: { eje: { caso: { activo: true } }, codigo: { in: ["1.1", "1.2", "1.3", "1.4", "6.4"] } },
    orderBy: { codigo: "asc" },
  });

  for (const s of sesiones) {
    const res = await pedir(`/estudiante/sesion/${s.id}`);
    const html = await res.text();

    // Se busca un fragmento largo del contenido guardado dentro de la página.
    const limpio = (s.contenido ?? "").replace(/\s+/g, " ").trim();
    const muestra = limpio.slice(20, 90);
    const traeContenido = muestra.length > 40 && html.replace(/\s+/g, " ").includes(muestra);
    const traeTitulo = html.includes(s.titulo.slice(0, 30));

    // Frases que solo existían en el prototipo, cuando toda sesión mostraba el
    // mismo documento de ejemplo. Si reaparecen, es que volvió el contenido fijo.
    const restosMockup = /Sobre Reforma Social Agraria|ARCHIVO NACIONAL · DOCUMENTO HISTÓRICO|Tierra de abundancia, tierra de labor/.test(html);

    const estadoTexto = traeContenido ? "sí" : muestra.length > 40 ? "NO" : "(el PDF no traía)";

    console.log(
      `  ${s.codigo.padEnd(5)} [${s.pantalla.padEnd(11)}] http ${res.status} · título ${traeTitulo ? "sí" : "NO"} · texto del PDF ${estadoTexto.padEnd(17)} · mockup ${restosMockup ? "PRESENTE" : "no"}`
    );
  }

  await prisma.user.delete({ where: { id: estudiante.id } });
}

main().finally(() => prisma.$disconnect());
