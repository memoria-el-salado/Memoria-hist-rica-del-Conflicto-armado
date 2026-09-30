"use client";

import { useEffect } from "react";
import { marcarComentariosLeidos } from "./acciones";

export type ComentarioVista = { id: string; texto: string; docente: string; cuando: string; nuevo: boolean };

/**
 * Lo que el docente comentó sobre el trabajo, junto al trabajo. Verlo aquí es
 * leerlo: los nuevos se marcan como leídos y la campana deja de contarlos.
 */
export function ComentariosDocente({ comentarios, compacto = false }: { comentarios: ComentarioVista[]; compacto?: boolean }) {
  const nuevos = comentarios.filter((c) => c.nuevo).map((c) => c.id).join(",");

  useEffect(() => {
    if (nuevos) void marcarComentariosLeidos(nuevos.split(","));
  }, [nuevos]);

  if (!comentarios.length) return null;

  const lista = (
    <ul className="grid gap-2">
      {comentarios.map((c) => (
        <li key={c.id} className="rounded-lg border border-primario-borde bg-superficie px-3.5 py-2.5">
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-tinta-media">{c.texto}</p>
          <div className="mt-1 text-[10.5px] text-suave">
            {c.docente} · {c.cuando}
            {c.nuevo && <strong className="ml-1.5 text-primario-fuerte">NUEVO</strong>}
          </div>
        </li>
      ))}
    </ul>
  );

  if (compacto) return <div className="mt-2.5">{lista}</div>;
  return (
    <section aria-labelledby="titulo-comentarios" className="mt-[22px] rounded-xl border border-primario-borde bg-primario-tinte p-5">
      <h2 id="titulo-comentarios" className="mb-2.5 text-[12px] font-extrabold tracking-[.06em] text-primario-fuerte">
        COMENTARIOS DE TU DOCENTE
      </h2>
      {lista}
    </section>
  );
}
