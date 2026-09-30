import { prisma } from "@/lib/prisma";
import { definicionDe } from "@/lib/recursos";
import { estadoAccesibilidad } from "@/lib/transcripcion";
import { AuditoriaAccesibilidad } from "./auditoria-accesibilidad";

export default async function AccesibilidadPage() {
  const recursos = await prisma.recurso.findMany({
    orderBy: { creadoEn: "asc" },
    include: {
      auditoria: { select: { revisadaEn: true } },
      autor: { select: { nombre: true } },
      eje: { select: { numero: true, caso: { select: { nombre: true } } } },
    },
  });

  const ultima = recursos.reduce<Date | null>((max, r) => {
    const fecha = r.auditoria?.revisadaEn;
    return fecha && (!max || fecha > max) ? fecha : max;
  }, null);

  return (
    <AuditoriaAccesibilidad
      filas={recursos.map((r) => {
        const estado = estadoAccesibilidad(r);
        return {
          id: r.id,
          titulo: r.titulo,
          detalle: `${definicionDe(r.tipo).etiqueta} · ${r.eje.caso.nombre}, eje ${r.eje.numero} · ${r.autor?.nombre ?? "Sin autor"}`,
          requisito: estado.requisito,
          alternativa: estado.alternativa,
          sincronizada: estado.sincronizada,
          descripcion: estado.descripcion,
          visible: estado.visibleParaEstudiantes,
          pendiente: estado.pendiente ?? (!estado.descripcion ? "La descripción de la imagen es demasiado breve." : null),
        };
      })}
      ultimaRevision={
        ultima ? ultima.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "Sin ejecutar"
      }
    />
  );
}
