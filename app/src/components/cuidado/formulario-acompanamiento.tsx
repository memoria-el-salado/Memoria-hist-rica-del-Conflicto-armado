"use client";

import { useState, useTransition } from "react";
import { LIMITES_CUIDADO } from "@/lib/cuidado";
import { pedirAcompanamiento, type ResultadoSolicitud } from "./acciones";

/**
 * Pedir hablar con el docente. El mensaje es opcional: basta con pulsar el
 * botón para que el aviso llegue.
 */
export function FormularioAcompanamiento({ sesionId }: { sesionId: string | null }) {
  const [mensaje, setMensaje] = useState("");
  const [resultado, setResultado] = useState<ResultadoSolicitud | null>(null);
  const [enviando, iniciar] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await pedirAcompanamiento({ sesionId, mensaje });
      setResultado(r);
      if (r.ok) setMensaje("");
    });
  }

  if (resultado?.ok) {
    return (
      <div role="status" className="rounded-lg border border-secundario-borde bg-secundario-tinte px-3.5 py-3 text-[0.78125rem] leading-relaxed text-secundario-texto">
        {resultado.ok}
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-2">
      <label htmlFor={`mensaje-acompanamiento-${sesionId ?? "general"}`} className="text-[0.71875rem] font-semibold text-apagado">
        Si quieres, cuéntale algo a tu docente <span className="font-normal text-suave">(opcional)</span>
      </label>
      <textarea
        id={`mensaje-acompanamiento-${sesionId ?? "general"}`}
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        maxLength={LIMITES_CUIDADO.mensajeMaximo}
        rows={3}
        className="w-full rounded-lg border border-borde-campo bg-superficie px-3 py-2 text-[0.8125rem] leading-relaxed"
      />
      <button
        type="submit"
        disabled={enviando}
        className="cursor-pointer justify-self-start rounded-lg bg-secundario-fuerte px-4 py-2.5 text-[0.78125rem] font-bold text-white hover:bg-secundario disabled:opacity-60"
      >
        {enviando ? "Enviando..." : "Enviar a mi docente"}
      </button>
      {resultado?.error && (
        <div role="alert" className="text-[0.75rem] font-semibold text-peligro">
          {resultado.error}
        </div>
      )}
    </form>
  );
}
