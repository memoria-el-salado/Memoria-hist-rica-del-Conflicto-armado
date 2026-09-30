"use client";

import { useState, useTransition } from "react";
import { ACTIVIDADES } from "@/lib/importador-pdf";
import { aplicarSugeridas, cambiarActividad } from "../actions";

type Sesion = { id: string; codigo: string; titulo: string; pantalla: string; publicada: boolean; sugerida: string };
type Eje = { id: string; numero: number; nombre: string; sesiones: Sesion[] };

const etiqueta = (valor: string) => ACTIVIDADES.find((a) => a.valor === valor)?.etiqueta ?? valor;

export function EditorActividades({ casoId, ejes }: { casoId: string; ejes: Eje[] }) {
  const [aviso, setAviso] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const distintas = ejes.flatMap((e) => e.sesiones).filter((s) => s.pantalla !== s.sugerida).length;

  function cambiar(s: Sesion, pantalla: string) {
    iniciar(async () => setAviso(await cambiarActividad(s.id, pantalla)));
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-borde bg-superficie px-[18px] py-3.5">
        <span className="text-[12.5px] text-apagado">
          {distintas === 0
            ? "Todas las sesiones tienen la actividad que sugiere el importador."
            : `${distintas} ${distintas === 1 ? "sesión tiene" : "sesiones tienen"} una actividad distinta de la sugerida.`}
        </span>
        {distintas > 0 && (
          <button
            disabled={pendiente}
            onClick={() => {
              if (confirm(`¿Aplicar la actividad sugerida a ${distintas} ${distintas === 1 ? "sesión" : "sesiones"}?`)) {
                iniciar(async () => setAviso(await aplicarSugeridas(casoId)));
              }
            }}
            className="ml-auto cursor-pointer rounded-lg bg-secundario-fuerte px-3.5 py-2 text-[12px] font-bold text-white hover:bg-secundario disabled:opacity-50"
          >
            Aplicar todas las sugeridas
          </button>
        )}
      </div>

      <div aria-live="polite">
        {aviso?.ok && <div role="status" className="text-[12px] font-semibold text-secundario-fuerte">{aviso.ok}</div>}
        {aviso?.error && <div role="alert" className="text-[12px] font-semibold text-peligro">{aviso.error}</div>}
      </div>

      {ejes.map((e) => (
        <section key={e.id} aria-labelledby={`eje-${e.id}`} className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <h2 id={`eje-${e.id}`} className="border-b border-[#F1EBE5] px-[18px] py-3 text-[12.5px] font-extrabold">
            Eje {e.numero} · {e.nombre}
          </h2>
          <ul>
            {e.sesiones.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 border-b border-[#F7F2ED] px-[18px] py-3 last:border-b-0">
                <span className="w-[34px] text-[13px] font-extrabold text-[#DCD3CB]">{s.codigo}</span>
                <div className="min-w-[220px] flex-1">
                  <div className="text-[13px] font-bold">{s.titulo}</div>
                  <div className="text-[10.5px] text-suave">
                    {s.publicada ? "PUBLICADA" : "BORRADOR"}
                    {s.pantalla !== s.sugerida && <> · Sugerida: {etiqueta(s.sugerida)}</>}
                  </div>
                </div>
                {s.pantalla !== s.sugerida && (
                  <button
                    disabled={pendiente}
                    onClick={() => cambiar(s, s.sugerida)}
                    aria-label={`Usar la sugerida en la sesión ${s.codigo}`}
                    className="cursor-pointer text-[11.5px] font-bold text-secundario-fuerte hover:underline disabled:opacity-50"
                  >
                    Usar la sugerida
                  </button>
                )}
                <select
                  aria-label={`Actividad de la sesión ${s.codigo}`}
                  value={s.pantalla}
                  disabled={pendiente}
                  onChange={(ev) => cambiar(s, ev.target.value)}
                  className="rounded-lg border border-borde-campo bg-superficie-suave px-2.5 py-1.5 text-[12.5px] disabled:opacity-60"
                >
                  {ACTIVIDADES.map((a) => (
                    <option key={a.valor} value={a.valor}>
                      {a.etiqueta}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
