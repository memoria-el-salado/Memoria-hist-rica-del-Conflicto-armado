"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resumenDeSubpoblaciones } from "@/lib/subpoblaciones-datos";

export async function generarReporte() {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "DOCENTE") return { error: "No autorizado." };

  const { filas, total: cuantos } = await resumenDeSubpoblaciones(sesion.user.id);
  if (cuantos === 0) {
    return { error: "Todavía no tienes estudiantes en el grupo." };
  }

  // Solo los grupos que se pueden mostrar: los pequeños no entran al reporte.
  const promedios = filas.map((f) => ({ nombre: f.nombre, promedio: f.avance }));

  const ordenados = [...promedios].sort((a, b) => b.promedio - a.promedio);
  const mayor = ordenados[0];
  const menor = ordenados[ordenados.length - 1];
  const brecha = mayor && menor ? mayor.promedio - menor.promedio : 0;

  const total = await prisma.reporteDiferenciado.count({ where: { docenteId: sesion.user.id } });

  await prisma.reporteDiferenciado.create({
    data: {
      resumen:
        `Reporte diferenciado #${total + 1} generado · ${cuantos} estudiantes · ` +
        (brecha > 0
          ? `brecha mayor detectada entre "${mayor.nombre}" y "${menor.nombre}" (${brecha} puntos).`
          : "sin brechas significativas entre los grupos que se pueden mostrar."),
      docenteId: sesion.user.id,
    },
  });

  revalidatePath("/docente/subpoblaciones");
  return { ok: true };
}
