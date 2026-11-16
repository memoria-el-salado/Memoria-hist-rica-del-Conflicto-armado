import type { RecursoVista } from "@/lib/material";
import { definicionDe } from "@/lib/recursos";
import { ReproductorRecurso } from "./reproductor-recurso";

/** El material que el docente cargó para esta sesión o para todo su eje. */
export function MaterialSesion({ recursos, className = "mx-auto mt-6 max-w-[920px]" }: { recursos: RecursoVista[]; className?: string }) {
  if (!recursos.length) return null;

  return (
    <section aria-labelledby="titulo-material-sesion" className={className}>
      <h2 id="titulo-material-sesion" className="mb-3 text-[12.5px] font-extrabold tracking-[.08em] text-tinta-media">
        MATERIAL DE LA SESIÓN
      </h2>
      <div className="grid gap-3">
        {recursos.map((r) => (
          <article key={r.id} className="rounded-xl border border-borde bg-superficie p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[14px] font-bold">{r.titulo}</h3>
              <span className="rounded-full border border-borde px-2 py-0.5 text-[10px] font-bold tracking-[.05em] text-tenue">
                {definicionDe(r.tipo).etiqueta.split(" (")[0].toUpperCase()}
              </span>
            </div>
            <p className="mb-3 mt-1 text-[12.5px] leading-relaxed text-apagado">{r.contexto}</p>
            <ReproductorRecurso recurso={r} />
          </article>
        ))}
      </div>
    </section>
  );
}
