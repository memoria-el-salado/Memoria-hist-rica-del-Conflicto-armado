import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { DatosSesion } from "@/components/actividades/cabecera-sesion";
import { LecturaAnotada } from "@/components/actividades/lectura-anotada";
import { RespuestaEscrita } from "@/components/actividades/respuesta-escrita";
import { CartografiaSocial } from "@/components/actividades/cartografia-social";
import { SimuladorTierras } from "@/components/actividades/simulador-tierras";
import { JardinMemoria } from "@/components/actividades/jardin-memoria";
import { DiarioSesion } from "@/components/actividades/diario-sesion";
import type { Asignacion } from "@/lib/simulador";

/**
 * Una sesión, una actividad.
 *
 * La pantalla que se muestra la decide el campo `pantalla` que el administrador
 * asignó al importar el módulo, y el contenido sale de la propia sesión. Antes
 * había una ruta fija por actividad con contenido de ejemplo, de modo que todas
 * las sesiones llevaban al mismo sitio.
 */

export default async function SesionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const autenticacion = await auth();
  const userId = autenticacion!.user.id;

  const sesion = await prisma.sesion.findUnique({
    where: { id },
    include: {
      eje: { include: { caso: { include: { documentos: { take: 1 } } } } },
      subsecciones: { orderBy: { orden: "asc" } },
    },
  });

  if (!sesion) notFound();

  // Una sesión sin publicar no está disponible para el estudiante todavía.
  if (!sesion.publicada) {
    return (
      <div className="animar-aparecer mx-auto max-w-[560px] py-16 text-center">
        <h1 className="text-[20px] font-extrabold">Esta sesión aún no está disponible</h1>
        <p className="mt-2 text-[13.5px] leading-[1.7] text-apagado">
          Tu docente todavía no la ha publicado. Aparecerá en tu mapa del viaje en cuanto la
          habilite.
        </p>
      </div>
    );
  }

  const documento = sesion.eje.caso.documentos[0] ?? null;

  const datos: DatosSesion = {
    id: sesion.id,
    codigo: sesion.codigo,
    titulo: sesion.titulo,
    objetivo: sesion.objetivo,
    contenido: sesion.contenido,
    preguntaOrientadora: sesion.preguntaOrientadora,
    alertaCuidado: sesion.alertaCuidado,
    eje: { numero: sesion.eje.numero, nombre: sesion.eje.nombre, tono: sesion.eje.tono },
    subsecciones: sesion.subsecciones.map((s) => ({
      id: s.id,
      codigo: s.codigo,
      titulo: s.titulo,
      contenido: s.contenido,
    })),
    documento: documento ? { id: documento.id, titulo: documento.titulo } : null,
  };

  switch (sesion.pantalla) {
    case "cartografia": {
      const marcas = await prisma.marcaCartografia.findMany({
        where: { sesionId: sesion.id },
        orderBy: { creadoEn: "asc" },
        include: { autor: { select: { nombre: true } } },
      });
      return (
        <CartografiaSocial
          sesion={datos}
          marcas={marcas.map((m) => ({
            id: m.id,
            lugar: m.lugar,
            relato: m.relato,
            audio: m.audio,
            // El campo se guarda como JSON para ser compatible con MySQL.
            tags: Array.isArray(m.tags) ? (m.tags as string[]) : [],
            lat: m.lat,
            lon: m.lon,
            autor: m.autor.nombre,
          }))}
        />
      );
    }

    case "simulador": {
      const [familias, simulacion] = await Promise.all([
        prisma.familia.findMany({ orderBy: { orden: "asc" } }),
        prisma.simulacion.findUnique({
          where: { userId_sesionId: { userId, sesionId: sesion.id } },
          include: { asignaciones: true },
        }),
      ]);

      const iniciales: Record<string, Asignacion> = {};
      for (const familia of familias) {
        const previa = simulacion?.asignaciones.find((a) => a.familiaId === familia.id);
        iniciales[familia.id] = {
          hectareas: previa?.hectareas ?? 0,
          subsidio: previa?.subsidio ?? "NINGUNO",
        };
      }

      return (
        <SimuladorTierras
          sesion={datos}
          familias={familias.map((f) => ({
            id: f.id,
            nombre: f.nombre,
            personas: f.personas,
            menores: f.menores,
            cabezaMujer: f.cabezaMujer,
            etnica: f.etnica,
            retornada: f.retornada,
            prioridad: f.prioridad,
          }))}
          iniciales={iniciales}
        />
      );
    }

    case "jardin": {
      const flores = await prisma.florJardin.findMany({
        where: { sesionId: sesion.id },
        orderBy: { creadoEn: "asc" },
      });
      return (
        <JardinMemoria
          sesion={datos}
          flores={flores.map((f) => ({
            id: f.id,
            nombre: f.nombre,
            legado: f.legado,
            epoca: f.epoca,
            pieza: f.pieza,
            tono: f.tono,
            altura: f.altura,
          }))}
        />
      );
    }

    case "diario": {
      const entradas = await prisma.entradaDiario.findMany({
        where: { sesionId: sesion.id, autorId: userId },
        orderBy: { creadoEn: "desc" },
      });
      return (
        <DiarioSesion
          sesion={datos}
          entradas={entradas.map((e) => ({
            id: e.id,
            emocion: e.emocion,
            texto: e.texto,
            privada: e.privada,
            fecha: e.creadoEn.toLocaleDateString("es-CO", { day: "numeric", month: "long" }),
          }))}
        />
      );
    }

    case "copla": {
      const previa = await prisma.respuestaActividad.findUnique({
        where: { userId_sesionId: { userId, sesionId: sesion.id } },
      });
      return <RespuestaEscrita sesion={datos} respuestaPrevia={previa?.texto ?? ""} />;
    }

    default: {
      const anotaciones = await prisma.anotacion.findMany({
        where: { sesionId: sesion.id },
        orderBy: { creadoEn: "desc" },
        include: { autor: { select: { nombre: true, iniciales: true, rol: true } } },
      });
      return (
        <LecturaAnotada
          sesion={datos}
          anotaciones={anotaciones.map((a) => ({
            id: a.id,
            autor: a.autor.nombre,
            iniciales: a.autor.iniciales,
            rol: a.autor.rol === "DOCENTE" ? "DOCENTE" : "ESTUDIANTE",
            cita: a.cita,
            texto: a.texto,
            hora: a.creadoEn.toLocaleDateString("es-CO", { day: "numeric", month: "short" }),
          }))}
        />
      );
    }
  }
}
