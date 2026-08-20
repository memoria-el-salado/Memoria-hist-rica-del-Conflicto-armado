/*
  Warnings:

  - You are about to drop the column `curada` on the `FlorJardin` table. All the data in the column will be lost.
  - You are about to drop the `ParticipacionForo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProgresoSesion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProtocoloAlerta` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ParticipacionForo" DROP CONSTRAINT "ParticipacionForo_foroId_fkey";

-- DropForeignKey
ALTER TABLE "ParticipacionForo" DROP CONSTRAINT "ParticipacionForo_userId_fkey";

-- DropForeignKey
ALTER TABLE "ProgresoSesion" DROP CONSTRAINT "ProgresoSesion_sesionId_fkey";

-- AlterTable
ALTER TABLE "FlorJardin" DROP COLUMN "curada";

-- DropTable
DROP TABLE "ParticipacionForo";

-- DropTable
DROP TABLE "ProgresoSesion";

-- DropTable
DROP TABLE "ProtocoloAlerta";
