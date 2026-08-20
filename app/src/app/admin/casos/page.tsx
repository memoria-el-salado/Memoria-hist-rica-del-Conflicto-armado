import { prisma } from "@/lib/prisma";
import { ModulosGeograficos } from "./modulos-geograficos";

export default async function CasosPage() {
  const [casos, ejesBase] = await Promise.all([
    prisma.caso.findMany({
      orderBy: { creadoEn: "asc" },
      include: {
        ejes: {
          orderBy: { orden: "asc" },
          include: { _count: { select: { sesiones: true, recursos: true } } },
        },
      },
    }),
    prisma.eje.findMany({
      where: { caso: { activo: true } },
      orderBy: { orden: "asc" },
      select: { numero: true, nombre: true },
    }),
  ]);

  return (
    <ModulosGeograficos
      casos={casos.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        depto: c.depto,
        estado: c.estado,
        version: c.version,
        ejes: c.ejes.map((e) => e.nombre),
        sesiones: c.ejes.reduce((s, e) => s + e._count.sesiones, 0),
        recursos: c.ejes.reduce((s, e) => s + e._count.recursos, 0),
      }))}
      ejesBase={ejesBase.map((e) => ({ numero: e.numero, nombre: e.nombre }))}
    />
  );
}
