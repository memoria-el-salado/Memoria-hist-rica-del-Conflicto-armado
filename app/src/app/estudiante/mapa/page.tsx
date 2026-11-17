import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { avanceDeEstudiante } from "@/lib/avance";
import { etiquetaCurso } from "@/lib/cursos";
import { avanceDeCompetencias } from "@/lib/competencias";
import { recorridoDe } from "@/lib/recorrido-datos";
import { ACTIVIDADES } from "@/lib/importador-pdf";
import { puedeVerRecurso } from "@/lib/recursos";
import { siguienteDelViaje } from "@/lib/ruta";
import { estadoAccesibilidad } from "@/lib/transcripcion";
import { esExplorador } from "@/lib/exploradores";

import { MapaViaje } from "./mapa-viaje";

export default async function MapaPage() {
  const sesion = await auth();
  const userId = sesion!.user.id;

  const [ejes, casos, anotaciones, marcas, simulaciones, flores, avance, yo, recursos] = await Promise.all([
    prisma.eje.findMany({
      where: { caso: { activo: true } },
      orderBy: { orden: "asc" },
      include: {
        sesiones: {
          orderBy: { orden: "asc" },
          include: { subsecciones: { orderBy: { orden: "asc" } } },
        },
      },
    }),
    prisma.caso.findMany({ orderBy: { creadoEn: "asc" } }),
    prisma.anotacion.count({ where: { autorId: userId } }),
    prisma.marcaCartografia.count({ where: { autorId: userId } }),
    prisma.simulacion.findMany({ where: { userId, validadaEn: { not: null } } }),
    prisma.florJardin.count({ where: { autorId: userId } }),
    // El avance sale del trabajo hecho, sesión por sesión.
    avanceDeEstudiante(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { explorador: true, curso: { select: { nombre: true, anio: true } }, grupo: { select: { nombre: true } } },
    }),
    // El material del módulo, para decir en el mapa cuánto trae cada sesión.
    prisma.recurso.findMany({
      where: { eje: { caso: { activo: true } } },
      select: { ejeId: true, sesionId: true, tipo: true, enlace: true, contexto: true, transcripcion: true, sesion: { select: { publicada: true } } },
    }),
  ]);

  // Solo cuenta el material que el estudiante puede ver.
  const visibles = recursos.filter((r) =>
    puedeVerRecurso("ESTUDIANTE", {
      casoActivo: true,
      sesionPublicada: r.sesion ? r.sesion.publicada : null,
      accesible: estadoAccesibilidad(r).visibleParaEstudiantes,
    })
  );
  const materialDeSesion = new Map<string, number>();
  const materialDeEje = new Map<string, number>();
  for (const r of visibles) {
    if (r.sesionId) materialDeSesion.set(r.sesionId, (materialDeSesion.get(r.sesionId) ?? 0) + 1);
    else materialDeEje.set(r.ejeId, (materialDeEje.get(r.ejeId) ?? 0) + 1);
  }
  const actividadDe = new Map<string, string>(ACTIVIDADES.map((a) => [a.valor, a.etiqueta]));

  // En la primera entrada, el estudiante elige a su explorador.
  if (!yo?.explorador) redirect("/estudiante/explorador");

  // Con quién hace el viaje: su curso y, si el docente lo armó, su grupo de trabajo.
  const pertenencia = yo?.curso
    ? [`Curso ${etiquetaCurso(yo.curso)}`, yo.grupo && `Grupo ${yo.grupo.nombre}`].filter(Boolean).join(" · ")
    : null;

  const porEje = new Map(avance.ejes.map((e) => [e.ejeId, e]));
  const recorrido = await recorridoDe(userId, avance);
  const nombreDe = new Map(ejes.map((e) => [e.id, e.esPreambulo ? "el preámbulo" : `el eje ${e.numero}`]));

  // Las competencias salen de las mismas sesiones hechas que el avance.
  const competencias = avanceDeCompetencias(
    ejes.flatMap((e) => e.sesiones.map((s) => ({ pantalla: s.pantalla, publicada: s.publicada, completada: avance.completadas.has(s.id) })))
  );

  const datos = ejes.map((e) => {
    const suyo = porEje.get(e.id);
    return {
      id: e.id,
      numero: e.numero,
      nombre: e.nombre,
      descripcion: e.descripcion,
      objetivoGeneral: e.objetivoGeneral,
      esPreambulo: e.esPreambulo,
      tono: e.tono,
      progreso: suyo?.progreso ?? 0,
      peso: e.peso,
      completadas: suyo?.completadas ?? 0,
      material: materialDeEje.get(e.id) ?? 0,
      // En un curso que recorre el mapa en orden, un eje puede estar cerrado.
      bloqueo: (() => {
        const estado = recorrido.ejes.get(e.id);
        if (!estado || estado.abierto) return null;
        return `Se abre al llegar al ${recorrido.umbral}% en ${nombreDe.get(estado.requiereDe ?? "") ?? "el eje anterior"}, o cuando tu docente lo abra.`;
      })(),
      sesiones: e.sesiones.map((s) => ({
        id: s.id,
        codigo: s.codigo,
        titulo: s.titulo,
        objetivo: s.objetivo,
        tipo: actividadDe.get(s.pantalla) ?? s.tipo,
        material: materialDeSesion.get(s.id) ?? 0,
        pantalla: s.pantalla,
        publicada: s.publicada,
        // Con el texto del documento la sesión se puede leer; sin él, el
        // estudiante solo dispone del esquema de subsecciones.
        tieneContenido: Boolean(s.contenido?.trim()),
        completada: avance.completadas.has(s.id),
        subsecciones: s.subsecciones.map((sub) => ({ codigo: sub.codigo, titulo: sub.titulo })),
      })),
    };
  });

  // Por dónde sigue el viaje: la primera sesión publicada y sin hacer de un eje abierto.
  const siguiente = siguienteDelViaje(
    datos.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      bloqueado: Boolean(e.bloqueo),
      sesiones: e.sesiones.map((s) => ({ id: s.id, codigo: s.codigo, titulo: s.titulo, publicada: s.publicada, completada: s.completada })),
    }))
  );

  // Solo se ubican en el mapa los casos que tienen coordenadas registradas.
  const estaciones = casos
    .filter((c) => c.lat !== null && c.lon !== null)
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      lat: c.lat!,
      lon: c.lon!,
      activo: c.activo,
    }));

  // Indicadores calculados sobre la participación real del estudiante.
  const indicadores = [
    { nombre: "APORTES AL ARCHIVO", valor: anotaciones, color: "#D95D39" },
    { nombre: "LUGARES MARCADOS", valor: marcas, color: "#1B8A8A" },
    { nombre: "MEMORIAS SEMBRADAS", valor: flores, color: "#EBB035" },
  ];

  return (
    <MapaViaje
      ejes={datos}
      estaciones={estaciones}
      casosSinUbicar={casos.length - estaciones.length}
      pertenencia={pertenencia}
      explorador={esExplorador(yo?.explorador) ? yo.explorador : null}
      siguiente={siguiente ? { ejeId: siguiente.ejeId, id: siguiente.sesion.id, codigo: siguiente.sesion.codigo, titulo: siguiente.sesion.titulo } : null}
      competencias={competencias.map((c) => ({ id: c.id, nombre: c.nombre, descripcion: c.descripcion, hechas: c.hechas, total: c.total, porcentaje: c.porcentaje }))}
      indicadores={indicadores}
      equidad={
        simulaciones.length
          ? Math.round(simulaciones.reduce((s, x) => s + x.indiceEquidad, 0) / simulaciones.length)
          : null
      }
    />
  );
}
