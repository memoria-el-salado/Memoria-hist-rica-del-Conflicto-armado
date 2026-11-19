"use client";

import { useSyncExternalStore } from "react";
import { CLAVE_TEMA, otroTema, type Tema } from "@/lib/tema";

const CAMBIO_TEMA = "memoria:tema";

function temaActual(): Tema {
  return document.documentElement.dataset.tema === "oscuro" ? "oscuro" : "claro";
}

function suscribir(avisar: () => void) {
  window.addEventListener(CAMBIO_TEMA, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(CAMBIO_TEMA, avisar);
    window.removeEventListener("storage", avisar);
  };
}

/** Luna para pasar a oscuro, sol para volver a claro. */
const ICONO: Record<Tema, string> = {
  claro: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  oscuro: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
};

/** Cambia entre el tema claro y el oscuro, y recuerda la elección. */
export function BotonTema({ className = "" }: { className?: string }) {
  const tema = useSyncExternalStore(suscribir, temaActual, () => "claro" as Tema);
  const siguiente = otroTema(tema);

  function cambiar() {
    document.documentElement.dataset.tema = siguiente;
    try {
      localStorage.setItem(CLAVE_TEMA, siguiente);
    } catch {}
    window.dispatchEvent(new Event(CAMBIO_TEMA));
  }

  return (
    <button
      type="button"
      onClick={cambiar}
      aria-label={siguiente === "oscuro" ? "Activar el tema oscuro" : "Activar el tema claro"}
      title={siguiente === "oscuro" ? "Tema oscuro" : "Tema claro"}
      className={`flex cursor-pointer items-center justify-center rounded-lg border border-borde-campo bg-superficie px-[9px] py-[7px] text-apagado hover:border-primario hover:text-primario-texto ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={ICONO[tema]} />
      </svg>
    </button>
  );
}
