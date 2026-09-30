"use client";

import { useState } from "react";
import type { RecursoVista } from "@/lib/material";

/**
 * Muestra un recurso según su tipo: audio y video se reproducen aquí mismo,
 * la imagen se ve, y el documento o el simulador se abren aparte.
 *
 * Con alerta de cuidado, antes se avisa y el contenido no se carga hasta que la
 * persona decide verlo: la guía pide preparar al grupo antes de los testimonios
 * más duros.
 */
export function ReproductorRecurso({ recurso, conAviso = true }: { recurso: RecursoVista; conAviso?: boolean }) {
  const [aceptado, setAceptado] = useState(!conAviso || !recurso.alerta);
  const src = `/api/recursos/${recurso.id}`;

  if (!aceptado) {
    return (
      <div role="note" className="rounded-lg border border-primario-borde bg-primario-tinte p-3.5">
        <div className="text-[10.5px] font-extrabold tracking-[.1em] text-primario-fuerte">ALERTA DE CUIDADO</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-tinta-media">
          Este recurso trae contenido que puede ser difícil de ver o escuchar. Tómate tu tiempo: puedes
          detenerlo cuando quieras y hablarlo con tu docente.
        </p>
        <button
          onClick={() => setAceptado(true)}
          className="mt-2.5 cursor-pointer rounded-md bg-primario-fuerte px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-primario-hover"
        >
          Ver el recurso
        </button>
      </div>
    );
  }

  const enlaceExterno = (texto: string, href: string) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-block rounded-md border border-borde-campo bg-superficie px-3 py-1.5 text-[12px] font-bold text-primario-fuerte hover:border-primario"
    >
      {texto}
    </a>
  );

  if (recurso.incrustado) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={recurso.incrustado.url}
          title={recurso.titulo}
          allow="fullscreen; picture-in-picture; encrypted-media"
          loading="lazy"
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  if (!recurso.tieneArchivo) {
    return recurso.enlace ? enlaceExterno("Abrir en una pestaña nueva", recurso.enlace) : null;
  }

  switch (recurso.tipo) {
    case "AUDIO":
      return <audio controls preload="none" src={src} className="w-full" aria-label={recurso.titulo} />;
    case "VIDEO":
      return (
        <video controls preload="metadata" src={src} className="w-full rounded-lg bg-black" aria-label={recurso.titulo} />
      );
    case "IMAGEN":
      return (
        // El origen es el propio servidor, que redirige a una dirección firmada que caduca:
        // no hay nada que optimizar con next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={recurso.contexto} loading="lazy" className="max-h-[480px] w-auto rounded-lg border border-borde" />
      );
    case "DOCUMENTO":
      return enlaceExterno("Abrir el documento (PDF)", src);
    default:
      return enlaceExterno("Abrir", src);
  }
}
