import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { avanceDeEstudiantes } from "@/lib/avance";
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
    },
  });

  // El avance de cada estudiante sale de lo que ha producido en las sesiones.
  const avances = await avanceDeEstudiantes(estudiantes.map((e) => e.id));

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
        avance: avances.get(e.id)?.total ?? 0,
        creadoEn: e.creadoEn.toLocaleDateString("es-CO", { dateStyle: "medium" }),
      }))}
    />
  );
}
