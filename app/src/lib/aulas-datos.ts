import { prisma } from "@/lib/prisma";
import { tieneAula } from "@/lib/aulas";

/** Si un estudiante está en el aula de un docente y puede ver los contenidos. */
export async function estudianteConAula(userId: string): Promise<boolean> {
  const yo = await prisma.user.findUnique({ where: { id: userId }, select: { creadoPor: { select: { rol: true } } } });
  return tieneAula(yo?.creadoPor);
}
