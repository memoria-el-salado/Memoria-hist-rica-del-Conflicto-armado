"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Explorador } from "@/lib/exploradores";
import { RecorridoIlustrado, type EjeDelMapa } from "./recorrido-ilustrado";
import { CENTRO_COLOMBIA } from "@/lib/datos-geograficos";

// Leaflet necesita el DOM, así que el mapa solo se carga en el navegador.
const MapaReal = dynamic(() => import("@/components/mapa-real").then((m) => m.MapaReal), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] w-full items-center justify-center rounded-xl border border-borde bg-hundido text-[0.8125rem] text-tenue">
      Cargando el mapa...
    </div>
  ),
});

type Eje = EjeDelMapa & { peso: number; sesiones: (EjeDelMapa["sesiones"][number] & { pantalla: string; tieneContenido: boolean })[] };

type Props = {
  ejes: Eje[];
  estaciones: { id: string; nombre: string; lat: number; lon: number; activo: boolean }[];
  casosSinUbicar: number;
  indicadores: { nombre: string; valor: number; color: string }[];
  equidad: number | null;
  /** "Curso 10A · 2026 · Grupo Los Robles", o null si aún no tiene curso. */
  pertenencia: string | null;
  /** Las cuatro competencias ciudadanas de la guía y cómo va en cada una. */
  competencias: { id: string; nombre: string; descripcion: string; hechas: number; total: number; porcentaje: number }[];
  /** Por dónde sigue el viaje, o null si ya hizo todo lo publicado. */
  siguiente: { ejeId: string; id: string; codigo: string; titulo: string } | null;
  /** El explorador que eligió el estudiante, que camina con él por el mapa. */
  explorador: Explorador | null;
};

/** Los cuatro momentos de cada sesión, para que el estudiante sepa qué le espera. */
const PASOS = [
  ["Explora", "el texto y el material de la sesión"],
  ["Reflexiona", "con la pregunta orientadora"],
  ["Haz la actividad", "y guarda tu trabajo"],
  ["Lee la retroalimentación", "que te deja tu docente"],
] as const;

/** Mueve la vista hasta un elemento, sin animación si la persona la desactivó. */
function llevarA(el: HTMLElement | null) {
  if (!el) return;
  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "start" });
}

const COLOR_COMPETENCIA: Record<string, string> = {
  EMPATIA: "#D95D39",
  ESCUCHA: "#1B8A8A",
  CRITICO: "#A8791C",
  ASERTIVIDAD: "#177575",
};

