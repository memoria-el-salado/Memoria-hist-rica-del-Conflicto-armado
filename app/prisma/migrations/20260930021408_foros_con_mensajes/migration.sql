-- CreateEnum
CREATE TYPE "Postura" AS ENUM ('A', 'B');

-- AlterTable
ALTER TABLE "Foro" ADD COLUMN     "sesionId" TEXT;

-- CreateTable
CREATE TABLE "ParticipanteForo" (
    "id" TEXT NOT NULL,
    "postura" "Postura" NOT NULL,
    "foroId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ParticipanteForo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensajeForo" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "fuente" TEXT,
    "postura" "Postura",
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "foroId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "respuestaAId" TEXT,

    CONSTRAINT "MensajeForo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParticipanteForo_foroId_userId_key" ON "ParticipanteForo"("foroId", "userId");

-- CreateIndex
CREATE INDEX "MensajeForo_foroId_idx" ON "MensajeForo"("foroId");

-- AddForeignKey
ALTER TABLE "Foro" ADD CONSTRAINT "Foro_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipanteForo" ADD CONSTRAINT "ParticipanteForo_foroId_fkey" FOREIGN KEY ("foroId") REFERENCES "Foro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipanteForo" ADD CONSTRAINT "ParticipanteForo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeForo" ADD CONSTRAINT "MensajeForo_foroId_fkey" FOREIGN KEY ("foroId") REFERENCES "Foro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeForo" ADD CONSTRAINT "MensajeForo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeForo" ADD CONSTRAINT "MensajeForo_respuestaAId_fkey" FOREIGN KEY ("respuestaAId") REFERENCES "MensajeForo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

