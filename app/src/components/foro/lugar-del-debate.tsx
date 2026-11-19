import { prisma } from "@/lib/prisma";
import { fechaYHora } from "@/lib/fechas";
import { puedeBorrarComentario } from "@/lib/cartografia";
import { puedeVerAporte } from "@/lib/visibilidad";
import { ComentariosLugar } from "@/components/actividades/comentarios-lugar";

type Quien = { id: string; rol: string; creadoPorId: string | null; cursoId?: string | null };

/**
 * El lugar de la cartografía social del que parte un debate, con lo que el
 * curso opinó de él. Así lo que se comenta en la cartografía llega al foro, y
 * se puede seguir comentando desde aquí.
 */
export async function LugarDelDebate({ marcaId, quien }: { marcaId: string | null; quien: Quien }) {
  if (!marcaId) return null;
  const marca = await prisma.marcaCartografia.findUnique({
    where: { id: marcaId },
    include: {
      autor: { select: { id: true, nombre: true, creadoPorId: true, cursoId: true } },
      grupo: { select: { nombre: true } },
      comentarios: { orderBy: { creadoEn: "asc" }, include: { autor: { select: { nombre: true, rol: true } } } },
    },
  });
  if (!marca) return null;

  // El docente lo trajo al debate: quien participa lo lee. Comentar sigue la
  // regla de la cartografía (su curso y su docente).
  const yo = { ...quien, cursoId: quien.cursoId ?? null };
  const puedeComentar = puedeVerAporte(yo, marca.autor);

  return (
    <section aria-labelledby="titulo-lugar-debate" className="mb-5 rounded-xl border border-terciario-borde bg-terciario-tinte px-5 py-4">
      <div className="text-[0.625rem] font-bold tracking-[.12em] text-terciario-texto">EL DEBATE PARTE DE LA CARTOGRAFÍA SOCIAL</div>
      <h2 id="titulo-lugar-debate" className="mt-1 text-[1rem] font-extrabold text-tinta-media">
        {marca.lugar}
      </h2>
      <div className="text-[0.6875rem] text-suave">
        {marca.grupo ? `Grupo ${marca.grupo.nombre} · sembrado por ${marca.autor.nombre}` : marca.autor.nombre}
      </div>
      {marca.relato && marca.relato !== "Sin relato escrito." && (
        <p className="mt-1.5 whitespace-pre-line text-[0.78125rem] leading-[1.6] text-apagado">{marca.relato}</p>
      )}
      <ComentariosLugar
        marcaId={marca.id}
        lugar={marca.lugar}
        abierto
        soloLectura={!puedeComentar}
        comentarios={marca.comentarios.map((c) => ({
          id: c.id,
          autor: c.autor.nombre,
          texto: c.texto,
          cuando: fechaYHora(c.creadoEn),
          delDocente: c.autor.rol === "DOCENTE",
          borrable: puedeBorrarComentario(yo, c, marca.autor),
        }))}
      />
    </section>
  );
}
