/**
 * Cambios de esquema sobre la base en uso, sin perder datos ni romper la
 * versión publicada.
 *
 *   npm run db:migracion -- <nombre>   crea la migración que lleva la base al esquema
 *   npm run db:migrar                  copia la base y aplica las migraciones pendientes
 *   npm run db:estado                  qué migraciones hay aplicadas y cuáles no
 *
 * No se usa `prisma migrate dev`: necesita una base auxiliar y, si encuentra
 * diferencias que no sabe explicar, ofrece vaciar la base entera. Aquí la
 * migración se calcula comparando la base real con el esquema, y antes de
 * escribirla o aplicarla se revisa con `riesgosDeMigracion` (src/lib/migraciones.ts):
 * solo pasa lo que la versión publicada tolera. Lo demás exige añadir
 * `--permitir-destructiva`, y queda para la migración que acompaña a una
 * publicación.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { riesgosDeMigracion, type Riesgo } from "../src/lib/migraciones";

const RAIZ = process.cwd();
const CARPETA = path.join(RAIZ, "prisma", "migrations");
const PRISMA = path.join(RAIZ, "node_modules", ".bin", "prisma");

const [orden, ...resto] = process.argv.slice(2);
const permitirDestructiva = resto.includes("--permitir-destructiva");
const nombre = resto.find((a) => !a.startsWith("--"));

function prisma(args: string[], capturar = false): string {
  const salida = execFileSync(PRISMA, args, {
    cwd: RAIZ,
    encoding: "utf8",
    stdio: capturar ? ["ignore", "pipe", "pipe"] : "inherit",
    env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  });
  return salida ?? "";
}

function mostrarRiesgos(archivo: string, riesgos: Riesgo[]) {
  console.error(`\n${archivo} tiene cambios que la versión publicada no tolera:\n`);
  for (const r of riesgos) console.error(`  línea ${r.linea}: ${r.motivo}\n    ${r.sentencia}\n`);
  console.error(
    "Replantea el cambio para que solo añada (columna opcional o con valor por defecto,\n" +
      "tabla nueva). Si es la migración de una publicación y es intencionado, repite\n" +
      "con --permitir-destructiva después de hacer la copia de seguridad."
  );
}

/** Migraciones de la carpeta que la base todavía no tiene aplicadas. */
async function pendientes(): Promise<string[]> {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });
  try {
    const aplicadas: { migration_name: string }[] = await db.$queryRaw`
      SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    const hechas = new Set(aplicadas.map((a) => a.migration_name));
    return readdirSync(CARPETA)
      .filter((d) => existsSync(path.join(CARPETA, d, "migration.sql")))
      .sort()
      .filter((d) => !hechas.has(d));
  } catch {
    throw new Error(
      'La base no tiene la tabla "_prisma_migrations". Márcala primero con:\n' +
        "  npx prisma migrate resolve --applied 0_inicial"
    );
  } finally {
    await db.$disconnect();
  }
}

async function nueva() {
  if (!nombre || !/^[a-z0-9_]+$/.test(nombre)) {
    console.error("Indica un nombre en minúsculas y con guiones bajos: npm run db:migracion -- foros_con_mensajes");
    process.exit(1);
  }

  const sinAplicar = await pendientes();
  if (sinAplicar.length) {
    console.error(`Hay migraciones sin aplicar (${sinAplicar.join(", ")}). Aplícalas antes con npm run db:migrar.`);
    process.exit(1);
  }

  const sql = prisma(
    ["migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--script"],
    true
  );
  if (!sql.replace(/--.*$/gm, "").trim()) {
    console.log("La base ya coincide con el esquema: no hay nada que migrar.");
    return;
  }

  const riesgos = riesgosDeMigracion(sql);
  if (riesgos.length && !permitirDestructiva) {
    mostrarRiesgos("La migración propuesta", riesgos);
    process.exit(1);
  }

  const marca = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const destino = path.join(CARPETA, `${marca}_${nombre}`);
  mkdirSync(destino, { recursive: true });
  writeFileSync(path.join(destino, "migration.sql"), sql);

  console.log(`\nMigración creada: prisma/migrations/${marca}_${nombre}/migration.sql\n`);
  console.log(sql.trim());
  console.log("\nRevísala y aplícala con: npm run db:migrar");
}

async function aplicar() {
  const sinAplicar = await pendientes();
  if (!sinAplicar.length) {
    console.log("No hay migraciones pendientes.");
    return;
  }

  for (const m of sinAplicar) {
    const riesgos = riesgosDeMigracion(readFileSync(path.join(CARPETA, m, "migration.sql"), "utf8"));
    if (riesgos.length && !permitirDestructiva) {
      mostrarRiesgos(m, riesgos);
      process.exit(1);
    }
  }

  console.log(`Pendientes: ${sinAplicar.join(", ")}\n`);
  // Sin copia no se toca la base: es lo único que permite volver atrás.
  execFileSync("node", [path.join(RAIZ, "scripts", "respaldar-bd.mjs")], { stdio: "inherit" });
  console.log();
  prisma(["migrate", "deploy"]);
}

async function main() {
  if (orden === "nueva") return nueva();
  if (orden === "aplicar") return aplicar();
  console.error("Uso: npm run db:migracion -- <nombre>   |   npm run db:migrar");
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
