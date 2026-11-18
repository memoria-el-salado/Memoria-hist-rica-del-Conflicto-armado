"use client";

import Link from "next/link";
import { useTransition } from "react";
import { marcarAtendida } from "../panel/actions";

export type CasoVista = {
  id: string;
  numero: number;
  estudiante: string;
  aula: string | null;
  sesion: { id: string; nombre: string } | null;
  mensaje: string | null;
  recibido: string;
  atendido: string | null;
};

/** Un mensaje del registro: se lee y se marca como atendido; no se responde aquí. */
export function CasoMensaje({ caso }: { caso: CasoVista }) {
  const [pendiente, iniciar] = useTransition();
  const titulo = `caso-${caso.numero}`;

  return (
    <li>
      <article
        aria-labelledby={titulo}
        className={`rounded-xl border px-5 py-4 ${caso.atendido ? "border-borde bg-superficie" : "border-primario-borde bg-primario-tinte"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={titulo} className="text-[0.90625rem] font-extrabold">
            <span className="text-suave">Caso {caso.numero} · </span>
            {caso.estudiante}
          </h2>
          {caso.atendido ? (
            <span className="rounded-full bg-secundario-tinte px-2.5 py-1 text-[0.65625rem] font-bold text-secundario-fuerte">Atendido</span>
          ) : (
            <span className="rounded-full bg-primario-fuerte px-2.5 py-1 text-[0.65625rem] font-bold text-white">Por atender</span>
          )}
        </div>

        <dl className="mt-1.5 grid gap-x-4 gap-y-0.5 text-[0.71875rem] text-apagado sm:grid-cols-[auto_1fr]">
          <dt className="font-bold text-tenue">Recibido</dt>
          <dd>{caso.recibido}</dd>
          {caso.aula && (
            <>
              <dt className="font-bold text-tenue">Aula</dt>
              <dd>{caso.aula}</dd>
            </>
          )}
          <dt className="font-bold text-tenue">Desde</dt>
          <dd>
            {caso.sesion ? (
              <Link href={`/docente/sesiones/${caso.sesion.id}`} className="font-semibold text-secundario-fuerte">
                la sesión {caso.sesion.nombre}
              </Link>
            ) : (
              "el botón «Acompañamiento»"
            )}
          </dd>
          {caso.atendido && (
            <>
              <dt className="font-bold text-tenue">Atendido</dt>
              <dd>{caso.atendido}</dd>
            </>
          )}
        </dl>

        <p className={`mt-2.5 whitespace-pre-line rounded-lg bg-superficie px-3.5 py-2.5 text-[0.8125rem] leading-relaxed ${caso.mensaje ? "text-tinta-media" : "italic text-suave"}`}>
          {caso.mensaje ?? "Sin mensaje: no tiene que explicarse para pedir ayuda."}
        </p>

        {!caso.atendido && (
          <button
            disabled={pendiente}
            onClick={() => iniciar(async () => { await marcarAtendida(caso.id); })}
            className="mt-3 cursor-pointer rounded-lg bg-secundario-fuerte px-3.5 py-2 text-[0.75rem] font-bold text-white hover:bg-secundario disabled:opacity-60"
          >
            {pendiente ? "Guardando…" : "Marcar como atendido"}
          </button>
        )}
      </article>
    </li>
  );
}
