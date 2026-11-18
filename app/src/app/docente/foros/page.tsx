import { redirect } from "next/navigation";
import { quienSoy } from "@/lib/debate";
import { prisma } from "@/lib/prisma";
import { etiquetaCurso } from "@/lib/cursos";
import { MediacionForos } from "./mediacion-foros";

export default async function ForosPage() {
  const quien = await quienSoy();
  if (!quien || quien.rol !== "DOCENTE") redirect("/login");

  const [foros, casos, cursos, lugares] = await Promise.all([
    // Cada docente ve y media solo sus propios debates.
    prisma.foro.findMany({
      where: { autorId: quien.id },
      orderBy: { creadoEn: "desc" },
      include: {
        sesion: { select: { codigo: true, titulo: true } },
        curso: { select: { nombre: true, anio: true } },
        marca: { select: { lugar: true } },
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
    prisma.curso.findMany({
      where: { docenteId: quien.id },
      orderBy: [{ anio: "desc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, anio: true },
    }),
    // Los lugares de la cartografía de sus estudiantes, los más comentados primero:
    // son los que más conversación ya traen para un debate.
    prisma.marcaCartografia.findMany({
      where: { autor: { creadoPorId: quien.id } },
      orderBy: [{ comentarios: { _count: "desc" } }, { creadoEn: "desc" }],
      take: 60,
      select: { id: true, lugar: true, autor: { select: { nombre: true } }, _count: { select: { comentarios: true } } },
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
        curso: f.curso ? etiquetaCurso(f.curso) : null,
        lugar: f.marca?.lugar ?? null,
        mensajes: f._count.mensajes,
        participantes: f._count.participantes,
      }))}
      cursos={cursos.map((c) => ({ id: c.id, etiqueta: etiquetaCurso(c) }))}
      lugares={lugares.map((l) => ({
        id: l.id,
        etiqueta: `${l.lugar} · ${l.autor.nombre} · ${l._count.comentarios} ${l._count.comentarios === 1 ? "comentario" : "comentarios"}`,
      }))}
      sesiones={casos.map((c) => ({
        caso: c.nombre,
        sesiones: c.ejes.flatMap((e) => e.sesiones),
      }))}
    />
  );
}
