"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const casoSchema = z.object({
  nombre: z.string().trim().min(1, "Indica el corregimiento o municipio."),
  depto: z.string().trim().min(1, "Indica el departamento."),
  ejes: z.array(z.string()).min(1, "Selecciona al menos un eje heredado."),
});

/**
 * CU09 · Escalabilidad: un caso nuevo hereda la estructura de ejes y sesiones
 * del caso activo, en lugar de recrearla a mano.
 */
export async function crearCaso(_prev: unknown, formData: FormData) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ADMIN") return { error: "No autorizado." };

  const parsed = casoSchema.safeParse({
    nombre: formData.get("nombre"),
    depto: formData.get("depto"),
    ejes: formData.getAll("ejes").map(String),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { nombre, depto, ejes } = parsed.data;

  const existente = await prisma.caso.findUnique({ where: { nombre } });
  if (existente) return { error: `Ya existe un módulo para ${nombre}.` };

  const plantilla = await prisma.eje.findMany({
    where: { caso: { activo: true }, numero: { in: ejes.map(Number) } },
    orderBy: { orden: "asc" },
    include: { sesiones: { orderBy: { orden: "asc" } } },
  });

  await prisma.caso.create({
    data: {
      nombre,
      depto,
      estado: "EN_CURADURIA",
      version: "0.1.0",
      ejes: {
        create: plantilla.map((e, i) => ({
          numero: e.numero,
          nombre: e.nombre,
          descripcion: e.descripcion,
          tono: e.tono,
          orden: i,
          sesiones: {
            create: e.sesiones.map((s, j) => ({
              codigo: s.codigo,
              titulo: s.titulo,
              tipo: s.tipo,
              pantalla: s.pantalla,
              alertaCuidado: s.alertaCuidado,
              publicada: false,
              orden: j,
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/admin/casos");
  revalidatePath("/estudiante/mapa");
  return { ok: "Módulo generado a partir de la arquitectura base." };
}

/**
 * Elimina un módulo completo: sus ejes, sesiones y subsecciones, y con ellos el
 * trabajo que los estudiantes hubieran hecho dentro.
 *
 * Es la salida cuando una importación sale mal y hay que rehacerla. El
 * documento fuente no se toca: queda libre para volver a importarse.
 */
export async function eliminarCaso(casoId: string) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ADMIN") return { error: "No autorizado." };

  const caso = await prisma.caso.findUnique({
    where: { id: casoId },
    include: { ejes: { include: { sesiones: { select: { id: true } } } } },
  });
  if (!caso) return { error: "El módulo ya no existe." };

  const sesiones = caso.ejes.reduce((total, eje) => total + eje.sesiones.length, 0);

  // Al soltar el caso, la cascada arrastra ejes, sesiones, subsecciones y el
  // trabajo de los estudiantes asociado a esas sesiones.
  await prisma.caso.delete({ where: { id: casoId } });

  revalidatePath("/admin/casos");
  revalidatePath("/admin/importar");
  revalidatePath("/docente/panel");
  revalidatePath("/estudiante/mapa");

  return {
    ok: `Módulo "${caso.nombre}" eliminado, con sus ${caso.ejes.length} ejes y ${sesiones} sesiones.`,
  };
}
