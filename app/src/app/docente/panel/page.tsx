import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { avanceDeEstudiantes, promedioDelGrupo } from "@/lib/avance";
import { ordenarSolicitudes } from "@/lib/cuidado";
import { fechaYHora } from "@/lib/fechas";
import { cursoElegido, etiquetaCurso } from "@/lib/cursos";
import { FiltroCurso } from "@/components/filtro-curso";
import { resumenDeSubpoblaciones } from "@/lib/subpoblaciones-datos";
import { avanceDeCompetencias, promedioDeCompetencias } from "@/lib/competencias";
import { trabajosDeDocente } from "@/lib/trabajos";
import { PanelDocente } from "./panel-docente";

/** El año en curso, para rotular el ciclo cuando no hay curso elegido. */
const anioActual = () => new Date().getFullYear();


/** Los atendidos se muestran un tiempo para dejar constancia; luego salen del panel. */
const DIAS_ATENDIDAS = 14;

/** Los pedidos que esperan y los atendidos en los últimos días. */
function solicitudesDe(docenteId: string) {
  return prisma.solicitudAcompanamiento.findMany({
    where: {
      docenteId,
      OR: [{ atendidaEn: null }, { atendidaEn: { gte: new Date(Date.now() - DIAS_ATENDIDAS * 86_400_000) } }],
    },
    include: {
      estudiante: { select: { nombre: true } },
      sesion: { select: { codigo: true, titulo: true } },
    },
  });
}

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ curso?: string | string[] }> }) {
  const sesion = await auth();
  const docenteId = sesion!.user.id;

  const cursos = await prisma.curso.findMany({
    where: { docenteId },
    orderBy: [{ anio: "desc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, anio: true },
  });
  const elegido = cursoElegido((await searchParams).curso, cursos);
  const curso = cursos.find((c) => c.id === elegido);

  const [sesiones, ejes, estudiantes, solicitudes, planteamientos] = await Promise.all([
    prisma.sesion.findMany({
      where: { eje: { caso: { activo: true } } },
      orderBy: [{ eje: { orden: "asc" } }, { orden: "asc" }],
      include: { eje: { select: { numero: true, nombre: true } } },
    }),
    prisma.eje.findMany({
      where: { caso: { activo: true } },
      orderBy: { orden: "asc" },
      select: { id: true, numero: true, nombre: true, peso: true },
    }),
    // El panel refleja a los estudiantes del propio docente, o a los del curso elegido.
    prisma.user.findMany({
      where: { rol: "ESTUDIANTE", creadoPorId: docenteId, ...(elegido ? { cursoId: elegido } : {}) },
      select: { id: true },
    }),
    solicitudesDe(docenteId),
    prisma.planteamientoSesion.findMany({ where: { docenteId }, select: { sesionId: true } }),
  ]);
  const planteadas = new Set(planteamientos.map((p) => p.sesionId));

  // El avance sale del trabajo que los estudiantes han producido, no de un
  // número guardado que habría que mantener al día.
  const [avances, trabajos] = await Promise.all([
    avanceDeEstudiantes(estudiantes.map((e) => e.id)),
    trabajosDeDocente(docenteId, { cursoId: elegido }),
  ]);
  const lista = [...avances.values()];

  // Las competencias del grupo: el promedio de las de cada estudiante.
  const competencias = promedioDeCompetencias(
    lista.map((a) => avanceDeCompetencias(sesiones.map((s) => ({ pantalla: s.pantalla, publicada: s.publicada, completada: a.completadas.has(s.id) }))))
  );

  const barras = ejes.map((eje) => {
    const valores = lista.map((a) => a.ejes.find((x) => x.ejeId === eje.id)?.progreso ?? 0);
    return {
      label: `EJE ${eje.numero}`,
      valor: valores.length ? Math.round(valores.reduce((s, v) => s + v, 0) / valores.length) : 0,
    };
  });

  // La misma agregación protegida que los reportes: solo lo autorizado y sin
  // grupos de menos de cinco.
  const resumen = await resumenDeSubpoblaciones(docenteId, elegido);
  const colores = ["#D95D39", "#1B8A8A", "#EBB035", "#177575", "#A79E96"];
  const subpoblaciones = resumen.total
    ? resumen.filas.map((f, i) => ({
        nombre: f.nombre,
        porcentaje: Math.round((f.estudiantes / resumen.total) * 100),
        color: colores[i % colores.length],
      }))
    : [];

  const publicadasPorEje = new Map<string, number>();
  for (const s of sesiones) {
    if (!s.publicada) continue;
    const eje = ejes.find((e) => e.numero === s.eje.numero);
    if (eje) publicadasPorEje.set(eje.id, (publicadasPorEje.get(eje.id) ?? 0) + 1);
  }

  return (
    <PanelDocente
      filtro={<FiltroCurso cursos={cursos.map((c) => ({ id: c.id, etiqueta: etiquetaCurso(c) }))} elegido={elegido} />}
      ambito={curso ? `en ${etiquetaCurso(curso)}` : "en tu grupo"}
      promedioGlobal={promedioDelGrupo(lista)}
      ciclo={curso?.anio ?? anioActual()}
      competencias={competencias}
      porRevisar={trabajos.filter((t) => t.pendiente).length}
      barras={barras}
      subpoblaciones={subpoblaciones}
      subpoblacionesOcultas={resumen.ocultos}
      totalEstudiantes={estudiantes.length}
      ejes={ejes.map((e) => ({
        id: e.id,
        numero: e.numero,
        nombre: e.nombre,
        peso: e.peso,
        publicadas: publicadasPorEje.get(e.id) ?? 0,
      }))}
      sesiones={sesiones.map((s) => ({
        id: s.id,
        codigo: s.codigo,
        titulo: s.titulo,
        eje: `EJE ${s.eje.numero} · ${s.eje.nombre.toUpperCase()}`,
        publicada: s.publicada,
        alertaCuidado: s.alertaCuidado,
        textoAlerta: s.textoAlerta,
        pantalla: s.pantalla,
        planteada: planteadas.has(s.id),
      }))}
      solicitudes={ordenarSolicitudes(solicitudes).map((s) => ({
        id: s.id,
        estudiante: s.estudiante.nombre,
        sesion: s.sesion ? `${s.sesion.codigo} ${s.sesion.titulo}` : null,
        mensaje: s.mensaje,
        cuando: fechaYHora(s.creadoEn),
        atendida: s.atendidaEn ? fechaYHora(s.atendidaEn) : null,
      }))}
    />
  );
}
