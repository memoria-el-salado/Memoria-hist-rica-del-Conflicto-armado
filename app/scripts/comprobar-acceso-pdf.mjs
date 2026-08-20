/**
 * Comprueba que un estudiante no pueda abrir un documento reservado al docente,
 * ni siquiera escribiendo su dirección, y que el docente sí pueda.
 *
 *   node scripts/comprobar-acceso-pdf.mjs
 */
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import "dotenv/config";

const BASE = "http://localhost:3000";
const CLAVE = "Roble7#cauce.p";
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL) });

function sesionHttp() {
  const galleta = new Map();
  return async function pedir(ruta, opciones = {}) {
    const res = await fetch(BASE + ruta, {
      ...opciones,
      redirect: "manual",
      headers: {
        ...(opciones.headers ?? {}),
        cookie: [...galleta].map(([k, v]) => `${k}=${v}`).join("; "),
      },
    });
    for (const linea of res.headers.getSetCookie?.() ?? []) {
      const [par] = linea.split(";");
      const i = par.indexOf("=");
      galleta.set(par.slice(0, i), par.slice(i + 1));
    }
    return res;
  };
}

async function entrar(usuario, rol) {
  const pedir = sesionHttp();
  const { csrfToken } = await (await pedir("/api/auth/csrf")).json();
  await pedir("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, usuario, password: CLAVE, rol }),
  });
  return pedir;
}

async function crear(usuario, rol, nombre, iniciales) {
  await prisma.user.deleteMany({ where: { usuario } });
  return prisma.user.create({
    data: {
      usuario,
      email: `${usuario}@memoriaelsalado.edu.co`,
      nombre,
      iniciales,
      rol,
      passwordHash: await bcrypt.hash(CLAVE, 10),
      debeCambiarContrasena: false,
    },
  });
}

async function main() {
  const documentos = await prisma.documentoFuente.findMany({ orderBy: { subidoEn: "asc" } });
  if (documentos.length === 0) return console.log("No hay documentos cargados.");

  const estudiante = await crear("prueba.estudiante", "ESTUDIANTE", "Estudiante De Prueba", "EP");
  const docente = await crear("prueba.docente", "DOCENTE", "Docente De Prueba", "DP");

  const comoEstudiante = await entrar("prueba.estudiante", "ESTUDIANTE");
  const comoDocente = await entrar("prueba.docente", "DOCENTE");

  console.log("Acceso directo a cada PDF por su dirección:\n");
  for (const d of documentos) {
    const est = await comoEstudiante(`/api/documentos/${d.id}`);
    const doc = await comoDocente(`/api/documentos/${d.id}`);

    const marca = d.soloDocentes ? "[solo docentes]" : "[abierto]      ";
    const correcto = d.soloDocentes ? est.status === 403 && doc.status === 200 : est.status === 200;

    console.log(
      `  ${marca} estudiante ${est.status} · docente ${doc.status} · ${correcto ? "correcto" : "REVISAR"} · ${d.titulo.slice(0, 46)}`
    );
  }

  // Y que la pantalla del estudiante no enlace nunca al material reservado.
  const sesion = await prisma.sesion.findFirst({
    where: { publicada: true, eje: { caso: { activo: true } } },
  });
  if (sesion) {
    const html = await (await comoEstudiante(`/estudiante/sesion/${sesion.id}`)).text();
    const reservados = documentos.filter((d) => d.soloDocentes);
    const filtrado = reservados.every((d) => !html.includes(`/api/documentos/${d.id}`));
    console.log(`\nLa sesión del estudiante enlaza material reservado: ${filtrado ? "no" : "SÍ, REVISAR"}`);
  }

  await prisma.user.deleteMany({ where: { id: { in: [estudiante.id, docente.id] } } });
}

main().finally(() => prisma.$disconnect());
