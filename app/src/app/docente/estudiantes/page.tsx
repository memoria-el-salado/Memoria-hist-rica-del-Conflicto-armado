import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generarContrasenaTemporal } from "@/lib/politica-contrasena";
import { GestionEstudiantes } from "./gestion-estudiantes";

export default async function EstudiantesPage() {
  const sesion = await auth();

  // Cada docente ve y administra únicamente a los estudiantes que dio de alta.
  const estudiantes = await prisma.user.findMany({
    where: { rol: "ESTUDIANTE", creadoPorId: sesion!.user.id },
    orderBy: { creadoEn: "asc" },
    select: {
      id: true,
      nombre: true,
      usuario: true,
      iniciales: true,
      subpoblacion: true,
      creadoEn: true,
      debeCambiarContrasena: true,
      progresos: { select: { porcentaje: true } },
    },
  });

  return (
    <GestionEstudiantes
      sugerencia={generarContrasenaTemporal()}
      estudiantes={estudiantes.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        usuario: e.usuario,
        iniciales: e.iniciales,
        subpoblacion: e.subpoblacion,
        provisional: e.debeCambiarContrasena,
        avance: e.progresos.length
          ? Math.round(e.progresos.reduce((s, p) => s + p.porcentaje, 0) / e.progresos.length)
          : 0,
        creadoEn: e.creadoEn.toLocaleDateString("es-CO", { dateStyle: "medium" }),
      }))}
    />
  );
}