export function MapaViaje({ ejes, estaciones, indicadores, equidad, casosSinUbicar, pertenencia, competencias, siguiente, explorador }: Props) {
  // Al llegar, queda elegida la estación por donde sigue el viaje: sus
  // sesiones se ven al lado del mapa sin tener que buscarlas.
  const [seleccionado, setSeleccionado] = useState<string>(siguiente?.ejeId ?? ejes[0]?.id ?? "");
  const ruta = useRef<HTMLDivElement>(null);

  function irASiguiente() {
    if (!siguiente) return;
    setSeleccionado(siguiente.ejeId);
    llevarA(ruta.current);
  }

  return (
    <div className="animar-aparecer">
      <div className="mb-6 grid items-end gap-[18px] lg:grid-cols-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.65625rem] font-bold tracking-[.14em] text-primario-texto">TU VIAJE</span>
            {pertenencia && (
              <span className="rounded-full bg-secundario-tinte px-2.5 py-0.5 text-[0.6875rem] font-bold text-secundario-texto">
                {pertenencia}
              </span>
            )}
          </div>
          <h1 className="mb-1.5 mt-2 text-[1.875rem] font-extrabold tracking-[-.02em]">
            Mapa del Viaje por la Memoria
          </h1>
          <p className="max-w-[560px] text-[0.875rem] leading-[1.65] text-apagado">
            {ejes.length > 0
              ? `Tu ruta pedagógica tiene ${ejes.length} ${ejes.length === 1 ? "eje" : "ejes"}, organizados como estaciones de un viaje cronológico. Toca cada estación para ver sus sesiones.`
              : "Aquí aparecerá tu ruta pedagógica cuando el docente publique las sesiones del módulo."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {indicadores.map((c) => (
            <div key={c.nombre} className="rounded-[10px] border border-borde bg-superficie p-3">
              <div className="text-[0.625rem] font-bold tracking-[.08em] text-suave">{c.nombre}</div>
              <div className="texto-tono text-[1.375rem] font-extrabold tracking-[-.02em]" style={{ "--tono": c.color } as React.CSSProperties}>
                {c.valor}
              </div>
            </div>
          ))}
          {equidad !== null && (
            <div className="col-span-3 rounded-[10px] border border-borde bg-superficie p-3">
              <div className="text-[0.625rem] font-bold tracking-[.08em] text-suave">
                ÍNDICE DE EQUIDAD DEL SIMULADOR
              </div>
              <div className="text-[1.375rem] font-extrabold tracking-[-.02em] text-secundario-texto">
                {equidad}%
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-[9px] bg-hundido">
                <div className="h-full bg-secundario" style={{ width: `${equidad}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {ejes.length > 0 && (
        <div className="mb-[18px] grid gap-[18px] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section aria-labelledby="titulo-como" className="rounded-xl border border-borde bg-superficie p-[18px]">
            <h2 id="titulo-como" className="text-[0.625rem] font-extrabold tracking-[.12em] text-tenue">
              CÓMO FUNCIONA TU VIAJE
            </h2>
            <p className="mt-1.5 text-[0.8125rem] leading-[1.6] text-apagado">
              Cada eje es una estación del camino y se recorre en orden. Toca una estación en el mapa para ver sus
              sesiones, entra a la primera y, en cada una, sigue estos cuatro pasos:
            </p>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {PASOS.map(([titulo, detalle], i) => (
                <li key={titulo} className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primario-tinte text-[0.71875rem] font-extrabold text-primario-texto">
                    {i + 1}
                  </span>
                  <span className="text-[0.78125rem] leading-snug">
                    <strong>{titulo}</strong> <span className="text-apagado">{detalle}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="titulo-sigue" className="flex flex-col justify-between gap-3 rounded-xl border border-primario-borde bg-primario-tinte p-[18px]">
            <div>
              <h2 id="titulo-sigue" className="text-[0.625rem] font-extrabold tracking-[.12em] text-primario-texto">
                {siguiente ? "CONTINÚA TU VIAJE" : "VAS AL DÍA"}
              </h2>
              {siguiente ? (
                <p className="mt-1.5 text-[0.9375rem] font-bold leading-snug">
                  <span className="text-primario-texto">{siguiente.codigo}</span> {siguiente.titulo}
                </p>
              ) : (
                <p className="mt-1.5 text-[0.8125rem] leading-[1.6] text-tinta-media">
                  Ya hiciste todas las sesiones que tu docente ha publicado. Cuando publique otra, aparecerá aquí.
                </p>
              )}
            </div>
            {siguiente && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/estudiante/sesion/${siguiente.id}`}
                  className="rounded-lg bg-primario-fuerte px-4 py-2.5 text-[0.78125rem] font-bold text-white no-underline hover:bg-primario-hover hover:no-underline"
                >
                  Abrir la sesión
                </Link>
                <button
                  type="button"
                  onClick={irASiguiente}
                  className="cursor-pointer rounded-lg border border-primario bg-superficie px-4 py-2.5 text-[0.78125rem] font-bold text-primario-texto hover:bg-primario-tinte"
                >
                  Verla en el mapa
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* El mapa de casos solo aparece cuando hay alguno ubicado: vacío no decía nada. */}
      {estaciones.length > 0 && (
        <div className="mb-[18px]">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[0.625rem] font-extrabold tracking-[.12em] text-tenue">CASOS DE ESTUDIO · COLOMBIA</span>
            {casosSinUbicar > 0 && (
              <span className="text-[0.6875rem] text-suave">
                {casosSinUbicar} {casosSinUbicar === 1 ? "caso sin ubicar" : "casos sin ubicar"} en el mapa
              </span>
            )}
          </div>
          <MapaReal
            centro={CENTRO_COLOMBIA}
            zoom={5}
            alto={280}
            etiquetaAccesible="Mapa de Colombia con los casos de estudio de la plataforma."
            mostrarContornoPais
            puntos={estaciones.map((e) => ({
              id: e.id,
              lat: e.lat,
              lon: e.lon,
              etiqueta: e.nombre,
              destacado: e.activo,
            }))}
          />
        </div>
      )}

      {ejes.length === 0 && (
        <div className="rounded-[13px] border border-dashed border-borde bg-superficie px-6 py-12 text-center">
          <div className="text-[0.9375rem] font-bold">Tu ruta pedagógica todavía no está disponible</div>
          <p className="mx-auto mt-2 max-w-[460px] text-[0.8125rem] leading-[1.65] text-apagado">
            El administrador debe crear el módulo a partir de una guía del CNMH y el docente publicar
            sus sesiones. En cuanto lo haga, verás aquí los ejes del viaje por la memoria.
          </p>
        </div>
      )}

      {ejes.length > 0 && (
        <section aria-labelledby="titulo-competencias" className="mb-[18px] rounded-xl border border-borde bg-superficie p-[18px]">
          <h2 id="titulo-competencias" className="text-[0.625rem] font-extrabold tracking-[.12em] text-tenue">
            TUS COMPETENCIAS CIUDADANAS
          </h2>
          <ul className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {competencias.map((c) => (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-2 text-[0.78125rem]">
                  <span className="font-bold text-tinta-media" title={c.descripcion}>
                    {c.nombre}
                  </span>
                  <span className="text-[0.6875rem] font-bold text-tenue">
                    {c.total ? `${c.hechas} de ${c.total} ${c.total === 1 ? "actividad" : "actividades"} · ${c.porcentaje}%` : "Sin actividades publicadas"}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-[7px] overflow-hidden rounded-[9px] bg-hundido"
                  role="progressbar"
                  aria-label={c.nombre}
                  aria-valuenow={c.porcentaje}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full" style={{ width: `${c.porcentaje}%`, background: COLOR_COMPETENCIA[c.id] }} />
                </div>
                <p className="mt-1 text-[0.6875rem] leading-snug text-suave">{c.descripcion}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ejes.length > 0 && (
        <div ref={ruta}>
          <RecorridoIlustrado
            ejes={ejes}
            explorador={explorador}
            siguiente={siguiente}
            seleccionado={seleccionado}
            onSeleccionar={setSeleccionado}
          />
        </div>
      )}
    </div>
  );
}
