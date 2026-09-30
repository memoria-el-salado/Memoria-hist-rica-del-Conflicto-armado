"use client";

import { useState } from "react";
import { componerLectura, subseccionesSinTexto } from "@/lib/lectura-sesion";
import type { HiloAnotacion } from "@/lib/anotaciones-datos";
import { Conversacion } from "@/components/anotaciones/conversacion";
import { CabeceraSesion, type DatosSesion } from "./cabecera-sesion";

/**
 * Lectura del documento con anotaciones (CU06).
 *
 * El texto que se lee es el de la sesión importada, y los fragmentos citables
 * son sus propios párrafos: al hacer clic sobre uno queda adjunto a la
 * anotación. Las anotaciones se conversan en hilo: se responden, se marcan
 * con «me sirve» y el docente destaca las que ayudan a todo el curso.
 */

export function LecturaAnotada({ sesion, hilos }: { sesion: DatosSesion; hilos: HiloAnotacion[] }) {
  const [cita, setCita] = useState("");

  // El texto de la sesión se compone del suyo propio y del de sus subsecciones,
  // porque el documento reparte el contenido entre ambos niveles.
  const bloques = componerLectura(sesion.contenido, sesion.subsecciones);
  const sinTexto = subseccionesSinTexto(sesion.subsecciones);

  return (
    <div className="animar-aparecer">
      <CabeceraSesion sesion={sesion} />

      <div className="rejilla-panel-ancha">
        <article className="rounded-xl border border-borde bg-superficie px-6 py-6 sm:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#F1EBE5] pb-3">
            <span className="text-[10.5px] font-bold tracking-[.1em] text-suave">
              TEXTO DE LA SESIÓN
            </span>
            {sesion.documento && (
              <a
                href={`/api/documentos/${sesion.documento.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11.5px] font-semibold text-secundario-fuerte"
              >
                Abrir el PDF original
              </a>
            )}
          </div>

          {bloques.length > 0 ? (
            <>
              {bloques.map((bloque) =>
                bloque.tipo === "subtitulo" ? (
                  <h3
                    key={bloque.id}
                    className="mb-1.5 mt-4 flex gap-2 text-[13.5px] font-extrabold text-tinta first:mt-0"
                  >
                    <span className="text-primario">{bloque.codigo}</span>
                    <span>{bloque.texto}</span>
                  </h3>
                ) : (
                  <button
                    key={bloque.id}
                    onClick={() => setCita(cita === bloque.texto ? "" : bloque.texto)}
                    aria-pressed={cita === bloque.texto}
                    className="mb-2 block w-full cursor-pointer rounded-r-lg border-l-[3px] px-[15px] py-2.5 text-justify text-[13.5px] leading-[1.85] transition-colors"
                    style={{
                      borderLeftColor: cita === bloque.texto ? "#EBB035" : "transparent",
                      background: cita === bloque.texto ? "#FBEFD8" : "transparent",
                      color: "#5B524B",
                    }}
                  >
                    {bloque.texto}
                  </button>
                )
              )}
              <p className="mt-3 text-[11.5px] text-tenue">
                Haz clic en un párrafo para citarlo en tu anotación.
              </p>
            </>
          ) : (
            <p className="text-[13px] leading-[1.7] text-tenue">
              El documento importado no traía texto para esta sesión. Puedes anotar igualmente a
              partir del trabajo en clase o del PDF original.
            </p>
          )}

          {sinTexto.length > 0 && (
            <div className="mt-5 border-t border-[#F1EBE5] pt-4">
              <div className="text-[10.5px] font-bold tracking-[.12em] text-tenue">
                TAMBIÉN EN ESTA SESIÓN
              </div>
              <ol className="mt-2.5 grid gap-1.5">
                {sinTexto.map((sub) => (
                  <li key={sub.id} className="flex gap-2 text-[12.5px] text-tinta-media">
                    <span className="font-bold text-primario">{sub.codigo}</span>
                    <span>{sub.titulo}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </article>

        <Conversacion sesionId={sesion.id} hilos={hilos} puedeDestacar={false} cita={cita} onQuitarCita={() => setCita("")} />
      </div>
    </div>
  );
}
