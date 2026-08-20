"use client";

import { useActionState, useRef, useTransition } from "react";
import { alternarForo, crearForo } from "./actions";

type Foro = {
  id: string;
  pregunta: string;
  rolA: string;
  rolB: string;
  fuentes: string;
  abierto: boolean;
};

export function MediacionForos({ foros }: { foros: Foro[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [, iniciarTransicion] = useTransition();
  const [estado, accion, pendiente] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const res = await crearForo(prev, formData);
      if (res.ok) formRef.current?.reset();
      return res;
    },
    null as { ok?: string; error?: string } | null
  );

  return (
    <div className="animar-aparecer max-w-[1000px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">CU08 · SESIÓN 1.3</div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">
        Mediación de Debates y Foros
      </h1>
      <p className="mb-5 max-w-[640px] text-[13.5px] leading-[1.65] text-apagado">
        Habilita espacios de contraste de fuentes donde los estudiantes asumen roles y construyen argumentos
        apoyados en documentos históricos.
      </p>

      <form
        ref={formRef}
        action={accion}
        className="mb-[18px] rounded-xl border border-borde bg-superficie p-5"
      >
        <div className="grid items-end gap-3 lg:grid-cols-[2fr_1fr_1fr_auto]">
          <div>
            <label htmlFor="pregunta" className="text-[10px] font-bold tracking-[.12em] text-tenue">
              PREGUNTA DEL DEBATE
            </label>
            <input
              id="pregunta"
              name="pregunta"
              placeholder="ej. ¿La Reforma Agraria resolvió el problema de la tierra?"
              className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
            />
          </div>
          <div>
            <label htmlFor="rolA" className="text-[10px] font-bold tracking-[.12em] text-tenue">
              ROL A
            </label>
            <input
              id="rolA"
              name="rolA"
              defaultValue="Defensores de la Reforma Agraria"
              className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
            />
          </div>
          <div>
            <label htmlFor="rolB" className="text-[10px] font-bold tracking-[.12em] text-tenue">
              ROL B
            </label>
            <input
              id="rolB"
              name="rolB"
              defaultValue="Modelo productivista"
              className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
            />
          </div>
          <button
            type="submit"
            disabled={pendiente}
            className="cursor-pointer rounded-lg bg-primario-fuerte px-4 py-[11px] text-[12.5px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
          >
            {pendiente ? "Abriendo..." : "Abrir foro"}
          </button>
        </div>
        {estado?.error && (
          <div role="alert" className="mt-2.5 text-[11.5px] font-semibold text-peligro">
            {estado.error}
          </div>
        )}
      </form>

      <div className="grid gap-3">
        {foros.map((f) => (
          <div key={f.id} className="rounded-xl border border-borde bg-superficie p-[18px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="max-w-[640px] text-[15px] font-bold">{f.pregunta}</div>
              <button
                aria-pressed={f.abierto}
                onClick={() => iniciarTransicion(async () => { await alternarForo(f.id); })}
                className="cursor-pointer rounded-full border px-3 py-1.5 text-[10px] font-extrabold tracking-[.07em]"
                style={
                  f.abierto
                    ? { borderColor: "#1B8A8A", background: "#E5F1F0", color: "#177575" }
                    : { borderColor: "#E4DDD6", background: "#fff", color: "#A79E96" }
                }
              >
                {f.abierto ? "FORO ABIERTO" : "FORO CERRADO"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <div className="min-w-[220px] flex-1 rounded-[9px] border border-secundario-borde bg-secundario-tinte px-3.5 py-3">
                <div className="text-[10px] font-bold tracking-[.1em] text-secundario-fuerte">
                  ROL A
                </div>
                <div className="mt-1 text-[13px] font-semibold text-[#3F6E6C]">{f.rolA}</div>
              </div>
              <div className="min-w-[220px] flex-1 rounded-[9px] border border-terciario-borde bg-terciario-tinte px-3.5 py-3">
                <div className="text-[10px] font-bold tracking-[.1em] text-terciario-fuerte">
                  ROL B
                </div>
                <div className="mt-1 text-[13px] font-semibold text-[#8A6516]">{f.rolB}</div>
              </div>
            </div>
            <div className="mt-3 text-[11.5px] text-suave">Fuentes obligatorias: {f.fuentes}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
