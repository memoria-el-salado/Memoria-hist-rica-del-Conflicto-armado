"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { esExplorador } from "@/lib/exploradores";
import { prisma } from "@/lib/prisma";

/** Guarda el explorador que eligió el estudiante y lo lleva a su mapa. */
export async function elegirExplorador(explorador: string) {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "ESTUDIANTE") return { error: "No autorizado." };
  if (!esExplorador(explorador)) return { error: "Elige uno de los cuatro exploradores." };

  await prisma.user.update({ where: { id: sesion.user.id }, data: { explorador } });
  revalidatePath("/estudiante", "layout");
  redirect("/estudiante/mapa");
}
