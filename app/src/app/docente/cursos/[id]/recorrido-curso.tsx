"use client";

import { useState, useTransition } from "react";
import { UMBRALES } from "@/lib/desbloqueo";
import { alternarEjeAbierto, guardarRecorrido } from "../actions";

type Props = {
  cursoId: string;
  recorrido: { recorrido: string; umbral: number; abiertos: string[] };
  ejes: { id: string; numero: number; nombre: string; esPreambulo: boolean }[];
};

/**
 * El docente decide cómo recorre el mapa su curso: libre, como hasta ahora, o
 * eje por eje, abriendo el siguiente al llegar a un avance o cuando él quiera.
 */
export function RecorridoCurso({ cursoId, recorrido, ejes }: Props) {
  const [modo, setModo] = useState(recorrido.recorrido);
  const [umbral, setUmbral] = useState(recorrido.umbral);
  const [aviso, setAviso] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const enOrden = recorrido.recorrido === "EN_ORDEN";

  return (
    <section aria-labelledby="titulo-recorrido" className="rounded-xl border border-borde bg-superficie p-5">
      <h2 id="titulo-recorrido" className="text-[12.5px] font-extrabold tracking-[.05em] text-primario-fuerte">
        RECORRIDO DEL MAPA
      </h2>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-tenue">
        En orden, cada eje se abre cuando el estudiante llega al avance que elijas en el anterior. Puedes abrir un eje
        para todo el curso cuando quieras.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => setAviso(await guardarRecorrido(cursoId, { recorrido: modo, umbral })));
        }}
        className="mt-3 grid gap-2"
      >
        <fieldset className="grid gap-1.5 text-[12.5px]">
          <legend className="sr-only">Recorrido</legend>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" name="recorrido" checked={modo === "LIBRE"} onChange={() => setModo("LIBRE")} />
            Libre: cualquier sesión publicada
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" name="recorrido" checked={modo === "EN_ORDEN"} onChange={() => setModo("EN_ORDEN")} />
            En orden, eje por eje
          </label>
        </fieldset>
        {modo === "EN_ORDEN" && (
          <label className="flex items-center gap-2 text-[12px] text-apagado">
            Abrir el siguiente al llegar al
            <select
              id="umbral-recorrido"
              value={umbral}
              onChange={(e) => setUmbral(Number(e.target.value))}
              className="rounded-lg border border-borde-campo bg-superficie-suave px-2 py-1 text-[12.5px]"
            >
              {UMBRALES.map((u) => (
                <option key={u} value={u}>
                  {u}%
                </option>
              ))}
            </select>
            del anterior
          </label>
        )}
        <button
          type="submit"
          disabled={pendiente}
          className="justify-self-start cursor-pointer rounded-lg bg-secundario-fuerte px-3.5 py-2 text-[12px] font-bold text-white hover:bg-secundario disabled:opacity-50"
        >
          Guardar recorrido
        </button>
      </form>

      {enOrden && (
        <ul className="mt-3.5 grid gap-1.5 border-t border-[#F1EBE5] pt-3">
          {ejes
            .filter((e) => !e.esPreambulo)
            .map((e, i) => {
              const abierto = recorrido.abiertos.includes(e.id);
              return (
                <li key={e.id} className="flex items-center gap-2 text-[12px]">
                  <span className="min-w-0 flex-1 truncate">
                    <strong>Eje {e.numero}</strong> {e.nombre}
                  </span>
                  {i === 0 ? (
                    <span className="text-[11px] text-suave">siempre abierto</span>
                  ) : (
                    <button
                      disabled={pendiente}
                      onClick={() => iniciar(async () => setAviso(await alternarEjeAbierto(cursoId, e.id)))}
                      aria-pressed={abierto}
                      aria-label={`${abierto ? "Dejar de abrir a mano" : "Abrir ya"} el eje ${e.numero}`}
                      className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                        abierto ? "border-secundario bg-secundario text-white" : "border-borde-campo text-apagado"
                      }`}
                    >
                      {abierto ? "Abierto" : "Abrir ya"}
                    </button>
                  )}
                </li>
              );
            })}
        </ul>
      )}
      {aviso?.ok && <p role="status" className="mt-2 text-[11.5px] font-semibold text-secundario-fuerte">{aviso.ok}</p>}
      {aviso?.error && <p role="alert" className="mt-2 text-[11.5px] font-semibold text-peligro">{aviso.error}</p>}
    </section>
  );
}
