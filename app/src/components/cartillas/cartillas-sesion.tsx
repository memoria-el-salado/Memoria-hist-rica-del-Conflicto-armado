"use client";

import { useState } from "react";
import type { CartillaDeSesion } from "@/lib/cartillas";

/**
 * Las cartillas del CNMH a la mano en la sesión, abiertas en su apartado.
 *
 * En pantallas anchas la cartilla se puede leer ahí mismo, junto a la
 * actividad; en el móvil, donde los navegadores no muestran un PDF dentro de
 * la página, se abre en otra pestaña.
 */
export function CartillasSesion({
  cartillas,
  codigo,
  className = "mt-4",
}: {
  cartillas: CartillaDeSesion[];
  codigo: string;
  className?: string;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);
  if (!cartillas.length) return null;

  return (
    <section id="cartillas" aria-labelledby="titulo-cartillas" className={`${className} scroll-mt-24`}>
      <h2 id="titulo-cartillas" className="mb-2 text-[0.78125rem] font-extrabold tracking-[.08em] text-tinta-media">
        LAS CARTILLAS DE EL SALADO
      </h2>
      <ul className="grid gap-3">
        {cartillas.map((c) => {
          const visorId = `visor-cartilla-${c.id}`;
          const leyendo = abierta === c.id;
          return (
            <li key={c.id} className="rounded-xl border border-borde bg-superficie p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[0.65625rem] font-bold tracking-[.04em] ${
                    c.soloDocentes ? "bg-aviso-tinte text-aviso-texto" : "bg-secundario-tinte text-secundario-texto"
                  }`}
                >
                  {c.tipo.toUpperCase()}
                </span>
                {c.soloDocentes && <span className="text-[0.6875rem] font-semibold text-apagado">Solo la ve el docente</span>}
              </div>
              <h3 className="mt-1.5 text-[0.84375rem] font-bold leading-snug">{c.titulo}</h3>
              <p className="mt-1 text-[0.78125rem] leading-relaxed text-apagado">
                {c.desarrollada ? (
                  <>
                    El apartado <strong className="text-tinta-media">{codigo}</strong> empieza en la página{" "}
                    <strong className="text-tinta-media">{c.pagina}</strong>.
                  </>
                ) : c.pagina ? (
                  <>
                    Esta cartilla recortada no desarrolla la sesión {codigo}: la nombra en el mapa del viaje, en la página{" "}
                    {c.pagina}. Tu docente trae el resto del material.
                  </>
                ) : (
                  <>Se abre desde la portada.</>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-expanded={leyendo}
                  aria-controls={visorId}
                  onClick={() => setAbierta(leyendo ? null : c.id)}
                  className="hidden min-h-11 items-center rounded-lg bg-primario-fuerte px-3.5 text-[0.78125rem] font-bold text-white hover:bg-primario-hover md:inline-flex"
                >
                  {leyendo ? "Cerrar la lectura" : "Leer aquí"}
                </button>
                <a
                  href={c.enlace}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center rounded-lg border border-borde px-3.5 text-[0.78125rem] font-bold text-secundario-texto no-underline hover:border-secundario hover:no-underline"
                >
                  Abrir en otra pestaña
                  <span className="sr-only"> ({c.tipo}, se abre en una pestaña nueva)</span>
                </a>
              </div>
              {leyendo && (
                <div id={visorId} className="mt-3 hidden md:block">
                  <iframe
                    // La clave obliga a recargar al cambiar de cartilla, para que abra en su página.
                    key={c.enlace}
                    src={c.enlace}
                    title={`${c.tipo}: ${c.titulo}, página ${c.pagina ?? 1}`}
                    className="h-[75vh] w-full rounded-lg border border-borde bg-white"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
