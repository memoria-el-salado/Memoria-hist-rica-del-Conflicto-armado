"use client";

import { useState, useTransition } from "react";
import { LIMITES_COMENTARIO } from "@/lib/revision";
import { comentarTrabajo } from "./actions";

type Trabajo = {
  clase: "RESPUESTA" | "SIMULACION" | "DIARIO";
  id: string;
  estudiante: string;
  sesion: string | null;
  etiqueta: string;
  detalle: string[];
  texto: string;
  cuando: string;
  pendiente: boolean;
  comentarios: { id: string; texto: string; cuando: string }[];
};

export function TrabajosPorRevisar({ trabajos, vacio }: { trabajos: Trabajo[]; vacio: string }) {
  if (!trabajos.length) {
    return <p className="rounded-xl border border-dashed border-borde-campo p-5 text-[13px] text-apagado">{vacio}</p>;
  }
  return (
    <ul className="grid gap-3">
      {trabajos.map((t) => (
        <TarjetaTrabajo key={`${t.clase}-${t.id}`} trabajo={t} />
      ))}
    </ul>
  );
}

function TarjetaTrabajo({ trabajo: t }: { trabajo: Trabajo }) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const campo = `comentario-${t.clase}-${t.id}`;

  return (
    <li
      aria-label={`${t.etiqueta} de ${t.estudiante}`}
      className={`rounded-xl border bg-superficie p-[18px] ${t.pendiente ? "border-primario-borde" : "border-borde"}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <span className="text-[14px] font-bold">{t.estudiante}</span>
          <span className="ml-2 text-[11.5px] text-tenue">
            {t.etiqueta}
            {t.sesion && ` · ${t.sesion}`}
          </span>
        </div>
        <span className="text-[10.5px] text-suave">
          {t.cuando}
          {t.pendiente && <strong className="ml-2 text-primario-fuerte">SIN COMENTAR</strong>}
        </span>
      </div>
      {t.detalle.map((d) => (
        <p key={d} className="mt-1.5 text-[12px] font-semibold text-secundario-fuerte">
          {d}
        </p>
      ))}
      {t.texto && <p className="mt-2 whitespace-pre-line text-[13px] leading-[1.7] text-tinta-media">{t.texto}</p>}

      {t.comentarios.length > 0 && (
        <ul className="mt-3 grid gap-1.5 border-l-2 border-primario-borde pl-3">
          {t.comentarios.map((c) => (
            <li key={c.id} className="text-[12.5px] text-apagado">
              <span className="whitespace-pre-line">{c.texto}</span>
              <span className="ml-2 text-[10.5px] text-suave">{c.cuando}</span>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => {
            const r = await comentarTrabajo({ clase: t.clase, id: t.id, texto });
            setEstado(r);
            if (r.ok) setTexto("");
          });
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <label htmlFor={campo} className="sr-only">
          Comentario para {t.estudiante}
        </label>
        <textarea
          id={campo}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={LIMITES_COMENTARIO.maximo}
          rows={2}
          placeholder={`Comenta el trabajo de ${t.estudiante}…`}
          className="min-w-[220px] flex-1 resize-y rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2 text-[13px]"
        />
        <button
          type="submit"
          disabled={pendiente || !texto.trim()}
          className="cursor-pointer rounded-lg bg-primario-fuerte px-4 py-2 text-[12.5px] font-bold text-white hover:bg-primario-hover disabled:opacity-50"
        >
          {pendiente ? "Enviando..." : "Comentar"}
        </button>
        {estado?.error && (
          <p role="alert" className="basis-full text-[11.5px] font-semibold text-peligro">
            {estado.error}
          </p>
        )}
        {estado?.ok && (
          <p role="status" className="basis-full text-[11.5px] font-semibold text-secundario-fuerte">
            {estado.ok}
          </p>
        )}
      </form>
    </li>
  );
}
