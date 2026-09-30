"use client";

import { useState, useTransition } from "react";
import { LIMITES_GUIADA } from "@/lib/actividades";
import { guardarPlanteamiento } from "../actions";

export function FormularioPlanteamiento({
  sesionId,
  tipo,
  pregunta: preguntaInicial,
  opciones: opcionesIniciales,
  yaPlanteada,
}: {
  sesionId: string;
  tipo: string;
  pregunta: string;
  opciones: string[];
  yaPlanteada: boolean;
}) {
  const [pregunta, setPregunta] = useState(preguntaInicial);
  const [opciones, setOpciones] = useState(opcionesIniciales);
  const [estado, setEstado] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const esDilema = tipo === "dilema";

  const campo = "mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => setEstado(await guardarPlanteamiento(sesionId, { pregunta, opciones })));
      }}
      className="rounded-xl border border-borde bg-superficie p-5"
    >
      <label htmlFor="pregunta-planteamiento" className="text-[10px] font-bold tracking-[.12em] text-tenue">
        {esDilema ? "EL DILEMA" : "LA PREGUNTA DE INVESTIGACIÓN"}
      </label>
      <textarea
        id="pregunta-planteamiento"
        value={pregunta}
        onChange={(e) => setPregunta(e.target.value)}
        maxLength={LIMITES_GUIADA.preguntaMaxima}
        className={`${campo} h-24 resize-y`}
      />

      {esDilema && (
        <fieldset className="mt-3">
          <legend className="text-[10px] font-bold tracking-[.12em] text-tenue">OPCIONES</legend>
          <div className="mt-1.5 grid gap-1.5">
            {opciones.map((o, i) => (
              <div key={i} className="flex gap-1.5">
                <label htmlFor={`opcion-${i}`} className="sr-only">
                  Opción {i + 1}
                </label>
                <input
                  id={`opcion-${i}`}
                  value={o}
                  onChange={(e) => setOpciones((todas) => todas.map((x, j) => (j === i ? e.target.value : x)))}
                  maxLength={LIMITES_GUIADA.opcionMaxima}
                  placeholder={`Opción ${i + 1}`}
                  className={`${campo} mt-0 min-w-0 flex-1`}
                />
                {opciones.length > LIMITES_GUIADA.opcionesMinimas && (
                  <button
                    type="button"
                    onClick={() => setOpciones((todas) => todas.filter((_, j) => j !== i))}
                    aria-label={`Quitar la opción ${i + 1}`}
                    className="cursor-pointer px-2 text-[14px] text-apagado hover:text-peligro"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {opciones.length < LIMITES_GUIADA.opcionesMaximas && (
            <button
              type="button"
              onClick={() => setOpciones((todas) => [...todas, ""])}
              className="mt-1.5 cursor-pointer text-[11.5px] font-bold text-secundario-fuerte hover:underline"
            >
              + Otra opción
            </button>
          )}
          {yaPlanteada && (
            <p className="mt-2 text-[11px] text-suave">
              Si cambias una opción, quien ya la eligió conserva su respuesta, pero esa opción deja de contarse en el reparto.
            </p>
          )}
        </fieldset>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="mt-4 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-50"
      >
        {pendiente ? "Guardando..." : yaPlanteada ? "Actualizar el planteamiento" : esDilema ? "Plantear el dilema" : "Plantear la pregunta"}
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
    </form>
  );
}
