"use client";

import { useState, useTransition } from "react";
import { guardarGuiada } from "@/app/estudiante/sesion/[id]/acciones-guiadas";
import { LIMITES_GUIADA, MINIMO_RESPUESTA, type DatosGuiada, type Guiada, type PlanteamientoDilema } from "@/lib/actividades";
import { CabeceraSesion, TextoSesion, type DatosSesion } from "./cabecera-sesion";

const CONSIGNA: Record<Guiada, { rotulo: string; campo: string; ayuda: string }> = {
  meubico: {
    rotulo: "ME UBICO",
    campo: "Tu reflexión",
    ayuda: "Antes de entrar en el caso, mira tu propia vida: responde desde tu experiencia y con tus palabras.",
  },
  dilema: {
    rotulo: "DILEMA",
    campo: "¿Por qué eliges esa opción? Piensa también en sus consecuencias.",
    ayuda: "No hay una respuesta correcta: lo que importa es cómo la justificas.",
  },
  investigar: {
    rotulo: "A INVESTIGAR",
    campo: "Lo que encontraste",
    ayuda: "Busca en libros, páginas web o pregunta a tu familia y tus vecinos. Anota de dónde sacaste cada cosa.",
  },
  testimonios: {
    rotulo: "TESTIMONIOS",
    campo: "¿Qué te dejaron estos testimonios? ¿Qué vivieron y qué perdieron quienes hablan?",
    ayuda: "Escucha o lee los testimonios del material de esta sesión, más abajo; todos tienen transcripción. Tómate tu tiempo.",
  },
  compromiso: {
    rotulo: "Y TÚ, ¿A QUÉ TE COMPROMETES?",
    campo: "Me comprometo a…",
    ayuda: "Después de este recorrido, ¿qué vas a hacer tú para que lo que pasó no se repita y para cuidar a los demás?",
  },
};

type Props = {
  sesion: DatosSesion;
  tipo: Guiada;
  previa: { texto: string; datos: DatosGuiada } | null;
  /** El dilema tal como lo planteó el docente, si ya lo hizo. */
  dilema: PlanteamientoDilema | null;
  /** La pregunta de la investigación: la del docente o, si no, la orientadora. */
  pregunta: string | null;
  /** Tras responder el dilema: cuántos del curso eligieron cada opción. */
  reparto: { opcion: string; cuantos: number }[] | null;
  /** Los compromisos que el curso decidió compartir. */
  muro: { autor: string; texto: string; propio: boolean }[] | null;
};

