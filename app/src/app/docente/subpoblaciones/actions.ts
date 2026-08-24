"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { avanceDeEstudiantes } from "@/lib/avance";

export async function generarReporte() {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "DOCENTE") return { error: "No autorizado." };

  const estudiantes = await prisma.user.findMany({
    where: { rol: "ESTUDIANTE", creadoPorId: sesion.user.id },
    select: { id: true, subpoblacion: true },
  });

  if (estudiantes.length === 0) {
    return { error: "Todavía no tienes estudiantes en el grupo." };
  }

  const avances = await avanceDeEstudiantes(estudiantes.map((e) => e.id));

  const grupos = new Map<string, number[]>();
  for (const e of estudiantes) {
    const clave = e.subpoblacion ?? "Sin vínculo directo";
    grupos.set(clave, [...(grupos.get(clave) ?? []), avances.get(e.id)?.total ?? 0]);
  }

  const promedios = [...grupos.entries()].map(([nombre, valores]) => ({
    nombre,
    promedio: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length),
  }));

  const ordenados = [...promedios].sort((a, b) => b.promedio - a.promedio);
  const mayor = ordenados[0];
  const menor = ordenados[ordenados.length - 1];
  const brecha = mayor && menor ? mayor.promedio - menor.promedio : 0;

  const total = await prisma.reporteDiferenciado.count();

  await prisma.reporteDiferenciado.create({
    data: {
      resumen:
        `Reporte diferenciado #${total + 1} generado · ${estudiantes.length} estudiantes · ` +
        (brecha > 0
          ? `brecha mayor detectada entre "${mayor.nombre}" y "${menor.nombre}" (${brecha} puntos).`
          : "sin brechas significativas entre subpoblaciones."),
    },
  });

  revalidatePath("/docente/subpoblaciones");
  return { ok: true };
}
