"use client";

import { useState, useTransition } from "react";
import { desvincularCartilla, vincularCartilla } from "../actions";

type Documento = { id: string; titulo: string; soloDocentes: boolean };

/**
 * Las cartillas que acompañan las sesiones del módulo: la que le dio origen y
 * las que se le vinculan. Cada sesión las abre en su apartado.
 */
export function CartillasModulo({
  casoId,
  fuente,
  vinculadas,
  disponibles,
}: {
  casoId: string;
  fuente: Documento[];
  vinculadas: Documento[];
  disponibles: Documento[];
}) {
  const [elegido, setElegido] = useState("");
  const [aviso, setAviso] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const tipo = (d: Documento) => (d.soloDocentes ? "Guía para maestros · solo docentes" : "Cartilla del estudiante");

  return (
    <section aria-labelledby="titulo-cartillas-modulo" className="mb-6 rounded-xl border border-borde bg-superficie p-[18px]">
      <h2 id="titulo-cartillas-modulo" className="text-[14px] font-extrabold">
        Cartillas en las sesiones
      </h2>
      <p className="mt-1 max-w-[720px] text-[12.5px] leading-relaxed text-apagado">
        Cada sesión del módulo ofrece estas cartillas abiertas en su apartado. El estudiante ve solo las que no están
        reservadas a los docentes.
      </p>
      <ul className="mt-3 grid gap-2">
        {[...fuente.map((d) => ({ ...d, vinculada: false })), ...vinculadas.map((d) => ({ ...d, vinculada: true }))].map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-borde px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold">{d.titulo}</div>
              <div className="text-[11px] text-apagado">
                {tipo(d)} · {d.vinculada ? "vinculada" : "fuente del módulo"}
              </div>
            </div>
            {d.vinculada && (
              <button
                type="button"
                disabled={pendiente}
                onClick={() => iniciar(async () => setAviso(await desvincularCartilla(casoId, d.id)))}
                className="min-h-11 cursor-pointer rounded-lg border border-borde px-3 text-[12px] font-bold text-apagado hover:border-primario hover:text-primario-fuerte disabled:opacity-50"
              >
                Quitar<span className="sr-only"> {d.titulo}</span>
              </button>
            )}
          </li>
        ))}
        {fuente.length + vinculadas.length === 0 && (
          <li className="text-[12.5px] text-apagado">Este módulo todavía no tiene cartillas.</li>
        )}
      </ul>

      {disponibles.length > 0 && (
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!elegido) return;
            iniciar(async () => {
              const r = await vincularCartilla(casoId, elegido);
              setAviso(r);
              if (r.ok) setElegido("");
            });
          }}
        >
          <label className="grid min-w-0 flex-1 gap-1 text-[11.5px] font-bold text-tinta-media">
            Vincular otra cartilla del repositorio
            <select
              value={elegido}
              onChange={(e) => setElegido(e.target.value)}
              className="min-h-11 w-full min-w-0 rounded-lg border border-borde bg-white px-3 text-[13px] font-normal"
            >
              <option value="">Elige un documento…</option>
              {disponibles.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.titulo} ({tipo(d)})
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={pendiente || !elegido}
            className="min-h-11 cursor-pointer rounded-lg bg-secundario-fuerte px-4 text-[12.5px] font-bold text-white hover:bg-secundario disabled:opacity-50"
          >
            Vincular
          </button>
        </form>
      )}
      <p role="status" className="mt-2 text-[12px] font-semibold">
        {aviso?.error ? <span className="text-[#A1281F]">{aviso.error}</span> : aviso?.ok ? <span className="text-secundario-fuerte">Listo.</span> : null}
      </p>
    </section>
  );
}
