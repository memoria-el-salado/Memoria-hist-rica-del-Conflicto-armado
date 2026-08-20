"use client";

import { useActionState, useState } from "react";
import { publicarAnotacion } from "@/app/estudiante/sesion/[id]/actions";
import { CabeceraSesion, type DatosSesion } from "./cabecera-sesion";

/**
 * Lectura del documento con anotaciones (CU06).
 *
 * El texto que se lee es el de la sesión importada, y los fragmentos citables
 * son sus propios párrafos: al hacer clic sobre uno queda adjunto a la
 * anotación. Antes el documento era siempre el mismo texto de ejemplo.
 */

type Anotacion = {
  id: string;
  autor: string;
  iniciales: string;
  rol: string;
  hora: string;
  cita: string | null;
  texto: string;
};

const COLOR_ROL: Record<string, string> = {
  DOCENTE: "#1B8A8A",
  ESTUDIANTE: "#D95D39",
};

export function LecturaAnotada({
  sesion,
  anotaciones,
}: {
  sesion: DatosSesion;
  anotaciones: Anotacion[];
}) {
  const [cita, setCita] = useState("");
  const [texto, setTexto] = useState("");

  const [estado, accion, pendiente] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const res = await publicarAnotacion(prev, formData);
      if (res.ok) {
        setTexto("");
        setCita("");
      }
      return res;
    },
    null as { ok?: string; error?: string } | null
  );

  const parrafos = (sesion.contenido ?? "").split(/\n{2,}/).filter((p) => p.trim().length > 60);

  return (
    <div className="animar-aparecer">
      <CabeceraSesion sesion={sesion} />

      <div className="grid items-start gap-[18px] xl:grid-cols-[1.7fr_1.1fr]">
        <article className="rounded-xl border border-borde bg-superficie px-6 py-6 sm:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#F1EBE5] pb-3">
            <span className="text-[10.5px] font-bold tracking-[.1em] text-suave">
              TEXTO DE LA SESIÓN
            </span>
            {sesion.documento && (
              <a
                href={`/api/documentos/${sesion.documento.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11.5px] font-semibold text-secundario-fuerte"
              >
                Abrir el PDF original
              </a>
            )}
          </div>

          {parrafos.length > 0 ? (
            <>
              {parrafos.map((parrafo, i) => {
                const elegido = cita === parrafo;
                return (
                  <button
                    key={i}
                    onClick={() => setCita(elegido ? "" : parrafo)}
                    aria-pressed={elegido}
                    className="mb-2 block w-full cursor-pointer rounded-r-lg border-l-[3px] px-[15px] py-2.5 text-justify text-[13.5px] leading-[1.85] transition-colors"
                    style={{
                      borderLeftColor: elegido ? "#EBB035" : "transparent",
                      background: elegido ? "#FBEFD8" : "transparent",
                      color: "#5B524B",
                    }}
                  >
                    {parrafo}
                  </button>
                );
              })}
              <p className="mt-3 text-[11.5px] text-tenue">
                Haz clic en un párrafo para citarlo en tu anotación.
              </p>
            </>
          ) : (
            <p className="text-[13px] leading-[1.7] text-tenue">
              El documento importado no traía texto para esta sesión. Puedes anotar igualmente a
              partir del trabajo en clase o del PDF original.
            </p>
          )}

          {sesion.subsecciones.length > 0 && (
            <div className="mt-5 border-t border-[#F1EBE5] pt-4">
              <div className="text-[10.5px] font-bold tracking-[.12em] text-tenue">
                CONTENIDO DE LA SESIÓN
              </div>
              <ol className="mt-2.5 grid gap-1.5">
                {sesion.subsecciones.map((sub) => (
                  <li key={sub.id} className="flex gap-2 text-[12.5px] text-tinta-media">
                    <span className="font-bold text-primario">{sub.codigo}</span>
                    <span>{sub.titulo}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </article>

        <div className="flex flex-col overflow-hidden rounded-xl border border-borde bg-superficie">
          <div className="flex items-center gap-2 border-b border-[#F1EBE5] px-[18px] py-[15px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D95D39" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[12.5px] font-extrabold tracking-[.04em]">
              ANOTACIONES ({anotaciones.length})
            </span>
          </div>

          <div className="flex max-h-[430px] flex-col gap-3.5 overflow-auto px-[18px] py-3.5">
            {anotaciones.length === 0 ? (
              <p className="py-6 text-center text-[12.5px] leading-[1.6] text-tenue">
                Todavía no hay anotaciones en esta sesión.
                <br />
                La tuya sería la primera.
              </p>
            ) : (
              anotaciones.map((a) => (
                <div key={a.id} className="border-b border-dashed border-[#F1EBE5] pb-[13px] last:border-b-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: COLOR_ROL[a.rol] ?? "#8C8279" }}
                    >
                      {a.iniciales}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-bold">{a.autor}</div>
                      <div className="text-[10px] tracking-[.06em] text-suave">{a.rol}</div>
                    </div>
                    <div className="text-[10.5px] text-[#B3AAA2]">{a.hora}</div>
                  </div>
                  {a.cita && (
                    <div className="mt-2 border-l-2 border-terciario bg-terciario-tinte px-[11px] py-2 text-[11.5px] italic text-[#7C736C]">
                      {a.cita.length > 220 ? `${a.cita.slice(0, 220)}…` : a.cita}
                    </div>
                  )}
                  <p className="mt-2 text-[13px] leading-[1.6] text-tinta-media">{a.texto}</p>
                </div>
              ))
            )}
          </div>

          <form action={accion} className="mt-auto border-t border-[#F1EBE5] bg-superficie-suave px-[18px] py-3.5">
            <input type="hidden" name="sesionId" value={sesion.id} />
            <input type="hidden" name="cita" value={cita} />

            {cita && (
              <div className="mb-2 flex items-start gap-2 border-l-2 border-terciario bg-terciario-tinte px-[11px] py-2">
                <span className="flex-1 text-[11.5px] italic text-[#7C736C]">
                  {cita.length > 160 ? `${cita.slice(0, 160)}…` : cita}
                </span>
                <button
                  type="button"
                  onClick={() => setCita("")}
                  aria-label="Quitar la cita"
                  className="cursor-pointer text-[11px] font-bold text-tenue"
                >
                  ✕
                </button>
              </div>
            )}

            <label htmlFor="texto" className="sr-only">
              Tu anotación
            </label>
            <textarea
              id="texto"
              name="texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe tu reflexión o aporte sobre el documento..."
              className="h-[70px] w-full resize-y rounded-lg border border-borde-campo bg-superficie px-3 py-2.5 text-[13px]"
            />

            {estado?.error && (
              <div role="alert" className="mt-1.5 text-[11.5px] font-semibold text-peligro">
                {estado.error}
              </div>
            )}

            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={pendiente}
                className="cursor-pointer rounded-lg bg-primario-fuerte px-[15px] py-2.5 text-[11.5px] font-bold tracking-[.06em] text-white hover:bg-primario-hover disabled:opacity-60"
              >
                {pendiente ? "PUBLICANDO..." : "PUBLICAR ANOTACIÓN"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
