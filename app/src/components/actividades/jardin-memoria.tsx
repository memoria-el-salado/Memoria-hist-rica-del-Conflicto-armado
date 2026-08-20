"use client";

import { useActionState, useState } from "react";
import { sembrarMemoria } from "@/app/estudiante/sesion/[id]/actions";
import { CabeceraSesion, type DatosSesion } from "./cabecera-sesion";

const ICONOS: Record<string, string> = {
  FLOR: "M12 21V11M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 15c-3 0-5-2-5-4",
  HOJA: "M11 20A7 7 0 0 1 4 13c0-6 8-9 16-9 0 8-3 16-9 16zM4 21c3-6 6-9 10-11",
  SEMILLA: "M12 3c4 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2-6 6-10z",
  MANO: "M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v7M10 10V6a2 2 0 1 0-4 0v10a6 6 0 0 0 12 0v-3",
};

const EPOCAS = [
  { valor: "ANTES_1997", label: "Antes de 1997" },
  { valor: "ENTRE_1997_2000", label: "1997 - 2000" },
  { valor: "RETORNO", label: "Retorno (2002 - hoy)" },
];

const PIEZAS = [
  { valor: "FLOR", label: "Flor" },
  { valor: "HOJA", label: "Hoja" },
  { valor: "SEMILLA", label: "Semilla" },
  { valor: "MANO", label: "Mano" },
];

type Flor = {
  id: string;
  nombre: string;
  legado: string;
  epoca: string;
  pieza: string;
  tono: string;
  altura: number;
};

