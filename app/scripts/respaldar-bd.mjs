#!/usr/bin/env node
/**
 * Copia de seguridad de la base de datos, antes de cualquier cambio de esquema.
 *
 *   npm run db:respaldar
 *
 * Git puede devolver el código a una versión anterior, pero no los datos: ni
 * una migración aplicada ni una fila borrada se deshacen con un revert. Esta
 * copia es lo único que permite volver atrás en la base.
 *
 * Se guarda fuera del repositorio, en `respaldos-bd/` junto a la carpeta del
 * proyecto, porque contiene datos personales de estudiantes y docentes.
 * Solo copia el esquema `public`, que es donde viven las tablas de la
 * plataforma; el resto de esquemas de Supabase los gestiona Supabase.
 *
 * Para restaurar una copia:
 *   pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" <archivo>.dump
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "..", "..", "respaldos-bd");

// Homebrew instala libpq sin enlazarlo al PATH, así que se busca también ahí.
const PG_DUMP = ["/opt/homebrew/opt/libpq/bin/pg_dump", "/usr/local/opt/libpq/bin/pg_dump"].find(
  existsSync
) ?? "pg_dump";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL en app/.env.");
  process.exit(1);
}

// pg_dump necesita una conexión que mantenga la sesión abierta: la del
// pooler en modo transacción (6543) no la admite.
if (url.includes(":6543/")) {
  console.error("DATABASE_URL apunta al puerto 6543. Para copiar, usa la conexión de sesión (5432).");
  process.exit(1);
}

mkdirSync(destino, { recursive: true });
const marca = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const archivo = join(destino, `memoria-el-salado_${marca}.dump`);

console.log(`Copiando la base (esquema public)...`);
execFileSync(
  PG_DUMP,
  ["--format=custom", "--schema=public", "--no-owner", "--no-privileges", "--file", archivo, url],
  { stdio: ["ignore", "inherit", "inherit"] }
);

const kb = Math.round(statSync(archivo).size / 1024);
console.log(`Copia guardada: ${archivo} (${kb} KB)`);
