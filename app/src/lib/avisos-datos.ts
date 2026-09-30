import type { Rol } from "@prisma/client";
import { avisosDeDocente, avisosDeEstudiante, contarNuevos, DIAS_SESIONES, type TipoAviso } from "@/lib/avisos";
import { fechaYHora } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { trabajosDeDocente } from "@/lib/trabajos";

export type AvisoVista = { id: string; tipo: TipoAviso; texto: string; enlace: string; cuando: string; nuevo: boolean };

/** Lo que muestra la campana de cada quien, listo para la pantalla. */
export async function avisosPara(userId: string, rol: Rol): Promise<{ avisos: AvisoVista[]; nuevos: number } | null> {
  if (rol === "ADMIN") return null;
  const desde = new Date(Date.now() - DIAS_SESIONES * 86_400_000);
  const yo = await prisma.user.findUnique({ where: { id: userId }, select: { avisosVistosEn: true } });
  const vistosEn = yo?.avisosVistosEn ?? null;

  const avisos =
    rol === "ESTUDIANTE"
      ? await (async () => {
          const [comentarios, sesiones] = await Promise.all([
            prisma.comentario.findMany({
              where: { estudianteId: userId },
              orderBy: { creadoEn: "desc" },
              take: 20,
              include: { docente: { select: { nombre: true } }, sesion: { select: { id: true, codigo: true } } },
            }),
            // Solo las del módulo activo, que son las que el estudiante ve en su mapa.
            prisma.sesion.findMany({
              where: { publicada: true, publicadaEn: { gte: desde }, eje: { caso: { activo: true } } },
              select: { id: true, codigo: true, titulo: true, publicadaEn: true },
            }),
          ]);
          return avisosDeEstudiante({
            comentarios: comentarios.map((c) => ({
              id: c.id,
              creadoEn: c.creadoEn,
              leidoEn: c.leidoEn,
              docente: c.docente.nombre,
              sesion: c.sesion,
              enDiario: Boolean(c.entradaId),
            })),
            sesiones: sesiones.map((s) => ({ ...s, publicadaEn: s.publicadaEn! })),
            vistosEn,
          });
        })()
      : await (async () => {
          const [solicitudes, trabajos] = await Promise.all([
            prisma.solicitudAcompanamiento.findMany({
              where: { docenteId: userId, atendidaEn: null },
              orderBy: { creadoEn: "desc" },
              include: { estudiante: { select: { nombre: true } } },
            }),
            trabajosDeDocente(userId, { desde }),
          ]);
          return avisosDeDocente({
            solicitudes: solicitudes.map((s) => ({ id: s.id, estudiante: s.estudiante.nombre, creadoEn: s.creadoEn })),
            entregas: trabajos
              .filter((t) => t.pendiente)
              .map((t) => ({ id: `${t.clase}-${t.id}`, estudiante: t.estudiante, sesion: t.codigo, fecha: t.fecha })),
            vistosEn,
          });
        })();

  return {
    avisos: avisos.map((a) => ({ id: a.id, tipo: a.tipo, texto: a.texto, enlace: a.enlace, cuando: fechaYHora(a.fecha), nuevo: a.nuevo })),
    nuevos: contarNuevos(avisos),
  };
}
