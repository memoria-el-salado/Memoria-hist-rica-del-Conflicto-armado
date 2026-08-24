/**
 * Deja la plataforma con un caso completo y creíble: un módulo importado desde
 * la guía del CNMH, un docente, tres estudiantes y algo de trabajo hecho.
 *
 * Sirve para preparar una demostración o para capturar el manual de usuario,
 * donde las pantallas tienen que verse con contenido real y no vacías.
 *
 *   npx tsx scripts/datos-demostracion.ts <guia-estudiante.pdf> [guia-maestros.pdf]
 */
import { randomUUID } from "crypto";
import { copyFile, mkdir, readFile, unlink } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { extractText, getDocumentProxy } from "unpdf";
import { armarArbol, detectarEstructura } from "../src/lib/importador-pdf";
import "dotenv/config";

const url = process.env.DATABASE_URL ?? "";
const prisma = new PrismaClient({
  adapter: url.startsWith("mysql:") ? new PrismaMariaDb(url) : new PrismaPg({ connectionString: url }),
});

const CARPETA = path.join(process.cwd(), "almacen", "documentos");
const TONOS = ["#D95D39", "#1B8A8A", "#EBB035", "#B8482A", "#8C8279", "#177575"];
const CLAVE = "Roble7#cauce.p";

const [guiaEstudiante, guiaMaestros] = process.argv.slice(2);

function extraerPregunta(contenido: string, titulo: string): string | null {
  for (const encontrada of contenido.matchAll(/¿[^¿?]{15,180}\?/g)) {
    if (/[a-záéíóúñ]/.test(encontrada[0])) return encontrada[0];
  }
  return /¿.*\?/.test(titulo) ? titulo : null;
}

/** Copia el PDF al almacén con el mismo identificador que su ficha. */
async function guardar(origen: string, soloDocentes: boolean, casoId: string | null) {
  const id = randomUUID();
  await mkdir(CARPETA, { recursive: true });
  await copyFile(origen, path.join(CARPETA, `${id}.pdf`));

  const bytes = new Uint8Array(await readFile(origen));
  const pdf = await getDocumentProxy(bytes.slice());
  const { text, totalPages } = await extractText(pdf, { mergePages: true });

  return prisma.documentoFuente.create({
    data: {
      id,
      titulo: detectarEstructura(text).titulo ?? path.basename(origen, ".pdf"),
      nombreArchivo: path.basename(origen),
      rutaArchivo: `almacen/documentos/${id}.pdf`,
      paginas: totalPages,
      soloDocentes,
      casoId,
    },
  });
}