export function ActividadGuiada({ sesion, tipo, previa, dilema, pregunta, reparto, muro }: Props) {
  const [texto, setTexto] = useState(previa?.texto ?? "");
  const [opcion, setOpcion] = useState(previa?.datos.opcion ?? "");
  const [fuentes, setFuentes] = useState<string[]>(previa?.datos.fuentes?.length ? previa.datos.fuentes : [""]);
  const [compartido, setCompartido] = useState(previa?.datos.compartido ?? false);
  const [estado, setEstado] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const consigna = CONSIGNA[tipo];
  const sinPlantear = tipo === "dilema" && !dilema;

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const datos = tipo === "dilema" ? { opcion } : tipo === "investigar" ? { fuentes } : tipo === "compromiso" ? { compartido } : {};
    iniciar(async () => setEstado(await guardarGuiada({ sesionId: sesion.id, texto, datos })));
  }

  const campo = "w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px] leading-[1.7]";

  return (
    <div className="animar-aparecer max-w-[1100px]">
      <CabeceraSesion sesion={sesion} />

      <div className="rejilla-panel">
        <TextoSesion sesion={sesion} />

        <form onSubmit={guardar} className="self-start rounded-xl border border-borde bg-superficie p-5">
          <div className="text-[12.5px] font-extrabold tracking-[.05em] text-primario-fuerte">{consigna.rotulo}</div>
          <p className="mt-1.5 text-[12px] leading-[1.6] text-tenue">{consigna.ayuda}</p>

          {tipo === "meubico" && sesion.preguntaOrientadora && (
            <p className="mt-3 text-[13.5px] font-semibold leading-snug text-tinta-media">{sesion.preguntaOrientadora}</p>
          )}

          {tipo === "investigar" && pregunta && (
            <p className="mt-3 rounded-lg bg-primario-tinte px-3 py-2.5 text-[13.5px] font-semibold leading-snug text-tinta-media">{pregunta}</p>
          )}

          {tipo === "dilema" &&
            (dilema ? (
              <fieldset className="mt-3">
                <legend className="text-[13.5px] font-semibold leading-snug text-tinta-media">{dilema.pregunta}</legend>
                <div className="mt-2.5 grid gap-1.5">
                  {dilema.opciones.map((o) => (
                    <label
                      key={o}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-[13px] ${
                        opcion === o ? "border-secundario bg-secundario-tinte" : "border-borde"
                      }`}
                    >
                      <input type="radio" name="opcion" value={o} checked={opcion === o} onChange={() => setOpcion(o)} className="mt-1" />
                      {o}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-borde-campo px-3 py-3 text-[12.5px] text-apagado">
                Tu docente todavía no ha planteado las opciones de este dilema. Mientras tanto, lee la sesión.
              </p>
            ))}

          {!sinPlantear && (
            <>
              <label htmlFor="respuesta-guiada" className="mt-3.5 block text-[11.5px] font-semibold text-apagado">
                {consigna.campo}
              </label>
              <textarea
                id="respuesta-guiada"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={LIMITES_GUIADA.respuestaMaxima}
                className={`${campo} mt-1.5 h-40 resize-y`}
              />
              <div className="mt-1 text-right text-[11px] text-tenue">
                {texto.trim().length} caracteres · mínimo {MINIMO_RESPUESTA[tipo]}
              </div>

              {tipo === "investigar" && (
                <fieldset className="mt-2">
                  <legend className="text-[11.5px] font-semibold text-apagado">Fuentes</legend>
                  <div className="mt-1.5 grid gap-1.5">
                    {fuentes.map((f, i) => (
                      <div key={i} className="flex gap-1.5">
                        <label htmlFor={`fuente-${i}`} className="sr-only">
                          Fuente {i + 1}
                        </label>
                        <input
                          id={`fuente-${i}`}
                          value={f}
                          onChange={(e) => setFuentes((todas) => todas.map((x, j) => (j === i ? e.target.value : x)))}
                          maxLength={LIMITES_GUIADA.fuenteMaxima}
                          placeholder="ej. Entrevista a mi abuela · www.centrodememoriahistorica.gov.co"
                          className={`${campo} min-w-0 flex-1 py-2`}
                        />
                        {fuentes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setFuentes((todas) => todas.filter((_, j) => j !== i))}
                            aria-label={`Quitar la fuente ${i + 1}`}
                            className="cursor-pointer px-2 text-[14px] text-apagado hover:text-peligro"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {fuentes.length < LIMITES_GUIADA.fuentesMaximas && (
                    <button
                      type="button"
                      onClick={() => setFuentes((todas) => [...todas, ""])}
                      className="mt-1.5 cursor-pointer text-[11.5px] font-bold text-secundario-fuerte hover:underline"
                    >
                      + Otra fuente
                    </button>
                  )}
                </fieldset>
              )}

              {tipo === "compromiso" && (
                <label className="mt-2 flex cursor-pointer items-start gap-2 text-[12.5px] text-apagado">
                  <input type="checkbox" checked={compartido} onChange={(e) => setCompartido(e.target.checked)} className="mt-1" />
                  Compartirlo con mi curso. Se verá con mi nombre.
                </label>
              )}
              {tipo === "meubico" && <p className="mt-2 text-[11px] text-suave">Solo tu docente lee lo que escribes aquí.</p>}

              <button
                type="submit"
                disabled={pendiente}
                className="mt-3 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-50"
              >
                {pendiente ? "Guardando..." : previa ? "Actualizar" : "Guardar"}
              </button>
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
            </>
          )}
        </form>
      </div>

      {reparto && <RepartoDelCurso reparto={reparto} miOpcion={previa?.datos.opcion} />}
      {muro && <MuroDeCompromisos muro={muro} />}
    </div>
  );
}

/** Cómo eligió el curso: cuántos por opción, sin nombres. */
function RepartoDelCurso({ reparto, miOpcion }: { reparto: { opcion: string; cuantos: number }[]; miOpcion?: string }) {
  const total = reparto.reduce((s, r) => s + r.cuantos, 0);
  return (
    <section aria-labelledby="titulo-reparto" className="mt-[18px] rounded-xl border border-secundario-borde bg-secundario-tinte p-5">
      <h2 id="titulo-reparto" className="text-[12px] font-extrabold tracking-[.06em] text-secundario-fuerte">
        CÓMO ELIGIÓ TU CURSO
      </h2>
      <p className="mt-1 text-[11.5px] text-[#3F6E6C]">
        {total === 1 ? "1 respuesta" : `${total} respuestas`}, sin nombres. Llévalo a la discusión: ¿qué pesó en cada elección?
      </p>
      <ul className="mt-3 grid gap-2">
        {reparto.map((r) => {
          const porcentaje = total ? Math.round((r.cuantos / total) * 100) : 0;
          return (
            <li key={r.opcion}>
              <div className="flex justify-between gap-2 text-[12.5px]">
                <span className="font-semibold text-tinta-media">
                  {r.opcion}
                  {r.opcion === miOpcion && <span className="ml-1.5 text-[11px] font-bold text-secundario-fuerte">(tu elección)</span>}
                </span>
                <span className="font-extrabold text-secundario-fuerte">
                  {r.cuantos} · {porcentaje}%
                </span>
              </div>
              <div className="mt-1 h-[7px] overflow-hidden rounded-[9px] bg-white/70">
                <div className="h-full bg-secundario" style={{ width: `${porcentaje}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MuroDeCompromisos({ muro }: { muro: { autor: string; texto: string; propio: boolean }[] }) {
  return (
    <section aria-labelledby="titulo-muro" className="mt-[18px] rounded-xl border border-terciario-borde bg-terciario-tinte p-5">
      <h2 id="titulo-muro" className="text-[12px] font-extrabold tracking-[.06em] text-terciario-fuerte">
        COMPROMISOS DE TU CURSO
      </h2>
      {muro.length === 0 ? (
        <p className="mt-1.5 text-[12px] text-apagado">Nadie ha compartido todavía su compromiso.</p>
      ) : (
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {muro.map((m, i) => (
            <li key={i} className="rounded-lg border border-white bg-white/70 px-3.5 py-3">
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-tinta-media">{m.texto}</p>
              <div className="mt-1.5 text-[11px] font-bold text-terciario-fuerte">{m.propio ? `${m.autor} (tú)` : m.autor}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
