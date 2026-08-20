import { prisma } from "@/lib/prisma";
import { GestionContenido } from "./gestion-contenido";

export default async function ContenidosPage() {
  const [recursos, ejes, documentos] = await Promise.all([
    prisma.recurso.findMany({
      orderBy: { creadoEn: "desc" },
      include: { eje: { select: { numero: true, nombre: true } } },
    }),
    prisma.eje.findMany({
      where: { caso: { activo: true } },
      orderBy: { orden: "asc" },
      select: { id: true, numero: true, nombre: true },
    }),
    // Documentos del módulo activo. El docente ve todos, incluidas las guías
    // para maestros que el estudiante no puede abrir.
    prisma.documentoFuente.findMany({
      where: { caso: { activo: true } },
      orderBy: { subidoEn: "asc" },
    }),
  ]);

  return (
    <GestionContenido
      recursos={recursos.map((r) => ({
        id: r.id,
        titulo: r.titulo,
        contexto: r.contexto,
        eje: `Eje ${r.eje.numero}`,
        tipo: r.tipo,
        alerta: r.alerta,
      }))}
      ejes={ejes.map((e) => ({ id: e.id, label: `Eje ${e.numero} · ${e.nombre}` }))}
      documentos={documentos.map((d) => ({
        id: d.id,
        titulo: d.titulo,
        paginas: d.paginas,
        soloDocentes: d.soloDocentes,
      }))}
    />
  );
}