async function main() {
  if (!guiaEstudiante) {
    console.error("Indica la ruta de la guía del estudiante en PDF.");
    process.exit(1);
  }

  console.log("Limpiando módulos y cuentas de demostración...");

  // Los PDF se borran junto con su ficha: si no, el almacén va acumulando
  // archivos que ya no pertenecen a ningún documento.
  const previos = await prisma.documentoFuente.findMany();
  await prisma.caso.deleteMany();
  await prisma.documentoFuente.deleteMany();
  for (const d of previos) {
    try {
      await unlink(path.join(CARPETA, `${d.id}.pdf`));
    } catch {
      /* el archivo ya no estaba */
    }
  }

  await prisma.user.deleteMany({ where: { rol: { in: ["DOCENTE", "ESTUDIANTE"] } } });

  // --- Módulo a partir de la guía del estudiante -------------------------
  const bytes = new Uint8Array(await readFile(guiaEstudiante));
  const pdf = await getDocumentProxy(bytes.slice());
  const { text } = await extractText(pdf, { mergePages: true });
  const arbol = armarArbol(detectarEstructura(text).elementos);

  const caso = await prisma.caso.create({
    data: {
      nombre: "El Salado",
      depto: "Bolívar · Montes de María",
      estado: "ACTIVO",
      version: "1.0.0",
      activo: true,
      lat: 9.62,
      lon: -75.13,
      ejes: {
        create: arbol.map((eje, i) => ({
          numero: Number(eje.codigo),
          nombre: eje.titulo,
          descripcion: "Eje derivado de la guía del CNMH.",
          objetivoGeneral:
            i === 0
              ? "Reconocer los vínculos con el territorio y las disputas que se tejen alrededor de la tierra."
              : null,
          tono: TONOS[i % TONOS.length],
          orden: i,
          sesiones: {
            create: eje.sesiones.map((s, j) => ({
              codigo: s.codigo,
              titulo: s.titulo,
              tipo: s.actividad.toUpperCase(),
              pantalla: s.actividad,
              // Se publica el primer eje: es el que tiene contenido desarrollado.
              publicada: i === 0,
              alertaCuidado: s.codigo === "4.1",
              orden: j,
              contenido: s.contenido || null,
              preguntaOrientadora: extraerPregunta(s.contenido, s.titulo),
              subsecciones: {
                create: s.subsecciones.map((sub, k) => ({
                  codigo: sub.codigo,
                  titulo: sub.titulo,
                  contenido: sub.contenido || null,
                  orden: k,
                })),
              },
            })),
          },
        })),
      },
    },
  });

  await guardar(guiaEstudiante, false, caso.id);
  if (guiaMaestros) await guardar(guiaMaestros, true, caso.id);

  // --- Cuentas ------------------------------------------------------------
  // El administrador sembrado entra con una contraseña provisional y la
  // plataforma le exige cambiarla. Para una demostración eso estorba, así que
  // aquí queda con la misma contraseña que el resto y sin el cambio pendiente.
  const admin = await prisma.user.findFirst({ where: { rol: "ADMIN" } });
  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        passwordHash: await bcrypt.hash(CLAVE, 10),
        debeCambiarContrasena: false,
        contrasenaCambiadaEn: new Date(),
      },
    });
  }

  const docente = await prisma.user.create({
    data: {
      usuario: "liliana.ramirez",
      email: "liliana.ramirez@memoriaelsalado.edu.co",
      nombre: "Liliana Ramírez",
      iniciales: "LR",
      rol: "DOCENTE",
      passwordHash: await bcrypt.hash(CLAVE, 10),
      debeCambiarContrasena: false,
      creadoPorId: admin?.id ?? null,
    },
  });

  const ESTUDIANTES = [
    { usuario: "maria.estrada", nombre: "María Estrada", ini: "ME", sub: "Retornados" },
    { usuario: "julian.mercado", nombre: "Julián Mercado", ini: "JM", sub: "Población desplazada" },
    { usuario: "sara.narvaez", nombre: "Sara Narváez", ini: "SN", sub: "Sin vínculo directo" },
  ];

  const estudiantes = [];
  for (const e of ESTUDIANTES) {
    estudiantes.push(
      await prisma.user.create({
        data: {
          usuario: e.usuario,
          email: `${e.usuario}@memoriaelsalado.edu.co`,
          nombre: e.nombre,
          iniciales: e.ini,
          rol: "ESTUDIANTE",
          subpoblacion: e.sub,
          passwordHash: await bcrypt.hash(CLAVE, 10),
          debeCambiarContrasena: false,
          creadoPorId: docente.id,
        },
      })
    );
  }

  // --- Algo de trabajo hecho, para que las pantallas no salgan vacías -----
  const sesiones = await prisma.sesion.findMany({ where: { eje: { casoId: caso.id } } });
  const porCodigo = (c: string) => sesiones.find((s) => s.codigo === c)!;

  await prisma.marcaCartografia.createMany({
    data: [
      {
        autorId: estudiantes[0].id,
        sesionId: porCodigo("1.1").id,
        lugar: "El patio de mi abuela",
        relato:
          "Ahí se secaba el tabaco y se reunía toda la familia los domingos. Todavía huele a leña cuando lo recuerdo.",
        audio: "Sin audio",
        tags: ["Olor a leña", "Voces de familia"],
        lat: 9.6205,
        lon: -75.1338,
      },
      {
        autorId: estudiantes[1].id,
        sesionId: porCodigo("1.1").id,
        lugar: "La cancha del colegio",
        relato: "Donde aprendimos a jugar y donde volvimos a encontrarnos después del retorno.",
        audio: "Sin audio",
        tags: ["Recuerdo de infancia"],
        lat: 9.6178,
        lon: -75.1291,
      },
    ],
  });

  await prisma.anotacion.createMany({
    data: [
      {
        autorId: estudiantes[0].id,
        sesionId: porCodigo("1.3").id,
        texto:
          "Los dos modelos no discuten solo por la tierra: discuten por quién decide qué se hace con ella.",
        cita: null,
      },
      {
        autorId: docente.id,
        sesionId: porCodigo("1.3").id,
        texto:
          "Buena observación, María. Fíjense además en quién queda por fuera de esa decisión en cada modelo.",
        cita: null,
      },
    ],
  });

  await prisma.respuestaActividad.create({
    data: {
      userId: estudiantes[0].id,
      sesionId: porCodigo("1.2").id,
      texto:
        "La copla nombra un municipio tras otro con lo que cada uno produce. Es una manera de decir que la región se conocía por su abundancia, y por eso duele más lo que vino después.",
    },
  });

  // El avance ya no se siembra: se deduce del trabajo de arriba. Lo que sí hace
  // falta es el reparto de peso entre los ejes, que es decisión del docente.
  const ejesDelCaso = await prisma.eje.findMany({
    where: { casoId: caso.id },
    orderBy: { orden: "asc" },
    select: { id: true },
  });
  const reparto = [30, 10, 10, 30, 10, 10];
  await prisma.$transaction(
    ejesDelCaso.map((eje, i) =>
      prisma.eje.update({ where: { id: eje.id }, data: { peso: reparto[i] ?? 0 } })
    )
  );

  // Julián deja hecha una segunda sesión, para que el grupo no vaya parejo.
  await prisma.respuestaActividad.create({
    data: {
      userId: estudiantes[1].id,
      sesionId: porCodigo("1.2").id,
      texto:
        "Me llamó la atención que la copla nombre tantos municipios por su comida. Suena a que la tierra alcanzaba para todos.",
    },
  });

  // Cuenta recién creada, para poder mostrar la pantalla de primer ingreso.
  await prisma.user.create({
    data: {
      usuario: "andres.villalba",
      email: "andres.villalba@memoriaelsalado.edu.co",
      nombre: "Andrés Villalba",
      iniciales: "AV",
      rol: "ESTUDIANTE",
      subpoblacion: "Víctimas directas",
      passwordHash: await bcrypt.hash("Vela.trigo78", 10),
      debeCambiarContrasena: true,
      creadoPorId: docente.id,
    },
  });

  const publicadas = sesiones.filter((s) => s.publicada).length;
  console.log(`
Listo.
  Módulo "${caso.nombre}" · ${arbol.length} ejes · ${sesiones.length} sesiones (${publicadas} publicadas)

  Administrador  admin.sistema
  Docente        liliana.ramirez
  Estudiantes    ${ESTUDIANTES.map((e) => e.usuario).join(", ")}
  Contraseña     ${CLAVE}

  Con el cambio de contraseña pendiente, para ver el primer ingreso:
  andres.villalba · Vela.trigo78
`);
}

main().finally(() => prisma.$disconnect());