export function JardinMemoria({
  sesion,
  flores,
}: {
  sesion: DatosSesion;
  flores: Flor[];
}) {
  const [sembrando, setSembrando] = useState(false);
  const [filtro, setFiltro] = useState("TODAS");
  const [pieza, setPieza] = useState("FLOR");
  const [estado, accion, pendiente] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const res = await sembrarMemoria(prev, formData);
      if (res.ok) {
        setSembrando(false);
        setFiltro("TODAS");
      }
      return res;
    },
    null as { ok?: string; error?: string } | null
  );

  const visibles = flores.filter((f) => filtro === "TODAS" || f.epoca === filtro);

  return (
    <div className="animar-aparecer">
      <CabeceraSesion sesion={sesion} />

      <p className="max-w-[720px] text-[13.5px] leading-[1.7] text-apagado">
        Cada pieza que siembres honra una vida y un legado. El jardín es colectivo: lo que plantes
        aquí lo verá el resto del grupo en esta misma sesión.
      </p>

      <div className="my-5 flex flex-wrap justify-center gap-2.5">
        <button
          onClick={() => setSembrando((s) => !s)}
          className="cursor-pointer rounded-lg bg-primario-fuerte px-[18px] py-[11px] text-[13px] font-bold text-white hover:bg-primario-hover"
        >
          {sembrando ? "Cerrar formulario" : "Sembrar una Memoria"}
        </button>
        {[{ valor: "TODAS", label: "Todas" }, ...EPOCAS].map((f) => {
          const activo = filtro === f.valor;
          return (
            <button
              key={f.valor}
              aria-pressed={activo}
              onClick={() => setFiltro(f.valor)}
              className="cursor-pointer rounded-full border px-[11px] py-1.5 text-[11px] font-bold"
              style={
                activo
                  ? { background: "#B8482A", borderColor: "#B8482A", color: "#fff" }
                  : { background: "#fff", borderColor: "#E4DDD6", color: "#7C736C" }
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {sembrando && (
        <form
          action={accion}
          className="animar-aparecer mx-auto mb-[26px] max-w-[720px] rounded-xl border border-borde bg-superficie p-[22px]"
        >
          <input type="hidden" name="sesionId" value={sesion.id} />
          <div className="text-[12.5px] font-extrabold tracking-[.05em] text-primario-fuerte">
            SEMBRAR UNA MEMORIA
          </div>
          <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
            <div>
              <label htmlFor="nombre" className="text-[10px] font-bold tracking-[.12em] text-tenue">
                NOMBRE DE LA PERSONA
              </label>
              <input
                id="nombre"
                name="nombre"
                placeholder="Nombre y apellido"
                className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
              />
            </div>
            <div>
              <label htmlFor="epoca" className="text-[10px] font-bold tracking-[.12em] text-tenue">
                ÉPOCA
              </label>
              <select
                id="epoca"
                name="epoca"
                defaultValue="ANTES_1997"
                className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
              >
                {EPOCAS.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label htmlFor="legado" className="mt-3.5 block text-[10px] font-bold tracking-[.12em] text-tenue">
            LEGADO HISTÓRICO
          </label>
          <textarea
            id="legado"
            name="legado"
            placeholder="ej. Gestor de la primera cancha de fútbol del corregimiento"
            className="mt-1.5 h-20 w-full resize-y rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
          />

          <div className="mt-3.5 text-[10px] font-bold tracking-[.12em] text-tenue">PIEZA ARTÍSTICA</div>
          <input type="hidden" name="pieza" value={pieza} />
          <div className="mt-2 flex flex-wrap gap-2">
            {PIEZAS.map((p) => {
              const activo = pieza === p.valor;
              return (
                <button
                  key={p.valor}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setPieza(p.valor)}
                  className="cursor-pointer rounded-full border px-[11px] py-1.5 text-[11px] font-bold"
                  style={
                    activo
                      ? { background: "#1B8A8A", borderColor: "#1B8A8A", color: "#fff" }
                      : { background: "#fff", borderColor: "#E4DDD6", color: "#7C736C" }
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
            <button
              type="submit"
              disabled={pendiente}
              className="cursor-pointer rounded-lg bg-secundario px-[18px] py-[11px] text-[13px] font-bold text-white hover:bg-secundario-fuerte disabled:opacity-60"
            >
              {pendiente ? "Sembrando..." : "Sembrar en el jardín"}
            </button>
            <button
              type="button"
              onClick={() => setSembrando(false)}
              className="cursor-pointer rounded-lg border border-borde-campo bg-superficie px-[18px] py-[11px] text-[13px] font-semibold text-apagado"
            >
              Cancelar
            </button>
            {estado?.error && (
              <span role="alert" className="text-[11.5px] font-semibold text-peligro">
                {estado.error}
              </span>
            )}
          </div>
        </form>
      )}

      <div className="min-h-[330px] rounded-[14px] border border-borde bg-[linear-gradient(180deg,#FBF7F1_0%,#F4EEE6_100%)] px-6 pb-8 pt-7">
        <div className="grid grid-cols-2 gap-[18px] md:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          {visibles.map((f) => (
            <div key={f.id} className="flex flex-col items-center text-center">
              <div
                className="w-0.5"
                style={{
                  height: f.altura,
                  background: "linear-gradient(180deg,rgba(200,170,120,0) 0%,#C9A96E 100%)",
                }}
              />
              <div
                className="animar-mecer flex h-[46px] w-[46px] items-center justify-center rounded-xl shadow-[0_6px_14px_rgba(120,80,50,.16)]"
                style={{ background: f.tono }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONOS[f.pieza] ?? ICONOS.FLOR} />
                </svg>
              </div>
              <div className="mt-2.5 text-[12.5px] font-bold">{f.nombre}</div>
              <div className="mt-[3px] max-w-[190px] text-[11px] leading-[1.5] text-[#7C736C]">{f.legado}</div>
              <div className="mt-1.5 text-[9.5px] font-bold tracking-[.08em] text-suave">
                {EPOCAS.find((e) => e.valor === f.epoca)?.label.toUpperCase() ?? f.epoca}
              </div>
            </div>
          ))}
          {visibles.length === 0 && (
            <p className="col-span-full py-10 text-center text-[13px] text-tenue">
              No hay memorias sembradas en esta época todavía.
            </p>
          )}
        </div>
      </div>

      <div className="mt-[22px] rounded-xl border border-borde bg-superficie p-6">
        <h2 className="inline-block border-b-2 border-secundario pb-1 text-[18px] font-extrabold text-secundario-fuerte">
          Instrucciones del Sembrado
        </h2>
        <div className="mt-[18px] grid gap-[22px] sm:grid-cols-2">
          <div>
            <div className="text-[10.5px] font-bold tracking-[.1em] text-primario">1. EL ACTO DE RECORDAR</div>
            <p className="mt-1.5 text-[12.5px] leading-[1.7] text-apagado">
              Al hacer clic en una de las formas orgánicas del jardín, desbloqueas un fragmento de la historia
              oral de El Salado. Cada elemento ha sido curado por el equipo de archivo en diálogo con las
              familias.
            </p>
          </div>
          <div>
            <div className="text-[10.5px] font-bold tracking-[.1em] text-primario">2. SEMBRAR LEGADO</div>
            <p className="mt-1.5 text-[12.5px] leading-[1.7] text-apagado">
              Como estudiante o visitante, puedes aportar una reflexión que se convertirá en una &quot;hoja&quot;
              protectora para las flores existentes. La memoria se cuida entre todas.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-[15px] italic text-secundario-fuerte">
        &quot;La memoria es el único jardín del que no podemos ser expulsados.&quot;
      </p>
      <div className="mt-2 text-center text-[10px] font-bold tracking-[.12em] text-suave">
        — ADAPTACIÓN LITERARIA DEL SALADO
      </div>
    </div>
  );
}
