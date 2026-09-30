-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ESTUDIANTE', 'DOCENTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoRecurso" AS ENUM ('VIDEO', 'AUDIO', 'DOCUMENTO', 'SIMULADOR');

-- CreateEnum
CREATE TYPE "EstadoCaso" AS ENUM ('ACTIVO', 'EN_CURADURIA', 'BORRADOR');

-- CreateEnum
CREATE TYPE "Epoca" AS ENUM ('ANTES_1997', 'ENTRE_1997_2000', 'RETORNO');

-- CreateEnum
CREATE TYPE "PiezaJardin" AS ENUM ('FLOR', 'HOJA', 'SEMILLA', 'MANO');

-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "Subsidio" AS ENUM ('NINGUNO', 'RIEGO', 'AGRICULTURA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "iniciales" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "subpoblacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "debeCambiarContrasena" BOOLEAN NOT NULL DEFAULT true,
    "contrasenaCambiadaEn" TIMESTAMP(3),
    "creadoPorId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caso" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "depto" TEXT NOT NULL,
    "estado" "EstadoCaso" NOT NULL DEFAULT 'EN_CURADURIA',
    "version" TEXT NOT NULL DEFAULT '0.1.0',
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Caso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Eje" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "objetivoGeneral" TEXT,
    "tono" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "esPreambulo" BOOLEAN NOT NULL DEFAULT false,
    "peso" INTEGER NOT NULL DEFAULT 0,
    "casoId" TEXT NOT NULL,

    CONSTRAINT "Eje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "objetivo" TEXT,
    "tipo" TEXT NOT NULL,
    "pantalla" TEXT NOT NULL,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "alertaCuidado" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL,
    "contenido" TEXT,
    "preguntaOrientadora" TEXT,
    "ejeId" TEXT NOT NULL,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subseccion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "contenido" TEXT,
    "sesionId" TEXT NOT NULL,

    CONSTRAINT "Subseccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoFuente" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "rutaArchivo" TEXT NOT NULL,
    "paginas" INTEGER NOT NULL,
    "subidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soloDocentes" BOOLEAN NOT NULL DEFAULT false,
    "casoId" TEXT,

    CONSTRAINT "DocumentoFuente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recurso" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contexto" TEXT NOT NULL,
    "tipo" "TipoRecurso" NOT NULL,
    "alerta" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ejeId" TEXT NOT NULL,
    "autorId" TEXT,

    CONSTRAINT "Recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditoriaAccesibilidad" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "transcripcion" BOOLEAN NOT NULL DEFAULT false,
    "contraste" BOOLEAN NOT NULL DEFAULT false,
    "responsivo" BOOLEAN NOT NULL DEFAULT false,
    "revisadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recursoId" TEXT NOT NULL,

    CONSTRAINT "AuditoriaAccesibilidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anotacion" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "cita" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,

    CONSTRAINT "Anotacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarcaCartografia" (
    "id" TEXT NOT NULL,
    "lugar" TEXT NOT NULL,
    "relato" TEXT NOT NULL,
    "audio" TEXT NOT NULL DEFAULT 'Sin audio',
    "tags" TEXT[],
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,

    CONSTRAINT "MarcaCartografia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulacion" (
    "id" TEXT NOT NULL,
    "indiceEquidad" INTEGER NOT NULL DEFAULT 0,
    "validadaEn" TIMESTAMP(3),
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,

    CONSTRAINT "Simulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Familia" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "personas" INTEGER NOT NULL,
    "menores" INTEGER NOT NULL,
    "cabezaMujer" BOOLEAN NOT NULL,
    "etnica" BOOLEAN NOT NULL,
    "retornada" BOOLEAN NOT NULL,
    "prioridad" "Prioridad" NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "Familia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asignacion" (
    "id" TEXT NOT NULL,
    "hectareas" INTEGER NOT NULL DEFAULT 0,
    "subsidio" "Subsidio" NOT NULL DEFAULT 'NINGUNO',
    "simulacionId" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,

    CONSTRAINT "Asignacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlorJardin" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "legado" TEXT NOT NULL,
    "epoca" "Epoca" NOT NULL,
    "pieza" "PiezaJardin" NOT NULL,
    "tono" TEXT NOT NULL,
    "altura" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" TEXT,
    "sesionId" TEXT NOT NULL,

    CONSTRAINT "FlorJardin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntradaDiario" (
    "id" TEXT NOT NULL,
    "emocion" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "privada" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" TEXT NOT NULL,
    "sesionId" TEXT,

    CONSTRAINT "EntradaDiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foro" (
    "id" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "rolA" TEXT NOT NULL,
    "rolB" TEXT NOT NULL,
    "fuentes" TEXT NOT NULL DEFAULT 'Por asignar',
    "abierto" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" TEXT,

    CONSTRAINT "Foro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespuestaActividad" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,

    CONSTRAINT "RespuestaActividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReporteDiferenciado" (
    "id" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReporteDiferenciado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_usuario_key" ON "User"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Caso_nombre_key" ON "Caso"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Eje_casoId_numero_key" ON "Eje"("casoId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_ejeId_codigo_key" ON "Sesion"("ejeId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Subseccion_sesionId_codigo_key" ON "Subseccion"("sesionId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "AuditoriaAccesibilidad_recursoId_key" ON "AuditoriaAccesibilidad"("recursoId");

-- CreateIndex
CREATE INDEX "Anotacion_sesionId_idx" ON "Anotacion"("sesionId");

-- CreateIndex
CREATE INDEX "MarcaCartografia_sesionId_idx" ON "MarcaCartografia"("sesionId");

-- CreateIndex
CREATE UNIQUE INDEX "Simulacion_userId_sesionId_key" ON "Simulacion"("userId", "sesionId");

-- CreateIndex
CREATE UNIQUE INDEX "Familia_orden_key" ON "Familia"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "Asignacion_simulacionId_familiaId_key" ON "Asignacion"("simulacionId", "familiaId");

-- CreateIndex
CREATE INDEX "FlorJardin_sesionId_idx" ON "FlorJardin"("sesionId");

-- CreateIndex
CREATE INDEX "EntradaDiario_sesionId_idx" ON "EntradaDiario"("sesionId");

-- CreateIndex
CREATE UNIQUE INDEX "RespuestaActividad_userId_sesionId_key" ON "RespuestaActividad"("userId", "sesionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eje" ADD CONSTRAINT "Eje_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_ejeId_fkey" FOREIGN KEY ("ejeId") REFERENCES "Eje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subseccion" ADD CONSTRAINT "Subseccion_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoFuente" ADD CONSTRAINT "DocumentoFuente_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurso" ADD CONSTRAINT "Recurso_ejeId_fkey" FOREIGN KEY ("ejeId") REFERENCES "Eje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurso" ADD CONSTRAINT "Recurso_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditoriaAccesibilidad" ADD CONSTRAINT "AuditoriaAccesibilidad_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anotacion" ADD CONSTRAINT "Anotacion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anotacion" ADD CONSTRAINT "Anotacion_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarcaCartografia" ADD CONSTRAINT "MarcaCartografia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarcaCartografia" ADD CONSTRAINT "MarcaCartografia_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulacion" ADD CONSTRAINT "Simulacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulacion" ADD CONSTRAINT "Simulacion_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "Simulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlorJardin" ADD CONSTRAINT "FlorJardin_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlorJardin" ADD CONSTRAINT "FlorJardin_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntradaDiario" ADD CONSTRAINT "EntradaDiario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntradaDiario" ADD CONSTRAINT "EntradaDiario_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foro" ADD CONSTRAINT "Foro_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespuestaActividad" ADD CONSTRAINT "RespuestaActividad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespuestaActividad" ADD CONSTRAINT "RespuestaActividad_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
