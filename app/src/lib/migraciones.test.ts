import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { riesgosDeMigracion } from "./migraciones";

/** Sentencias escritas como las genera `prisma migrate diff --script`. */
function riesgos(sql: string) {
  return riesgosDeMigracion(sql).map((r) => r.motivo);
}

describe("riesgosDeMigracion · lo que la v1 publicada tolera", () => {
  it("la migración inicial del proyecto no tiene ningún riesgo", () => {
    const sql = readFileSync(new URL("../../prisma/migrations/0_inicial/migration.sql", import.meta.url), "utf8");
    expect(riesgosDeMigracion(sql)).toEqual([]);
  });

  it("no confunde ON DELETE de una clave foránea con borrar filas", () => {
    expect(
      riesgos(`-- AddForeignKey
ALTER TABLE "Anotacion" ADD CONSTRAINT "Anotacion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`)
    ).toEqual([]);
  });

  it("acepta tablas nuevas y columnas opcionales o con valor por defecto", () => {
    expect(
      riesgos(`-- CreateTable
CREATE TABLE "MensajeForo" ("id" TEXT NOT NULL, "texto" TEXT NOT NULL, CONSTRAINT "MensajeForo_pkey" PRIMARY KEY ("id"));
-- AlterTable
ALTER TABLE "Sesion" ADD COLUMN "textoAlerta" TEXT,
ADD COLUMN "orden2" INTEGER NOT NULL DEFAULT 0;`)
    ).toEqual([]);
  });

  it("acepta volver opcional una columna y añadir un valor a un enum", () => {
    expect(
      riesgos(`ALTER TABLE "Foro" ALTER COLUMN "fuentes" DROP NOT NULL;
ALTER TYPE "TipoRecurso" ADD VALUE 'ENLACE';`)
    ).toEqual([]);
  });

  it("rechaza una columna obligatoria sin valor por defecto", () => {
    expect(riesgos(`ALTER TABLE "User" ADD COLUMN "cursoId" TEXT NOT NULL;`)).toEqual([
      "Añade una columna obligatoria sin valor por defecto: la versión publicada no la rellena.",
    ]);
  });

  it("juzga por separado cada columna de una misma sentencia", () => {
    expect(
      riesgos(`ALTER TABLE "User" ADD COLUMN "avatar" TEXT DEFAULT 'curioso',
ADD COLUMN "cursoId" TEXT NOT NULL;`)
    ).toHaveLength(1);
  });

  it("rechaza borrar columnas, tablas, índices y valores por defecto", () => {
    expect(riesgos(`ALTER TABLE "MarcaCartografia" DROP COLUMN "audio",\nADD COLUMN "audioId" TEXT;`)).toHaveLength(1);
    expect(riesgos(`DROP TABLE "ReporteDiferenciado";`)).toHaveLength(1);
    expect(riesgos(`DROP INDEX "Caso_nombre_key";`)).toHaveLength(1);
    expect(riesgos(`ALTER TABLE "Foro" ALTER COLUMN "fuentes" DROP DEFAULT;`)).toHaveLength(1);
  });

  it("rechaza endurecer o cambiar el tipo de una columna", () => {
    expect(riesgos(`ALTER TABLE "Foro" ALTER COLUMN "fuentes" SET NOT NULL;`)).toEqual([
      "Vuelve obligatoria una columna: la versión publicada no la rellena al insertar.",
    ]);
    expect(riesgos(`ALTER TABLE "Foro" ALTER COLUMN "abierto" SET DATA TYPE TEXT;`)).toEqual([
      "Cambia el tipo de una columna: puede perder datos o romper las lecturas.",
    ]);
  });

  it("detecta los pasos de quitar un valor de un enum", () => {
    const sql = `BEGIN;
CREATE TYPE "Rol_new" AS ENUM ('ESTUDIANTE', 'DOCENTE');
ALTER TABLE "User" ALTER COLUMN "rol" TYPE "Rol_new" USING ("rol"::text::"Rol_new");
ALTER TYPE "Rol" RENAME TO "Rol_old";
ALTER TYPE "Rol_new" RENAME TO "Rol";
DROP TYPE "Rol_old";
COMMIT;`;
    expect(riesgosDeMigracion(sql).map((r) => r.linea)).toEqual([3, 4, 5, 6]);
  });

  it("rechaza borrar o vaciar datos", () => {
    expect(riesgos(`DELETE FROM "Foro" WHERE "abierto" = false;`)).toEqual(["Borra filas."]);
    expect(riesgos(`TRUNCATE "Anotacion";`)).toEqual(["Vacía una tabla."]);
  });

  it("ignora lo que va en comentarios", () => {
    expect(riesgos(`-- DropTable: esto es solo un comentario de Prisma\nCREATE TABLE "X" ("id" TEXT);`)).toEqual([]);
  });

  it("indica la línea donde empieza la sentencia peligrosa", () => {
    const [r] = riesgosDeMigracion(`-- CreateTable
CREATE TABLE "A" ("id" TEXT);

-- AlterTable
ALTER TABLE "B" DROP COLUMN "c";`);
    expect(r.linea).toBe(5);
    expect(r.sentencia).toBe('ALTER TABLE "B" DROP COLUMN "c"');
  });
});
