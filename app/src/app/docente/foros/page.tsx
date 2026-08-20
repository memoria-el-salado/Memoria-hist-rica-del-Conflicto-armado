import { prisma } from "@/lib/prisma";
import { MediacionForos } from "./mediacion-foros";

export default async function ForosPage() {
  const foros = await prisma.foro.findMany({ orderBy: { creadoEn: "desc" } });

  return (
    <MediacionForos
      foros={foros.map((f) => ({
        id: f.id,
        pregunta: f.pregunta,
        rolA: f.rolA,
        rolB: f.rolB,
        fuentes: f.fuentes,
        abierto: f.abierto,
      }))}
    />
  );
}
