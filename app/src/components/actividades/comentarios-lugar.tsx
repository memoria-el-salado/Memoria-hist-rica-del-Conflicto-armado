"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { LIMITES_COMENTARIO } from "@/lib/cartografia";
import { borrarComentarioMarca, comentarMarca } from "@/app/estudiante/sesion/[id]/acciones-comentarios";

export type ComentarioVista = {
  id: string;
  autor: string;
  texto: string;
  cuando: string;
  /** Si es el docente: se distingue en la conversación. */
  delDocente: boolean;
  borrable: boolean;
};

/**
 * Lo que el curso opina de un lugar de la cartografía. Se lee y se comenta en
 * el mismo lugar, y si el docente abrió un debate a partir de él, se enlaza.
 */
export function ComentariosLugar({
  marcaId,
  lugar,
  comentarios,
  foros = [],
  abierto = false,
  soloLectura = false,
}: {
  marcaId: string;
  lugar: string;
  comentarios: ComentarioVista[];
  foros?: { href: string; pregunta: string }[];
  /** En el foro la conversación se muestra desplegada. */
  abierto?: boolean;
  /** Quien llega desde otro curso al debate lee los comentarios, pero no comenta. */
  soloLectura?: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const idCampo = `comentario-${marcaId}`;

  function publicar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await comentarMarca(marcaId, texto);
      setAviso(r);
      if (r.ok) setTexto("");
    });
  }

  return (
    <details open={abierto || undefined} className="group mt-2.5 rounded-lg border border-borde bg-superficie-suave">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[0.71875rem] font-bold text-secundario-fuerte">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {comentarios.length === 0 ? "Comentar" : `${comentarios.length} ${comentarios.length === 1 ? "comentario" : "comentarios"}`}
        <span className="sr-only"> sobre {lugar}</span>
        <span aria-hidden="true" className="ml-auto transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="border-t border-borde px-3 pb-3 pt-2">
        {foros.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="mb-2 block rounded-md bg-terciario-tinte px-2.5 py-1.5 text-[0.71875rem] font-semibold text-terciario-fuerte"
          >
            Se debate en el foro: «{f.pregunta}» →
          </Link>
        ))}

        {comentarios.length > 0 && (
          <ul className="grid gap-2" aria-label={`Comentarios sobre ${lugar}`}>
            {comentarios.map((c) => (
              <li key={c.id} className="rounded-md bg-superficie px-2.5 py-2">
                <div className="flex flex-wrap items-baseline gap-x-2 text-[0.6875rem]">
                  <span className="font-bold text-tinta-media">{c.autor}</span>
                  {c.delDocente && (
                    <span className="rounded-full bg-primario-tinte px-1.5 text-[0.625rem] font-bold text-primario-fuerte">Docente</span>
                  )}
                  <span className="text-suave">{c.cuando}</span>
                  {c.borrable && (
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => iniciar(async () => setAviso(await borrarComentarioMarca(c.id)))}
                      aria-label={`Borrar el comentario de ${c.autor}`}
                      className="ml-auto cursor-pointer text-[0.65625rem] font-bold text-apagado hover:text-peligro"
                    >
                      Borrar
                    </button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-line text-[0.78125rem] leading-[1.55] text-apagado">{c.texto}</p>
              </li>
            ))}
          </ul>
        )}

        {soloLectura ? (
          <p className="mt-2 text-[0.6875rem] text-suave">Este lugar es de otro curso: puedes leer lo que opinaron sus compañeros.</p>
        ) : (
          <form onSubmit={publicar} className="mt-2 grid gap-1.5">
            <label htmlFor={idCampo} className="text-[0.6875rem] font-semibold text-apagado">
              ¿Qué te dice este lugar?
            </label>
            <textarea
              id={idCampo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={LIMITES_COMENTARIO.maximo}
              rows={2}
              placeholder="Escribe con respeto: es el lugar significativo de un compañero."
              className="w-full rounded-md border border-borde-campo bg-superficie px-2.5 py-2 text-[0.78125rem]"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={pendiente || texto.trim().length < LIMITES_COMENTARIO.minimo}
                className="cursor-pointer rounded-md bg-secundario-fuerte px-3 py-1.5 text-[0.71875rem] font-bold text-white hover:bg-secundario disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendiente ? "Publicando…" : "Comentar"}
              </button>
              {aviso?.error && (
                <span role="alert" className="text-[0.6875rem] font-semibold text-peligro">
                  {aviso.error}
                </span>
              )}
              {aviso?.ok && (
                <span role="status" className="text-[0.6875rem] font-semibold text-secundario-fuerte">
                  {aviso.ok}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </details>
  );
}
