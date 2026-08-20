"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { alternarAlertaRecurso, cargarRecurso } from "./actions";

const TIPOS = [
  { valor: "VIDEO", label: "Video" },
  { valor: "AUDIO", label: "Audio" },
  { valor: "DOCUMENTO", label: "Documento" },
  { valor: "SIMULADOR", label: "Simulador" },
];

const ETIQUETA_TIPO: Record<string, string> = {
  VIDEO: "Video",
  AUDIO: "Audio",
  DOCUMENTO: "Documento",
  SIMULADOR: "Simulador",
};

type Recurso = {
  id: string;
  titulo: string;
  contexto: string;
  eje: string;
  tipo: string;
  alerta: boolean;
};

type Props = {
  recursos: Recurso[];
  ejes: { id: string; label: string }[];
};

export function GestionContenido({ recursos, ejes }: Props) {
  const [alerta, setAlerta] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [, iniciarTransicion] = useTransition();
  const [estado, accion, pendiente] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const res = await cargarRecurso(prev, formData);
      if (res.ok) {
        formRef.current?.reset();
        setAlerta(false);
      }
      return res;
    },
    null as { ok?: string; error?: string } | null
  );

  return (
    <div className="animar-aparecer">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">CU06 · LCMS</div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">
        Gestión de Contenido Multimedia
      </h1>
      <p className="mb-5 max-w-[640px] text-[13.5px] leading-[1.65] text-apagado">
        Carga y organiza recursos en los módulos temáticos. Todo recurso exige contexto histórico, y puedes
        activar una Alerta de Cuidado antes de contenidos emocionalmente retadores.
      </p>

      <div className="grid items-start gap-[18px] xl:grid-cols-[1.6fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <div className="grid grid-cols-[2.4fr_1fr_1fr_.9fr] gap-2.5 border-b border-[#F1EBE5] bg-superficie-suave px-4 py-3 text-[10px] font-bold tracking-[.1em] text-suave">
            <span>RECURSO</span>
            <span>EJE</span>
            <span>TIPO</span>
            <span>ALERTA</span>
          </div>
          {recursos.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[2.4fr_1fr_1fr_.9fr] items-center gap-2.5 border-b border-[#F7F2ED] px-4 py-3.5"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-bold">{r.titulo}</div>
                <div className="mt-0.5 text-[11px] text-suave">{r.contexto}</div>
              </div>
              <span className="text-[11.5px] text-apagado">{r.eje}</span>
              <span className="justify-self-start rounded-full border border-borde px-2.5 py-[3px] text-[10.5px] font-bold tracking-[.05em] text-[#7C736C]">
                {ETIQUETA_TIPO[r.tipo] ?? r.tipo}
              </span>
              <button
                aria-pressed={r.alerta}
                aria-label={`${r.alerta ? "Desactivar" : "Activar"} alerta de cuidado en ${r.titulo}`}
                onClick={() => iniciarTransicion(async () => { await alternarAlertaRecurso(r.id); })}
                className="cursor-pointer rounded-full border px-2.5 py-[5px] text-[9.5px] font-extrabold tracking-[.06em]"
                style={
                  r.alerta
                    ? { borderColor: "#D95D39", background: "#FDF4F0", color: "#B8482A" }
                    : { borderColor: "#E4DDD6", background: "#fff", color: "#A79E96" }
                }
              >
                {r.alerta ? "ACTIVA" : "INACTIVA"}
              </button>
            </div>
          ))}
        </div>

        <form ref={formRef} action={accion} className="rounded-xl border border-borde bg-superficie p-5">
          <div className="text-[12.5px] font-extrabold tracking-[.05em] text-primario-fuerte">
            NUEVO RECURSO
          </div>

          <label htmlFor="titulo" className="mt-3.5 block text-[10px] font-bold tracking-[.12em] text-tenue">
            TÍTULO
          </label>
          <input
            id="titulo"
            name="titulo"
            placeholder="ej. Copla: Tierra de abundancia"
            className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
          />

          <label htmlFor="ejeId" className="mt-3 block text-[10px] font-bold tracking-[.12em] text-tenue">
            EJE TEMÁTICO
          </label>
          <select
            id="ejeId"
            name="ejeId"
            defaultValue={ejes[0]?.id ?? ""}
            className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
          >
            {ejes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>

          <label htmlFor="tipo" className="mt-3 block text-[10px] font-bold tracking-[.12em] text-tenue">
            TIPO
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue="VIDEO"
            className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>

          <label htmlFor="contexto" className="mt-3 block text-[10px] font-bold tracking-[.12em] text-tenue">
            CONTEXTO HISTÓRICO (OBLIGATORIO)
          </label>
          <textarea
            id="contexto"
            name="contexto"
            placeholder="Procedencia, año y advertencias del recurso"
            className="mt-1.5 h-[76px] w-full resize-y rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
          />

          <input type="hidden" name="alerta" value={alerta ? "si" : "no"} />
          <button
            type="button"
            aria-pressed={alerta}
            onClick={() => setAlerta((a) => !a)}
            className="mt-3.5 w-full cursor-pointer rounded-lg border px-4 py-2.5 text-[12px] font-bold"
            style={
              alerta
                ? { borderColor: "#D95D39", background: "#FDF4F0", color: "#B8482A" }
                : { borderColor: "#E4DDD6", background: "#fff", color: "#8C8279" }
            }
          >
            Alerta de cuidado: {alerta ? "ACTIVADA" : "desactivada"}
          </button>

          <button
            type="submit"
            disabled={pendiente}
            className="mt-2.5 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
          >
            {pendiente ? "Cargando..." : "Cargar al módulo"}
          </button>

          {estado?.ok && (
            <div role="status" className="mt-2.5 text-[11.5px] font-semibold text-secundario-fuerte">
              {estado.ok}
            </div>
          )}
          {estado?.error && (
            <div role="alert" className="mt-2.5 text-[11.5px] font-semibold text-peligro">
              {estado.error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
