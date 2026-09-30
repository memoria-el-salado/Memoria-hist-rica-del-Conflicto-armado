"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AvisoVista } from "@/lib/avisos-datos";
import { marcarAvisosVistos } from "./acciones";

const ICONO: Record<AvisoVista["tipo"], string> = {
  COMENTARIO: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  SESION: "M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3v15",
  ACOMPANAMIENTO: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z",
  ENTREGA: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4",
};

/**
 * La campana de la cabecera. Al abrirla, lo publicado hasta ahora deja de ser
 * nuevo; los comentarios del docente siguen marcados hasta que el estudiante
 * los lee donde está su trabajo.
 */
export function Campana({ avisos, nuevos }: { avisos: AvisoVista[]; nuevos: number }) {
  const [abierta, setAbierta] = useState(false);
  // Lo que se ve al abrir se conserva aunque el servidor ya lo haya marcado como visto.
  const [vista, setVista] = useState<AvisoVista[]>(avisos);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: MouseEvent) => !caja.current?.contains(e.target as Node) && setAbierta(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setAbierta(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierta]);

  function alternar() {
    if (!abierta) {
      setVista(avisos);
      if (nuevos > 0) void marcarAvisosVistos();
    }
    setAbierta((a) => !a);
  }

  return (
    <div ref={caja} className="relative">
      <button
        onClick={alternar}
        aria-expanded={abierta}
        aria-haspopup="true"
        aria-label={nuevos ? `Avisos: ${nuevos} ${nuevos === 1 ? "nuevo" : "nuevos"}` : "Avisos"}
        className="relative flex cursor-pointer items-center rounded-lg border border-borde-campo bg-superficie px-2.5 py-[7px] text-apagado hover:border-primario hover:text-primario"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {nuevos > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-primario-fuerte px-1 text-center text-[10px] font-extrabold leading-[18px] text-white">
            {nuevos > 9 ? "9+" : nuevos}
          </span>
        )}
      </button>

      {abierta && (
        <div
          role="region"
          aria-label="Avisos"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-xl border border-borde bg-superficie shadow-[0_16px_40px_rgba(0,0,0,.14)]"
        >
          <div className="border-b border-[#F1EBE5] px-4 py-3 text-[11px] font-bold tracking-[.12em] text-tenue">AVISOS</div>
          {vista.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-tenue">No hay nada nuevo por ahora.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {vista.map((a) => (
                <li key={a.id} className="border-b border-[#F7F2ED] last:border-b-0">
                  <Link
                    href={a.enlace}
                    onClick={() => setAbierta(false)}
                    className={`flex gap-3 px-4 py-3 text-tinta no-underline hover:bg-superficie-suave ${a.nuevo ? "bg-primario-tinte/60" : ""}`}
                  >
                    <svg className="mt-0.5 flex-none text-primario" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={ICONO[a.tipo]} />
                    </svg>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[12.5px] leading-snug ${a.nuevo ? "font-bold" : ""}`}>{a.texto}</span>
                      <span className="mt-0.5 block text-[10.5px] text-suave">
                        {a.cuando}
                        {a.nuevo && " · nuevo"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
