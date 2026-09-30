import { redirect } from "next/navigation";
import { quienSoy } from "@/lib/debate";
import { prisma } from "@/lib/prisma";
import { MediacionForos } from "./mediacion-foros";

export default async function ForosPage() {
  const quien = await quienSoy();
  if (!quien || quien.rol !== "DOCENTE") redirect("/login");

  const [foros, casos] = await Promise.all([
    // Cada docente ve y media solo sus propios debates.
    prisma.foro.findMany({
      where: { autorId: quien.id },
      orderBy: { creadoEn: "desc" },
      include: {
        sesion: { select: { codigo: true, titulo: true } },
        _count: { select: { mensajes: true, participantes: true } },
      },
    }),
    prisma.caso.findMany({
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      select: {
        nombre: true,
        ejes: {
          orderBy: { orden: "asc" },
          select: { sesiones: { orderBy: { orden: "asc" }, select: { id: true, codigo: true, titulo: true } } },
        },
      },
    }),
  ]);

  return (
    <MediacionForos
      foros={foros.map((f) => ({
        id: f.id,
        pregunta: f.pregunta,
        rolA: f.rolA,
        rolB: f.rolB,
        fuentes: f.fuentes,
        abierto: f.abierto,
        sesion: f.sesion ? `${f.sesion.codigo} · ${f.sesion.titulo}` : null,
        mensajes: f._count.mensajes,
        participantes: f._count.participantes,
      }))}
      sesiones={casos.map((c) => ({
        caso: c.nombre,
        sesiones: c.ejes.flatMap((e) => e.sesiones),
      }))}
    />
  );
}
