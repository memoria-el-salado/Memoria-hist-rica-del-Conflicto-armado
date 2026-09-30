import Link from "next/link";
import { auth } from "@/auth";
import { FiltroCurso } from "@/components/filtro-curso";
import { cursoElegido, etiquetaCurso } from "@/lib/cursos";
import { fechaYHora } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { trabajosDeDocente } from "@/lib/trabajos";
import { TrabajosPorRevisar } from "./trabajos-por-revisar";

export default async function RevisionPage({ searchParams }: { searchParams: Promise<{ curso?: string | string[]; pendientes?: string }> }) {
  const docenteId = (await auth())!.user.id;
  const parametros = await searchParams;

  const cursos = await prisma.curso.findMany({
    where: { docenteId },
    orderBy: [{ anio: "desc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, anio: true },
  });
  const elegido = cursoElegido(parametros.curso, cursos);
  const soloPendientes = parametros.pendientes === "1";

  const todos = await trabajosDeDocente(docenteId, { cursoId: elegido });
  const pendientes = todos.filter((t) => t.pendiente).length;
  const trabajos = soloPendientes ? todos.filter((t) => t.pendiente) : todos;

  const enlace = (pendiente: boolean) => {
    const q = new URLSearchParams();
    if (elegido) q.set("curso", elegido);
    if (pendiente) q.set("pendientes", "1");
    return `/docente/revision${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="animar-aparecer max-w-[920px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">LMS · RETROALIMENTACIÓN</div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">Revisión</h1>
      <p className="mb-4 max-w-[680px] text-[13.5px] leading-[1.65] text-apagado">
        Lo que entregan tus estudiantes: respuestas a las actividades, simulaciones validadas y las entradas del
        diario que decidieron compartirte. Tu comentario les llega en la sesión y en su campana de avisos.
      </p>
      <FiltroCurso cursos={cursos.map((c) => ({ id: c.id, etiqueta: etiquetaCurso(c) }))} elegido={elegido} />
      <nav aria-label="Qué trabajos ver" className="mb-4 flex gap-2">
        {[
          { texto: `Todos (${todos.length})`, activo: !soloPendientes, href: enlace(false) },
          { texto: `Sin comentar (${pendientes})`, activo: soloPendientes, href: enlace(true) },
        ].map((o) => (
          <Link
            key={o.href}
            href={o.href}
            aria-current={o.activo ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold no-underline ${
              o.activo ? "border-primario-fuerte bg-primario-fuerte text-white" : "border-borde-campo bg-superficie text-apagado"
            }`}
          >
            {o.texto}
          </Link>
        ))}
      </nav>
      <TrabajosPorRevisar
        trabajos={trabajos.map((t) => ({
          clase: t.clase,
          id: t.id,
          estudiante: t.estudiante,
          sesion: t.sesion,
          etiqueta: t.etiqueta,
          detalle: t.detalle,
          texto: t.texto,
          cuando: fechaYHora(t.fecha),
          pendiente: t.pendiente,
          comentarios: t.comentarios.map((c) => ({ id: c.id, texto: c.texto, cuando: fechaYHora(c.creadoEn) })),
        }))}
        vacio={soloPendientes ? "No hay trabajos esperando tu comentario." : "Tus estudiantes todavía no han entregado trabajos."}
      />
    </div>
  );
}
