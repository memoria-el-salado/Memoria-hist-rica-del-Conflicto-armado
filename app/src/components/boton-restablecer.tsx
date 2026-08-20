"use client";

import { useState, useTransition } from "react";

type Resultado = { error?: string; contrasena?: string };

/**
 * Devuelve una cuenta a su estado inicial: nueva contraseña provisional y la
 * obligación de cambiarla al entrar. Es la salida cuando alguien pierde la que
 * le entregaron, porque nadie más puede leer la que estaba guardada.
 */
export function BotonRestablecer({
  id,
  nombre,
  accion,
}: {
  id: string;
  nombre: string;
  accion: (id: string) => Promise<Resultado>;
}) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [resultado, setResultado] = useState<Resultado | null>(null);

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          iniciarTransicion(async () => setResultado(await accion(id)))
        }
        className="cursor-pointer rounded-lg border border-borde-campo bg-superficie px-2.5 py-1.5 text-[11px] font-semibold text-apagado hover:border-primario hover:text-primario disabled:opacity-50"
      >
        {pendiente ? "Restableciendo..." : "Restablecer contraseña"}
      </button>

      {resultado?.contrasena && (
        <div
          role="status"
          className="mt-1.5 rounded-lg border border-secundario-borde bg-secundario-tinte px-2.5 py-1.5 text-[11px] leading-[1.5] text-[#3F6E6C]"
        >
          Nueva contraseña de {nombre.split(" ")[0]}:{" "}
          <strong className="font-mono">{resultado.contrasena}</strong>
        </div>
      )}
      {resultado?.error && (
        <div role="alert" className="mt-1.5 text-[11px] font-semibold text-peligro">
          {resultado.error}
        </div>
      )}
    </div>
  );
}
