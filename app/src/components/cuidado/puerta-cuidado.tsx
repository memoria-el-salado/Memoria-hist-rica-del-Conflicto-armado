"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { FormularioAcompanamiento } from "./formulario-acompanamiento";

/**
 * Antes de una sesión con alerta de cuidado, el estudiante lee qué trae y
 * decide: continuar, dejarla para después o hablar con su docente. La guía
 * para maestros insiste en que nadie está obligado a continuar.
 *
 * Quien ya decidió continuar no vuelve a ver el aviso en ese navegador. Si el
 * navegador no deja guardarlo (una ventana privada, por ejemplo), el aviso
 * reaparece la próxima vez, que es lo prudente.
 */

const EVENTO = "memoria:cuidado-aceptado";

function suscribir(aviso: () => void) {
  window.addEventListener("storage", aviso);
  window.addEventListener(EVENTO, aviso);
  return () => {
    window.removeEventListener("storage", aviso);
    window.removeEventListener(EVENTO, aviso);
  };
}

function leer(clave: string) {
  try {
    return localStorage.getItem(clave) === "1";
  } catch {
    return false;
  }
}

type Props = {
  sesionId: string;
  codigo: string;
  titulo: string;
  texto: string;
  children: React.ReactNode;
};

export function PuertaCuidado({ sesionId, codigo, titulo, texto, children }: Props) {
  const clave = `cuidado-aceptado:${sesionId}`;
  const recordado = useSyncExternalStore(suscribir, () => leer(clave), () => false);
  const [aceptado, setAceptado] = useState(false);
  const [hablar, setHablar] = useState(false);

  function continuar() {
    try {
      localStorage.setItem(clave, "1");
      window.dispatchEvent(new Event(EVENTO));
    } catch {
      // Sin almacenamiento, se continúa igual; solo que no se recordará.
    }
    setAceptado(true);
  }

  if (recordado || aceptado) {
    return (
      <>
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-primario-borde bg-primario-tinte px-4 py-2.5">
          <span className="text-[12px] text-tinta-media">
            <strong className="text-primario-fuerte">Sesión con alerta de cuidado.</strong> Puedes pausar cuando
            quieras.
          </span>
          <button
            onClick={() => setHablar((v) => !v)}
            aria-expanded={hablar}
            className="cursor-pointer text-[12px] font-bold text-secundario-fuerte underline-offset-2 hover:underline"
          >
            Hablar con mi docente
          </button>
          {hablar && (
            <div className="basis-full pt-1">
              <FormularioAcompanamiento sesionId={sesionId} />
            </div>
          )}
        </div>
        {children}
      </>
    );
  }

  return (
    <section
      aria-labelledby="titulo-puerta-cuidado"
      className="animar-aparecer mx-auto max-w-[620px] rounded-[14px] border border-primario-borde bg-superficie px-6 py-7 sm:px-8"
    >
      <div className="flex items-center gap-[9px] text-[11px] font-bold tracking-[.12em] text-primario-fuerte">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
        </svg>
        <span>ALERTA DE CUIDADO</span>
      </div>
      <h1 id="titulo-puerta-cuidado" className="mb-3 mt-3 text-[21px] font-extrabold leading-[1.25] tracking-[-.02em]">
        Antes de empezar <span className="text-primario">{codigo}</span> {titulo}
      </h1>
      <p className="whitespace-pre-line text-[14px] leading-[1.75] text-tinta-media">{texto}</p>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <button
          onClick={continuar}
          className="cursor-pointer rounded-lg bg-primario-fuerte px-[17px] py-[11px] text-[13px] font-bold text-white hover:bg-primario-hover"
        >
          Entiendo, continuar
        </button>
        <Link
          href="/estudiante/mapa"
          className="rounded-lg border border-borde-campo bg-superficie px-[17px] py-[11px] text-[13px] font-semibold text-apagado no-underline hover:border-primario hover:text-primario"
        >
          Dejarlo para después
        </Link>
        <button
          onClick={() => setHablar(true)}
          aria-expanded={hablar}
          className="cursor-pointer rounded-lg border border-secundario-borde bg-secundario-tinte px-[17px] py-[11px] text-[13px] font-semibold text-secundario-fuerte hover:border-secundario"
        >
          Hablar con mi docente
        </button>
      </div>

      {hablar && (
        <div className="mt-5 border-t border-[#F1EBE5] pt-4">
          <FormularioAcompanamiento sesionId={sesionId} />
        </div>
      )}
    </section>
  );
}
