"use client";

import { useActionState, useRef, useState } from "react";
import { guardarEntradaDiario } from "@/app/estudiante/sesion/[id]/actions";

const EMOCIONES = [
  { label: "ALEGRÍA", color: "#EBB035", tinte: "#FBEFD8" },
  { label: "TRISTEZA", color: "#1B8A8A", tinte: "#E5F1F0" },
  { label: "RABIA", color: "#C0392B", tinte: "#FBE7E4" },
  { label: "ESPERANZA", color: "#177575", tinte: "#E5F1F0" },
  { label: "CONFUSIÓN", color: "#8C8279", tinte: "#F3F0EC" },
];

type Entrada = {
  id: string;
  emocion: string;
  texto: string;
  privada: boolean;
  /** Sesión en la que se escribió, si no se anotó desde el espacio personal. */
  origen: string | null;
  fecha: string;
};

export function DiarioMemoria({ entradas }: { entradas: Entrada[] }) {
  const [emocion, setEmocion] = useState("");
  const [compartir, setCompartir] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, accion, pendiente] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const res = await guardarEntradaDiario(prev, formData);
      if (res.ok) {
        formRef.current?.reset();
        setEmocion("");
        setCompartir(false);
      }
      return res;
    },
    null as { ok?: string; error?: string } | null
  );

  return (
    <div className="animar-aparecer max-w-[900px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">SESIÓN 6.4 · CU05</div>
      <h1 className="mb-1.5 mt-2 text-[28px] font-extrabold tracking-[-.02em]">Diario de la Memoria</h1>
      <p className="mb-4 max-w-[620px] text-[14px] leading-[1.65] text-apagado">
        Un espacio privado para consignar lo que sientes después de escuchar los testimonios. Tú decides qué se
        comparte.
      </p>

      <div className="mb-5 flex items-start gap-2.5 rounded-[10px] border border-secundario-borde bg-secundario-tinte px-4 py-3">
        <svg className="mt-px flex-none" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#177575" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <div className="text-[12.5px] leading-[1.6] text-[#3F6E6C]">
          Tus entradas son <strong>privadas por defecto</strong>. El docente solo verá las que marques como
          compartidas, y nunca su contenido completo sin tu autorización.
        </div>
      </div>

      <form ref={formRef} action={accion} className="mb-5 rounded-xl border border-borde bg-superficie p-5">
        <div className="text-[10px] font-bold tracking-[.12em] text-tenue">¿CÓMO TE SIENTES HOY?</div>
        <input type="hidden" name="emocion" value={emocion} />
        <div className="mt-2 flex flex-wrap gap-2">
          {EMOCIONES.map((e) => {
            const activo = emocion === e.label;
            return (
              <button
                key={e.label}
                type="button"
                aria-pressed={activo}
                onClick={() => setEmocion(activo ? "" : e.label)}
                className="cursor-pointer rounded-full border px-[11px] py-1.5 text-[11px] font-bold"
                style={
                  activo
                    ? { background: e.color, borderColor: e.color, color: "#fff" }
                    : { background: "#fff", borderColor: "#E4DDD6", color: "#7C736C" }
                }
              >
                {e.label}
              </button>
            );
          })}
        </div>

        <label htmlFor="texto" className="sr-only">
          Tu entrada del diario
        </label>
        <textarea
          id="texto"
          name="texto"
          placeholder="Escribe lo que quieras recordar de esta sesión..."
          className="mt-3.5 h-[120px] w-full resize-y rounded-lg border border-borde-campo bg-superficie-suave px-3.5 py-3 text-[13.5px] leading-[1.6]"
        />

        <input type="hidden" name="compartir" value={compartir ? "si" : "no"} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            aria-pressed={compartir}
            onClick={() => setCompartir((c) => !c)}
            className="cursor-pointer rounded-lg border px-3.5 py-2.5 text-[12px] font-bold"
            style={
              compartir
                ? { borderColor: "#1B8A8A", background: "#E5F1F0", color: "#177575" }
                : { borderColor: "#E4DDD6", background: "#fff", color: "#8C8279" }
            }
          >
            Compartir con el docente: {compartir ? "SÍ" : "NO"}
          </button>
          <div className="flex items-center gap-2.5">
            {estado?.ok && (
              <span role="status" className="text-[11.5px] font-semibold text-secundario-fuerte">
                {estado.ok}
              </span>
            )}
            {estado?.error && (
              <span role="alert" className="text-[11.5px] font-semibold text-peligro">
                {estado.error}
              </span>
            )}
            <button
              type="submit"
              disabled={pendiente}
              className="cursor-pointer rounded-lg bg-primario-fuerte px-[18px] py-[11px] text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
            >
              {pendiente ? "Guardando..." : "Guardar entrada"}
            </button>
          </div>
        </div>
      </form>

      <div className="grid gap-3">
        {entradas.map((d) => {
          const emo = EMOCIONES.find((e) => e.label === d.emocion);
          const color = emo?.color ?? "#8C8279";
          return (
            <div
              key={d.id}
              className="rounded-[10px] border border-borde bg-superficie px-[18px] py-4"
              style={{ borderLeft: `3px solid ${color}` }}
            >
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold tracking-[.06em]"
                    style={{ background: emo?.tinte ?? "#F3F0EC", color }}
                  >
                    {d.emocion}
                  </span>
                  <span className="text-[11px] text-suave">{d.fecha}</span>
                </div>
                <span
                  className="rounded-full px-[9px] py-[3px] text-[9.5px] font-extrabold tracking-[.07em]"
                  style={{
                    background: d.privada ? "#F3F0EC" : "#E5F1F0",
                    color: d.privada ? "#A79E96" : "#177575",
                  }}
                >
                  {d.privada ? "PRIVADA" : "COMPARTIDA CON DOCENTE"}
                </span>
              </div>
              <p className="mt-2.5 text-[13.5px] leading-[1.7] text-tinta-media">{d.texto}</p>
            </div>
          );
        })}
        {entradas.length === 0 && (
          <p className="py-8 text-center text-[13px] text-tenue">
            Todavía no has escrito ninguna entrada en tu diario.
          </p>
        )}
      </div>
    </div>
  );
}
