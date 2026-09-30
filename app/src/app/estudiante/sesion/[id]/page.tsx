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
import { MaterialSesion } from "@/components/recursos/material-sesion";
import { vistaDeRecurso } from "@/lib/material";
import { puedeVerRecurso } from "@/lib/recursos";
import { estadoAccesibilidad } from "@/lib/transcripcion";
import { PuertaCuidado } from "@/components/cuidado/puerta-cuidado";
import { TEXTO_ALERTA_PREDETERMINADO } from "@/lib/cuidado";

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
      eje: {
        include: {
          caso: {
            include: {
              // El estudiante solo ve las guías pensadas para él; las de
              // maestros traen las respuestas y quedan fuera de su alcance.
              documentos: { where: { soloDocentes: false }, take: 1 },
            },
          },
        },
      },
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

  const [actividad, recursos] = await Promise.all([
    pantallaDeActividad(sesion.pantalla, sesion.id, datos, userId),
    prisma.recurso.findMany({
      // El material de la sesión y el que el docente cargó para todo el eje.
      where: { OR: [{ sesionId: sesion.id }, { sesionId: null, ejeId: sesion.ejeId }] },
      orderBy: { creadoEn: "asc" },
    }),
  ]);

  // Solo el material accesible: un audio o un video sin su transcripción no se publica.
  const visibles = recursos.filter((r) =>
    puedeVerRecurso("ESTUDIANTE", {
      casoActivo: sesion.eje.caso.activo,
      sesionPublicada: true,
      accesible: estadoAccesibilidad(r).visibleParaEstudiantes,
    })
  );

  const contenido = (
    <>
      {actividad}
      <MaterialSesion recursos={visibles.map(vistaDeRecurso)} />
    </>
  );

  // Con alerta de cuidado, el estudiante lee el aviso y decide antes de entrar.
  if (!sesion.alertaCuidado) return contenido;
  return (
    <PuertaCuidado
      sesionId={sesion.id}
      codigo={sesion.codigo}
      titulo={sesion.titulo}
      texto={sesion.textoAlerta ?? TEXTO_ALERTA_PREDETERMINADO}
    >
      {contenido}
    </PuertaCuidado>
  );
}

/** La pantalla de la actividad que el administrador asignó a la sesión. */
async function pantallaDeActividad(pantalla: string, sesionId: string, datos: DatosSesion, userId: string) {
  switch (pantalla) {
    case "cartografia": {
      const marcas = await prisma.marcaCartografia.findMany({
        where: { sesionId: sesionId },
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
            tags: m.tags,
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
          where: { userId_sesionId: { userId, sesionId: sesionId } },
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
        where: { sesionId: sesionId },
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
        where: { sesionId: sesionId, autorId: userId },
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
        where: { userId_sesionId: { userId, sesionId: sesionId } },
      });
      return <RespuestaEscrita sesion={datos} respuestaPrevia={previa?.texto ?? ""} />;
    }

    default: {
      const anotaciones = await prisma.anotacion.findMany({
        where: { sesionId: sesionId },
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
