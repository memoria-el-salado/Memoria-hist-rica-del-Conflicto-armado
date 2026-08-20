/**
 * Borra los módulos importados y sus documentos fuente, dejando intactos los
 * usuarios y las familias del simulador. Útil para repetir una importación
 * mientras se afina el extractor.
 *
 *   npx tsx scripts/limpiar-modulos.ts
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
  const casos = await prisma.caso.deleteMany();
  const documentos = await prisma.documentoFuente.deleteMany();
  console.log(`Módulos borrados: ${casos.count} · documentos: ${documentos.count}`);
}

main().finally(() => prisma.$disconnect());
