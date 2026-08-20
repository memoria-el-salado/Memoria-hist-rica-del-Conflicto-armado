import { prisma } from "@/lib/prisma";
import { generarContrasenaTemporal } from "@/lib/politica-contrasena";
import { GestionDocentes } from "./gestion-docentes";

export default async function DocentesPage() {
  const docentes = await prisma.user.findMany({
    where: { rol: "DOCENTE" },
    orderBy: { creadoEn: "asc" },
    select: {
      id: true,
      nombre: true,
      usuario: true,
      iniciales: true,
      creadoEn: true,
      debeCambiarContrasena: true,
      _count: { select: { creados: true } },
    },
  });

  return (
    <GestionDocentes
      sugerencia={generarContrasenaTemporal()}
      docentes={docentes.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        usuario: d.usuario,
        iniciales: d.iniciales,
        estudiantes: d._count.creados,
        provisional: d.debeCambiarContrasena,
        creadoEn: d.creadoEn.toLocaleDateString("es-CO", { dateStyle: "medium" }),
      }))}
    />
  );
}
