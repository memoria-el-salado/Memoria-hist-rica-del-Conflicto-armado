"use client";

import { useActionState, useState, useTransition } from "react";
import { LIMITES_CUIDADO, TEXTO_ALERTA_PREDETERMINADO } from "@/lib/cuidado";
import { activarAlerta, quitarAlerta } from "./actions";

export type SesionAlerta = {
  id: string;
  codigo: string;
  titulo: string;
  alertaCuidado: boolean;
  textoAlerta: string | null;
};

/** Títulos que suelen anunciar testimonios duros; se proponen primero. */
const SENSIBLE = /masacre|dolor|éxodo|desplaza|testimonio|víctima|violencia/i;

/**
 * El docente elige la sesión, ajusta lo que leerá el estudiante antes de
 * entrar y activa la alerta. Las activas se listan para editarlas o quitarlas.
 */
export function AlertasCuidado({ sesiones }: { sesiones: SesionAlerta[] }) {
  const [estado, accion, pendiente] = useActionState(activarAlerta, null as { ok?: string; error?: string } | null);
  const [sesionId, setSesionId] = useState("");
  const [texto, setTexto] = useState(TEXTO_ALERTA_PREDETERMINADO);
  const [, iniciar] = useTransition();

  const activas = sesiones.filter((s) => s.alertaCuidado);
  const sugeridas = sesiones.filter((s) => SENSIBLE.test(s.titulo));
  const otras = sesiones.filter((s) => !SENSIBLE.test(s.titulo));
  const elegida = sesiones.find((s) => s.id === sesionId);

  function elegir(id: string) {
    setSesionId(id);
    setTexto(sesiones.find((s) => s.id === id)?.textoAlerta ?? TEXTO_ALERTA_PREDETERMINADO);
  }

  const opcion = (s: SesionAlerta) => (
    <option key={s.id} value={s.id}>
      {s.codigo} {s.titulo}
      {s.alertaCuidado ? " · activa" : ""}
    </option>
  );

  return (
    <div className="rounded-xl border border-primario-borde bg-primario-tinte p-5">
      <div className="flex items-center gap-2 text-[11px] font-bold tracking-[.1em] text-primario-fuerte">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
        <span>ALERTAS DE CUIDADO</span>
      </div>
      <p className="mb-3.5 mt-2.5 text-[12px] leading-[1.65] text-[#7C736C]">
        Antes de una sesión con alerta, el estudiante lee este aviso y decide si continúa, lo deja para después
        o te pide acompañamiento.
      </p>

      <form action={accion} className="grid gap-2.5">
        <div>
          <label htmlFor="sesionId" className="text-[10px] font-bold tracking-[.1em] text-tenue">
            APLICAR ALERTA A
          </label>
          <select
            id="sesionId"
            name="sesionId"
            value={sesionId}
            onChange={(e) => elegir(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[#E9D3C9] bg-superficie px-3 py-2.5 text-[13px]"
          >
            <option value="">Seleccionar sesión...</option>
            {sugeridas.length > 0 && <optgroup label="Por su título, posibles contenidos sensibles">{sugeridas.map(opcion)}</optgroup>}
            <optgroup label="Todas las demás sesiones">{otras.map(opcion)}</optgroup>
          </select>
        </div>
        <div>
          <label htmlFor="textoAlerta" className="text-[10px] font-bold tracking-[.1em] text-tenue">
            LO QUE LEERÁ EL ESTUDIANTE
          </label>
          <textarea
            id="textoAlerta"
            name="texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={LIMITES_CUIDADO.textoMaximo}
            rows={5}
            className="mt-1.5 w-full rounded-lg border border-[#E9D3C9] bg-superficie px-3 py-2.5 text-[12.5px] leading-relaxed"
          />
        </div>
        <button
          type="submit"
          disabled={pendiente}
          className="w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-2.5 text-[11.5px] font-bold tracking-[.06em] text-white hover:bg-primario-hover disabled:opacity-60"
        >
          {pendiente ? "GUARDANDO..." : elegida?.alertaCuidado ? "GUARDAR EL TEXTO DE LA ALERTA" : "ACTIVAR ALERTA DE CUIDADO"}
        </button>
        {estado?.ok && (
          <div role="status" className="text-[11.5px] font-semibold text-secundario-fuerte">
            {estado.ok}
          </div>
        )}
        {estado?.error && (
          <div role="alert" className="text-[11.5px] font-semibold text-peligro">
            {estado.error}
          </div>
        )}
      </form>

      <div className="mt-4 border-t border-[#EFD9CF] pt-3">
        <div className="text-[10px] font-bold tracking-[.1em] text-tenue">
          ACTIVAS ({activas.length})
        </div>
        {activas.length === 0 ? (
          <p className="mt-1.5 text-[12px] text-tenue">Ninguna sesión tiene alerta todavía.</p>
        ) : (
          <ul className="mt-1.5 grid grid-cols-1 gap-1.5">
            {activas.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-[12px]">
                <span className="min-w-0 flex-1 truncate">
                  <strong className="text-primario-fuerte">{s.codigo}</strong> {s.titulo}
                </span>
                <button
                  onClick={() => elegir(s.id)}
                  className="cursor-pointer text-[11px] font-bold text-secundario-fuerte hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => iniciar(async () => { await quitarAlerta(s.id); })}
                  aria-label={`Quitar la alerta de la sesión ${s.codigo}`}
                  className="cursor-pointer text-[11px] font-bold text-peligro hover:underline"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
