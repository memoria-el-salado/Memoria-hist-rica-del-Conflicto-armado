import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EleccionExplorador } from "./eleccion-explorador";

export default async function ExploradorPage() {
  const sesion = await auth();
  const yo = await prisma.user.findUnique({ where: { id: sesion!.user.id }, select: { nombre: true, explorador: true } });
  return <EleccionExplorador nombre={yo?.nombre.split(" ")[0] ?? ""} actual={yo?.explorador ?? null} />;
}
