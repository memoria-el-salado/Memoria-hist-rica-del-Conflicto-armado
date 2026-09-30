"use client";

import { useState, useTransition } from "react";
import { LIMITES_ANOTACION, ordenarHilos, type ModoOrden } from "@/lib/anotaciones";
import type { AnotacionVista, HiloAnotacion } from "@/lib/anotaciones-datos";
import { alternarDestacada, alternarMeSirve, publicarEnHilo } from "./acciones";

const COLOR_ROL: Record<string, string> = { DOCENTE: "#1B8A8A", ESTUDIANTE: "#D95D39" };

type Props = {
  sesionId: string;
  hilos: HiloAnotacion[];
  /** El docente destaca; el estudiante no. */
  puedeDestacar: boolean;
  /** El párrafo que el estudiante eligió citar, si lo hay. */
  cita?: string;
  onQuitarCita?: () => void;
};

/**
 * Las anotaciones de una sesión como conversación (mockup de la página 11):
 * cada una con sus respuestas, «me sirve» y la marca del docente.
 */
export function Conversacion({ sesionId, hilos, puedeDestacar, cita = "", onQuitarCita }: Props) {
  const [modo, setModo] = useState<ModoOrden>("RECIENTES");
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  const ordenados = ordenarHilos(
    hilos.map((h) => ({ ...h, creadoEn: new Date(h.creadoEnMs) })),
    modo
  );
  const total = hilos.reduce((s, h) => s + 1 + h.respuestas.length, 0);

  function publicar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await publicarEnHilo({ sesionId, texto, cita: cita || null });
      if (r.error) return setError(r.error);
      setError("");
      setTexto("");
      onQuitarCita?.();
    });
  }

  return (
    <section aria-labelledby="titulo-conversacion" className="flex flex-col overflow-hidden rounded-xl border border-borde bg-superficie">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#F1EBE5] px-[18px] py-[13px]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D95D39" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <h2 id="titulo-conversacion" className="flex-1 text-[12px] font-extrabold tracking-[.04em]">
          COMENTARIOS Y ANOTACIONES ({total})
        </h2>
        <div role="group" aria-label="Orden" className="flex gap-2 text-[10.5px] font-extrabold tracking-[.06em]">
          {(["RECIENTES", "DESTACADOS"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={modo === m}
              onClick={() => setModo(m)}
              className={`cursor-pointer ${modo === m ? "text-primario-fuerte underline underline-offset-4" : "text-suave hover:text-apagado"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex max-h-[460px] flex-col gap-3 overflow-auto bg-[#FBF8F5] px-3.5 py-3.5">
        {ordenados.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] leading-[1.6] text-tenue">
            {modo === "DESTACADOS" ? "El docente todavía no ha destacado ninguna anotación." : "Todavía no hay anotaciones. La tuya sería la primera."}
          </p>
        ) : (
          ordenados.map((h) => <Hilo key={h.id} hilo={h} sesionId={sesionId} puedeDestacar={puedeDestacar} />)
        )}
      </div>

      <form onSubmit={publicar} className="border-t border-[#F1EBE5] px-[18px] py-3.5">
        {cita && (
          <div className="mb-2 flex items-start gap-2 border-l-2 border-terciario bg-terciario-tinte px-[11px] py-2">
            <span className="flex-1 text-[11.5px] italic text-[#7C736C]">{cita.length > 160 ? `${cita.slice(0, 160)}…` : cita}</span>
            <button type="button" onClick={onQuitarCita} aria-label="Quitar la cita" className="cursor-pointer text-[11px] font-bold text-tenue">
              ✕
            </button>
          </div>
        )}
        <label htmlFor="texto-anotacion" className="sr-only">
          Tu anotación
        </label>
        <textarea
          id="texto-anotacion"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={LIMITES_ANOTACION.maximo}
          placeholder="Escribe tu reflexión o anota sobre el documento…"
          className="h-[70px] w-full resize-y rounded-lg border border-borde-campo bg-superficie px-3 py-2.5 text-[13px]"
        />
        {error && (
          <p role="alert" className="mt-1.5 text-[11.5px] font-semibold text-peligro">
            {error}
          </p>
        )}
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={pendiente || !texto.trim()}
            className="cursor-pointer rounded-lg bg-primario-fuerte px-[15px] py-2.5 text-[11.5px] font-bold tracking-[.06em] text-white hover:bg-primario-hover disabled:opacity-50"
          >
            {pendiente ? "PUBLICANDO..." : "PUBLICAR ANOTACIÓN"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Hilo({ hilo, sesionId, puedeDestacar }: { hilo: HiloAnotacion; sesionId: string; puedeDestacar: boolean }) {
  const [respondiendo, setRespondiendo] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const campo = `respuesta-anotacion-${hilo.id}`;

  return (
    <article
      aria-label={`Anotación de ${hilo.autor}`}
      className={`rounded-xl border bg-superficie px-3.5 py-3 ${hilo.destacada ? "border-terciario" : "border-borde"}`}
    >
      <Cabecera a={hilo} />
      {hilo.destacada && <div className="mt-1.5 text-[9.5px] font-extrabold tracking-[.1em] text-terciario-fuerte">DESTACADA POR EL DOCENTE</div>}
      {hilo.cita && (
        <blockquote className="mt-2 border-l-2 border-primario bg-primario-tinte px-[11px] py-2 text-[11.5px] italic text-[#7C736C]">
          {hilo.cita.length > 220 ? `${hilo.cita.slice(0, 220)}…` : hilo.cita}
        </blockquote>
      )}
      <p className="mt-2 whitespace-pre-line text-[13px] leading-[1.6] text-tinta-media">{hilo.texto}</p>
      <Acciones a={hilo} puedeDestacar={puedeDestacar} onResponder={() => setRespondiendo((r) => !r)} respondiendo={respondiendo} />

      {hilo.respuestas.length > 0 && (
        <ul className="mt-2.5 grid gap-2 border-t border-[#F1EBE5] pt-2.5">
          {hilo.respuestas.map((r) => (
            <li key={r.id} className="pl-3">
              <Cabecera a={r} pequena />
              <p className="mt-1 whitespace-pre-line text-[12.5px] leading-[1.55] text-tinta-media">{r.texto}</p>
              <Acciones a={r} puedeDestacar={false} />
            </li>
          ))}
        </ul>
      )}

      {respondiendo && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              const res = await publicarEnHilo({ sesionId, texto, respuestaAId: hilo.id });
              if (res.error) return setError(res.error);
              setError("");
              setTexto("");
              setRespondiendo(false);
            });
          }}
          className="mt-2.5 grid gap-1.5"
        >
          <label htmlFor={campo} className="sr-only">
            Respuesta a {hilo.autor}
          </label>
          <textarea
            id={campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={LIMITES_ANOTACION.maximo}
            rows={2}
            className="w-full resize-y rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2 text-[12.5px]"
          />
          <button
            type="submit"
            disabled={pendiente || !texto.trim()}
            className="justify-self-end cursor-pointer rounded-md bg-secundario-fuerte px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-secundario disabled:opacity-50"
          >
            Responder
          </button>
          {error && (
            <p role="alert" className="text-[11.5px] font-semibold text-peligro">
              {error}
            </p>
          )}
        </form>
      )}
    </article>
  );
}

function Cabecera({ a, pequena = false }: { a: AnotacionVista; pequena?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex flex-none items-center justify-center rounded-full font-bold text-white ${pequena ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]"}`}
        style={{ background: COLOR_ROL[a.rol] }}
      >
        {a.iniciales}
      </div>
      <div className="min-w-0 flex-1">
        <span className={`${pequena ? "text-[12px]" : "text-[12.5px]"} font-bold`}>{a.autor}</span>
        {a.rol === "DOCENTE" && <span className="ml-1.5 whitespace-nowrap text-[9.5px] font-extrabold tracking-[.08em] text-secundario-fuerte">DOCENTE</span>}
      </div>
      <span className="text-[10.5px] text-[#B3AAA2]">{a.hora}</span>
    </div>
  );
}

function Acciones({
  a,
  puedeDestacar,
  onResponder,
  respondiendo,
}: {
  a: AnotacionVista;
  puedeDestacar: boolean;
  onResponder?: () => void;
  respondiendo?: boolean;
}) {
  const [pendiente, iniciar] = useTransition();
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-bold text-apagado">
      <button
        type="button"
        disabled={pendiente || a.propia}
        onClick={() => iniciar(async () => { await alternarMeSirve(a.id); })}
        aria-pressed={a.yoMeSirve}
        aria-label={`Me sirve la anotación de ${a.autor}${a.meSirve ? `, ${a.meSirve}` : ""}`}
        title={a.propia ? "Es tuya" : "Me sirve"}
        className={`flex cursor-pointer items-center gap-1 disabled:cursor-default ${a.yoMeSirve ? "text-primario-fuerte" : "hover:text-primario"}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill={a.yoMeSirve ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 10v12M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 8a2 2 0 0 1-2 1.7H7V10l4-8a3 3 0 0 1 4 3.9z" />
        </svg>
        {a.meSirve}
      </button>
      {onResponder && (
        <button type="button" onClick={onResponder} aria-expanded={respondiendo} className="cursor-pointer hover:text-primario">
          Responder
        </button>
      )}
      {puedeDestacar && (
        <button
          type="button"
          disabled={pendiente}
          onClick={() => iniciar(async () => { await alternarDestacada(a.id); })}
          aria-pressed={a.destacada}
          className={`cursor-pointer ${a.destacada ? "text-terciario-fuerte" : "hover:text-terciario-fuerte"}`}
        >
          {a.destacada ? "Quitar destacado" : "Destacar"}
        </button>
      )}
    </div>
  );
}
