"use client";

import { useTransition } from "react";
import { marcarAtendida } from "./actions";

export type SolicitudVista = {
  id: string;
  estudiante: string;
  /** La sesión desde la que lo pidió, o null si fue desde el botón general. */
  sesion: string | null;
  mensaje: string | null;
  cuando: string;
  atendida: string | null;
};

/**
 * Los pedidos de acompañamiento de los estudiantes del docente: primero los que
 * esperan, después los ya atendidos. Atender es hablar con el estudiante; el
 * botón solo deja constancia de que se hizo.
 */
export function SolicitudesAcompanamiento({ solicitudes }: { solicitudes: SolicitudVista[] }) {
  const [pendiente, iniciar] = useTransition();
  const esperando = solicitudes.filter((s) => !s.atendida).length;

  return (
    <section id="acompanamiento" aria-labelledby="titulo-acompanamiento" className="scroll-mt-20 rounded-xl border border-borde bg-superficie p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="titulo-acompanamiento" className="text-[11px] font-bold tracking-[.12em] text-tenue">
          PEDIDOS DE ACOMPAÑAMIENTO
        </h2>
        {esperando > 0 && (
          <span className="rounded-full bg-primario-fuerte px-2.5 py-1 text-[10.5px] font-bold text-white">
            {esperando} {esperando === 1 ? "espera" : "esperan"}
          </span>
        )}
      </div>

      {solicitudes.length === 0 ? (
        <p className="mt-3 text-[12px] leading-[1.6] text-tenue">
          Ningún estudiante ha pedido acompañamiento. Si alguno lo hace, desde una sesión con alerta o desde el
          botón «Alerta de cuidado», aparecerá aquí.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-2.5">
          {solicitudes.map((s) => (
            <li
              key={s.id}
              className={`rounded-lg border px-3.5 py-3 ${
                s.atendida ? "border-borde bg-superficie-suave" : "border-primario-borde bg-primario-tinte"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="text-[13px] font-extrabold">{s.estudiante}</span>
                <span className="text-[10.5px] text-suave">{s.cuando}</span>
              </div>
              <div className="text-[11px] text-tenue">{s.sesion ? `Desde la sesión ${s.sesion}` : "Desde el botón general"}</div>
              <p className={`mt-1.5 whitespace-pre-line text-[12.5px] leading-relaxed ${s.mensaje ? "text-tinta-media" : "italic text-suave"}`}>
                {s.mensaje ?? "Sin mensaje: no tiene que explicarse para pedir ayuda."}
              </p>
              {s.atendida ? (
                <div className="mt-1.5 text-[11px] font-semibold text-secundario-fuerte">Atendida · {s.atendida}</div>
              ) : (
                <button
                  disabled={pendiente}
                  onClick={() => iniciar(async () => { await marcarAtendida(s.id); })}
                  className="mt-2 cursor-pointer rounded-md bg-secundario-fuerte px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-secundario disabled:opacity-60"
                >
                  Marcar como atendida
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
