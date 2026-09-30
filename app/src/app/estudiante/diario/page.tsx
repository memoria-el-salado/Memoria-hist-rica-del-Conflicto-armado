import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fecha, fechaYHora } from "@/lib/fechas";
import { DiarioMemoria } from "./diario-memoria";

export default async function DiarioPage() {
  const sesion = await auth();

  // El diario es estrictamente personal: solo se leen las entradas del propio
  // autor. Aquí se reúnen todas, las escritas dentro de una sesión y las que
  // el estudiante anotó por su cuenta.
  const entradas = await prisma.entradaDiario.findMany({
    where: { autorId: sesion!.user.id },
    orderBy: { creadoEn: "desc" },
    include: {
      sesion: { select: { codigo: true, titulo: true } },
      comentarios: { orderBy: { creadoEn: "asc" }, include: { docente: { select: { nombre: true } } } },
    },
  });

  return (
    <DiarioMemoria
      entradas={entradas.map((e) => ({
        id: e.id,
        emocion: e.emocion,
        texto: e.texto,
        privada: e.privada,
        origen: e.sesion ? `${e.sesion.codigo} · ${e.sesion.titulo}` : null,
        fecha: fecha(e.creadoEn),
        comentarios: e.comentarios.map((c) => ({
          id: c.id,
          texto: c.texto,
          docente: c.docente.nombre,
          cuando: fechaYHora(c.creadoEn),
          nuevo: !c.leidoEn,
        })),
      }))}
    />
  );
}
