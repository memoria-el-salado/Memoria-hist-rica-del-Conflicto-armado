import { prisma } from "@/lib/prisma";
import { AuditoriaAccesibilidad } from "./auditoria-accesibilidad";

export default async function AccesibilidadPage() {
  const auditorias = await prisma.auditoriaAccesibilidad.findMany({
    orderBy: { recurso: { creadoEn: "asc" } },
    include: { recurso: { select: { titulo: true } } },
  });

  const ultima = auditorias.reduce<Date | null>(
    (max, a) => (!max || a.revisadaEn > max ? a.revisadaEn : max),
    null
  );

  return (
    <AuditoriaAccesibilidad
      filas={auditorias.map((a) => ({
        id: a.id,
        titulo: a.recurso.titulo,
        descripcion: a.descripcion,
        transcripcion: a.transcripcion,
        contraste: a.contraste,
        responsivo: a.responsivo,
      }))}
      ultimaRevision={
        ultima
          ? ultima.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })
          : "Sin ejecutar"
      }
    />
  );
}
