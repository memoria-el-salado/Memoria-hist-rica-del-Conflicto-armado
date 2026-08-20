/**
 * Muestra el estado del repositorio de documentos y de los módulos.
 *
 *   npx tsx scripts/estado.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const url = process.env.DATABASE_URL ?? "";
const prisma = new PrismaClient({
  adapter: url.startsWith("mysql:") ? new PrismaMariaDb(url) : new PrismaPg({ connectionString: url }),
});

async function main() {
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
}

main().finally(() => prisma.$disconnect());
