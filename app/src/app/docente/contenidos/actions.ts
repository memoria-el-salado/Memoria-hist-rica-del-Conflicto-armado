"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function exigirDocente() {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "DOCENTE") return null;
  return sesion;
}

const recursoSchema = z.object({
  titulo: z.string().trim().min(1, "El recurso necesita un título."),
  // Regla pedagógica del documento: ningún recurso se publica sin contexto histórico.
  contexto: z.string().trim().min(1, "El contexto histórico es obligatorio para publicar."),
  ejeId: z.string().min(1, "Selecciona el eje temático."),
  tipo: z.enum(["VIDEO", "AUDIO", "DOCUMENTO", "SIMULADOR"]),
  alerta: z.boolean(),
});

export async function cargarRecurso(_prev: unknown, formData: FormData) {
  const sesion = await exigirDocente();
  if (!sesion) return { error: "No autorizado." };

  const parsed = recursoSchema.safeParse({
    titulo: formData.get("titulo"),
    contexto: formData.get("contexto"),
    ejeId: formData.get("ejeId"),
    tipo: formData.get("tipo"),
    alerta: formData.get("alerta") === "si",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const recurso = await prisma.recurso.create({
    data: { ...parsed.data, autorId: sesion.user.id },
  });

  // Todo recurso entra a la cola de auditoría de accesibilidad (CU10).
  await prisma.auditoriaAccesibilidad.create({
    data: {
      recursoId: recurso.id,
      descripcion: parsed.data.tipo === "DOCUMENTO" ? "Documento · nuevo" : `${parsed.data.tipo} · nuevo`,
      transcripcion: parsed.data.tipo === "DOCUMENTO",
      contraste: true,
      responsivo: true,
    },
  });

  revalidatePath("/docente/contenidos");
  revalidatePath("/admin/accesibilidad");
  return { ok: "Recurso cargado al módulo." };
}

export async function alternarAlertaRecurso(recursoId: string) {
  if (!(await exigirDocente())) return { error: "No autorizado." };

  const actual = await prisma.recurso.findUnique({ where: { id: recursoId } });
  if (!actual) return { error: "El recurso no existe." };

  await prisma.recurso.update({
    where: { id: recursoId },
    data: { alerta: !actual.alerta },
  });

  revalidatePath("/docente/contenidos");
  return { ok: true };
}
