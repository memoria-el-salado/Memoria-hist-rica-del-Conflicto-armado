"use client";

import { useActionState, useState } from "react";
import { guardarRespuesta } from "@/app/estudiante/sesion/[id]/actions";
import { CabeceraSesion, TextoSesion, type DatosSesion } from "./cabecera-sesion";

/**
 * Respuesta abierta a una sesión (tradición oral y trabajo de análisis).
 *
 * Sustituye al ejercicio de arrastrar productos de la copla "Tierra de
 * abundancia", que estaba escrito a mano para una sola sesión y por tanto se
 * repetía idéntico en cualquier módulo que se importara. Aquí el estudiante lee
 * el texto real de su sesión y responde sobre él; la respuesta se puede
 * reescribir cuantas veces quiera.
 */
export function RespuestaEscrita({
  sesion,
  respuestaPrevia,
}: {
  sesion: DatosSesion;
  respuestaPrevia: string;
}) {
  const [texto, setTexto] = useState(respuestaPrevia);
  const [estado, accion, pendiente] = useActionState(
    guardarRespuesta,
    null as { ok?: string; error?: string } | null
  );

  const sinCambios = texto.trim() === respuestaPrevia.trim();

  return (
    <div className="animar-aparecer max-w-[1100px]">
      <CabeceraSesion sesion={sesion} />

      <div className="rejilla-panel">
        <TextoSesion sesion={sesion} />

        <form action={accion} className="rounded-xl border border-borde bg-superficie p-5">
          <div className="text-[12.5px] font-extrabold tracking-[.05em] text-primario-fuerte">
            TU RESPUESTA
          </div>
          <p className="mt-1.5 text-[12px] leading-[1.6] text-suave">
            {sesion.preguntaOrientadora
              ? "Responde a la pregunta orientadora con tus propias palabras."
              : "Escribe lo que esta sesión te hace pensar: lo que reconoces, lo que te sorprende y lo que te queda por preguntar."}
          </p>

          <input type="hidden" name="sesionId" value={sesion.id} />

          <label htmlFor="texto" className="sr-only">
            Tu respuesta
          </label>
          <textarea
            id="texto"
            name="texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe aquí tu respuesta..."
            className="mt-3 h-[220px] w-full resize-y rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px] leading-[1.7]"
          />

          <div className="mt-1.5 text-right text-[11px] text-tenue">
            {texto.trim().length} caracteres
          </div>

          <button
            type="submit"
            disabled={pendiente || !texto.trim() || sinCambios}
            className="mt-3 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendiente ? "Guardando..." : respuestaPrevia ? "Actualizar respuesta" : "Guardar respuesta"}
          </button>

          {respuestaPrevia && sinCambios && (
            <p className="mt-2 text-[11.5px] text-suave">
              Tu respuesta está guardada. Edítala si quieres cambiarla.
            </p>
          )}
          {estado?.ok && (
            <div role="status" className="mt-2 text-[11.5px] font-semibold text-secundario-fuerte">
              {estado.ok}
            </div>
          )}
          {estado?.error && (
            <div role="alert" className="mt-2 text-[11.5px] font-semibold text-peligro">
              {estado.error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
