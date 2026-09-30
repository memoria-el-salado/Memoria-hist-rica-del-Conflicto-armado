"use client";

import { useState, useTransition } from "react";
import { CATEGORIAS } from "@/lib/subpoblaciones";
import { declararSubpoblacion } from "./actions";

/**
 * La subpoblación de un estudiante: se declara solo con la autorización del
 * acudiente, que el docente registra aquí. Sin ella, el dato no se guarda.
 */
export function DeclaracionSubpoblacion({
  estudiante,
}: {
  estudiante: { id: string; nombre: string; subpoblacion: string | null; autorizadaEl: string | null };
}) {
  const [abierta, setAbierta] = useState(false);
  const [categoria, setCategoria] = useState(estudiante.autorizadaEl ? (estudiante.subpoblacion ?? "") : "");
  const [consentimiento, setConsentimiento] = useState(false);
  const [aviso, setAviso] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const actual =
    estudiante.subpoblacion && estudiante.autorizadaEl
      ? `${estudiante.subpoblacion} · autorizada el ${estudiante.autorizadaEl}`
      : "Sin declarar";

  return (
    <div className="basis-full pl-11 text-[11.5px]">
      <span className="text-suave">Subpoblación: </span>
      <span className="font-semibold text-apagado">{actual}</span>
      <button
        type="button"
        onClick={() => setAbierta((a) => !a)}
        aria-expanded={abierta}
        aria-label={`Declarar la subpoblación de ${estudiante.nombre}`}
        className="ml-2 cursor-pointer font-bold text-secundario-fuerte hover:underline"
      >
        {abierta ? "Cerrar" : "Cambiar"}
      </button>
      {abierta && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              const r = await declararSubpoblacion(estudiante.id, { categoria, consentimiento });
              setAviso(r);
              if (r.ok) setAbierta(false);
            });
          }}
          className="mt-2 grid max-w-[520px] gap-2 rounded-lg border border-borde bg-superficie-suave p-3"
        >
          <label htmlFor={`subpoblacion-${estudiante.id}`} className="sr-only">
            Subpoblación de {estudiante.nombre}
          </label>
          <select
            id={`subpoblacion-${estudiante.id}`}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="rounded-lg border border-borde-campo bg-superficie px-2.5 py-1.5 text-[12.5px]"
          >
            <option value="">Sin declarar</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {categoria && (
            <label className="flex cursor-pointer items-start gap-2 text-[11.5px] leading-snug text-apagado">
              <input
                id={`consentimiento-${estudiante.id}`}
                type="checkbox"
                checked={consentimiento}
                onChange={(e) => setConsentimiento(e.target.checked)}
                className="mt-0.5"
              />
              El acudiente autorizó registrar este dato. Es un dato sensible (Ley 1581 de 2012): solo se usa en reportes
              agregados y nunca se muestra un grupo de menos de cinco estudiantes.
            </label>
          )}
          <button
            type="submit"
            disabled={pendiente}
            className="justify-self-start cursor-pointer rounded-lg bg-secundario-fuerte px-3 py-1.5 text-[12px] font-bold text-white hover:bg-secundario disabled:opacity-50"
          >
            Guardar
          </button>
        </form>
      )}
      {aviso?.error && (
        <p role="alert" className="mt-1 font-semibold text-peligro">
          {aviso.error}
        </p>
      )}
      {aviso?.ok && (
        <p role="status" className="mt-1 font-semibold text-secundario-fuerte">
          {aviso.ok}
        </p>
      )}
    </div>
  );
}
