/**
 * Mantenimiento de los módulos y del almacén de documentos.
 *
 *   npm run modulos              estado actual
 *   npm run modulos -- limpiar   borra módulos y documentos, y sus PDF del disco
 *   npm run modulos -- huerfanos borra los PDF que ya no tienen ficha
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { eliminarDocumento, listarDocumentos } from "../src/lib/almacen";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

/** Archivos del almacén que ya no corresponden a ningún documento registrado. */
async function huerfanos(): Promise<string[]> {
  const guardados = await listarDocumentos();
  const registrados = new Set((await prisma.documentoFuente.findMany()).map((d) => d.id));
  return guardados.filter((id) => !registrados.has(id));
}

async function borrarArchivos(ids: string[]) {
  // El archivo puede haber desaparecido ya; eso no interrumpe la limpieza.
  for (const id of ids) await eliminarDocumento(id);
}

async function estado() {
  const casos = await prisma.caso.findMany({
    include: { ejes: { include: { sesiones: true } }, documentos: true },
    orderBy: { creadoEn: "asc" },
  });
  const sueltos = await prisma.documentoFuente.findMany({ where: { casoId: null } });

  for (const caso of casos) {
    const sesiones = caso.ejes.reduce((t, e) => t + e.sesiones.length, 0);
    const publicadas = caso.ejes.reduce((t, e) => t + e.sesiones.filter((s) => s.publicada).length, 0);
    console.log(
      `Módulo "${caso.nombre}" · ${caso.ejes.length} ejes · ${sesiones} sesiones (${publicadas} publicadas) · activo=${caso.activo}`
    );
    for (const d of caso.documentos) {
      console.log(`   ${d.soloDocentes ? "[solo docentes]" : "[abierto]      "} ${d.nombreArchivo}`);
    }
  }

  if (sueltos.length) {
    console.log("\nDocumentos sin módulo:");
    for (const d of sueltos) {
      console.log(`   ${d.soloDocentes ? "[solo docentes]" : "[abierto]      "} ${d.nombreArchivo}`);
    }
  }
  if (!casos.length && !sueltos.length) console.log("No hay módulos ni documentos cargados.");

  const sobrantes = await huerfanos();
  if (sobrantes.length) {
    console.log(`\n${sobrantes.length} PDF en el almacén sin ficha. Para borrarlos:`);
    console.log("   npm run modulos -- huerfanos");
  }
}

async function limpiar() {
  // Se toman los nombres antes de borrar las fichas: después no habría forma
  // de saber qué archivos pertenecían a la plataforma.
  const documentos = await prisma.documentoFuente.findMany();

  const casos = await prisma.caso.deleteMany();
  await prisma.documentoFuente.deleteMany();
  await borrarArchivos(documentos.map((d) => d.id));

  console.log(`Módulos borrados: ${casos.count} · documentos: ${documentos.length}`);
}

async function main() {
  const orden = process.argv[2] ?? "estado";

  if (orden === "limpiar") return limpiar();

  if (orden === "huerfanos") {
    const sobrantes = await huerfanos();
    await borrarArchivos(sobrantes);
    console.log(`PDF huérfanos borrados: ${sobrantes.length}`);
    return;
  }

  return estado();
}

main().finally(() => prisma.$disconnect());
