"use client";

import { useRef, useState } from "react";
import type { RecursoVista } from "@/lib/material";
import type { Transcripcion } from "@/lib/transcripcion";

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
  const [tiempo, setTiempo] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  const src = `/api/recursos/${recurso.id}`;
  const transcripcion = recurso.transcripcion;

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
      <div className="grid gap-2.5">
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={recurso.incrustado.url}
            title={recurso.titulo}
            allow="fullscreen; picture-in-picture; encrypted-media"
            loading="lazy"
            className="h-full w-full border-0"
          />
        </div>
        {transcripcion && <TextoTranscripcion transcripcion={transcripcion} desplegable />}
      </div>
    );
  }

  if (!recurso.tieneArchivo) {
    return recurso.enlace ? enlaceExterno("Abrir en una pestaña nueva", recurso.enlace) : null;
  }

  switch (recurso.tipo) {
    case "AUDIO":
      return (
        <div className="grid gap-2.5">
          <audio
            ref={audio}
            controls
            preload="none"
            src={src}
            className="w-full"
            aria-label={recurso.titulo}
            onTimeUpdate={(e) => setTiempo(e.currentTarget.currentTime)}
          />
          {transcripcion && (
            <TextoTranscripcion
              transcripcion={transcripcion}
              tiempo={tiempo}
              alElegir={(s) => {
                if (!audio.current) return;
                audio.current.currentTime = s;
                void audio.current.play();
              }}
            />
          )}
        </div>
      );
    case "VIDEO":
      return (
        <div className="grid gap-2.5">
          <video controls preload="metadata" src={src} className="w-full rounded-lg bg-black" aria-label={recurso.titulo}>
            {transcripcion?.sincronizada && (
              <track kind="captions" src={`${src}/subtitulos`} srcLang="es" label="Español" default />
            )}
          </video>
          {transcripcion && <TextoTranscripcion transcripcion={transcripcion} desplegable />}
        </div>
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

/**
 * La transcripción para leer. Si trae tiempos, resalta la línea que suena y
 * cada línea lleva al momento en que se dice.
 */
function TextoTranscripcion({
  transcripcion,
  tiempo,
  alElegir,
  desplegable = false,
}: {
  transcripcion: Transcripcion;
  tiempo?: number;
  alElegir?: (segundos: number) => void;
  desplegable?: boolean;
}) {
  const contenido =
    transcripcion.sincronizada && alElegir ? (
      <ol className="grid gap-0.5" aria-label="Transcripción sincronizada">
        {transcripcion.cues.map((c, i) => {
          const actual = tiempo !== undefined && tiempo >= c.inicio && tiempo < c.fin;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => alElegir(c.inicio)}
                aria-current={actual || undefined}
                className={`w-full cursor-pointer rounded-md px-2 py-1 text-left text-[12.5px] leading-relaxed ${
                  actual ? "bg-terciario-tinte font-semibold text-tinta" : "text-apagado hover:bg-superficie-suave"
                }`}
              >
                <span className="mr-2 font-mono text-[10.5px] text-suave">
                  {Math.floor(c.inicio / 60)}:{String(Math.floor(c.inicio % 60)).padStart(2, "0")}
                </span>
                {c.texto}
              </button>
            </li>
          );
        })}
      </ol>
    ) : (
      <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-apagado">{transcripcion.texto}</p>
    );

  if (desplegable) {
    return (
      <details className="rounded-lg border border-borde bg-superficie-suave px-3 py-2">
        <summary className="cursor-pointer text-[11.5px] font-bold text-tinta-media">Leer la transcripción</summary>
        <div className="mt-2">{contenido}</div>
      </details>
    );
  }

  return (
    <div className="max-h-[220px] overflow-y-auto rounded-lg border border-borde bg-superficie-suave p-2">
      <div className="mb-1 px-2 text-[10px] font-bold tracking-[.1em] text-tenue">TRANSCRIPCIÓN</div>
      {contenido}
    </div>
  );
}
