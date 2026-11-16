"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { fondoParaTextoBlanco } from "@/lib/contraste";
import { CENTRO_COLOMBIA } from "@/lib/datos-geograficos";

// Leaflet necesita el DOM, así que el mapa solo se carga en el navegador.
const MapaReal = dynamic(() => import("@/components/mapa-real").then((m) => m.MapaReal), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] w-full items-center justify-center rounded-xl border border-borde bg-[#F4EFE8] text-[13px] text-tenue">
      Cargando el mapa...
    </div>
  ),
});

type Sesion = {
  id: string;
  codigo: string;
  titulo: string;
  objetivo: string | null;
  tipo: string;
  pantalla: string;
  publicada: boolean;
  tieneContenido: boolean;
  /** El estudiante ya dejó en ella el trabajo que su actividad pedía. */
  completada: boolean;
  /** Recursos que el docente cargó para la sesión y el estudiante puede ver. */
  material: number;
  subsecciones: { codigo: string; titulo: string }[];
};

type Eje = {
  id: string;
  numero: number;
  nombre: string;
  descripcion: string;
  objetivoGeneral: string | null;
  esPreambulo: boolean;
  tono: string;
  progreso: number;
  /** Cuánto vale este eje en el avance del curso, según lo repartió el docente. */
  peso: number;
  completadas: number;
  /** Si el eje está cerrado para el curso del estudiante, qué falta para abrirlo. */
  bloqueo: string | null;
  /** Recursos cargados para todo el eje. */
  material: number;
  sesiones: Sesion[];
};

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
};

/** Los cuatro momentos de cada sesión, para que el estudiante sepa qué le espera. */
const PASOS = [
  ["Explora", "el texto y el material de la sesión"],
  ["Reflexiona", "con la pregunta orientadora"],
  ["Haz la actividad", "y guarda tu trabajo"],
  ["Lee la retroalimentación", "que te deja tu docente"],
] as const;

const recursos = (n: number) => `${n} ${n === 1 ? "recurso" : "recursos"}`;

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

export function MapaViaje({ ejes, estaciones, indicadores, equidad, casosSinUbicar, pertenencia, competencias, siguiente }: Props) {
  // Al llegar, queda abierto el eje por donde sigue el viaje: las sesiones se
  // ven sin tener que buscarlas.
  const [abierto, setAbierto] = useState<string | null>(siguiente?.ejeId ?? null);
  const [llevar, setLlevar] = useState<string | null>(null);
  const filas = useRef(new Map<string, HTMLLIElement>());

  // Al abrir un eje, la vista baja hasta él: antes las sesiones aparecían
  // debajo de todas las tarjetas y no se veía que algo hubiera pasado.
  useEffect(() => {
    if (llevar) llevarA(filas.current.get(llevar) ?? null);
  }, [llevar]);

  function alternar(id: string) {
    const abrir = abierto !== id;
    setAbierto(abrir ? id : null);
    setLlevar(abrir ? id : null);
  }

  function irASiguiente() {
    if (!siguiente) return;
    setAbierto(siguiente.ejeId);
    setLlevar(siguiente.ejeId);
  }

  return (
    <div className="animar-aparecer">
      <div className="mb-6 grid items-end gap-[18px] lg:grid-cols-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10.5px] font-bold tracking-[.14em] text-primario-texto">TU VIAJE</span>
            {pertenencia && (
              <span className="rounded-full bg-secundario-tinte px-2.5 py-0.5 text-[11px] font-bold text-secundario-fuerte">
                {pertenencia}
              </span>
            )}
          </div>
          <h1 className="mb-1.5 mt-2 text-[30px] font-extrabold tracking-[-.02em]">
            Mapa del Viaje por la Memoria
          </h1>
          <p className="max-w-[560px] text-[14px] leading-[1.65] text-apagado">
            {ejes.length > 0
              ? `Tu ruta pedagógica tiene ${ejes.length} ${ejes.length === 1 ? "eje" : "ejes"}, organizados como estaciones de un viaje cronológico. Abre cada estación para ver sus sesiones.`
              : "Aquí aparecerá tu ruta pedagógica cuando el docente publique las sesiones del módulo."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {indicadores.map((c) => (
            <div key={c.nombre} className="rounded-[10px] border border-borde bg-superficie p-3">
              <div className="text-[10px] font-bold tracking-[.08em] text-suave">{c.nombre}</div>
              <div className="text-[22px] font-extrabold tracking-[-.02em]" style={{ color: c.color }}>
                {c.valor}
              </div>
            </div>
          ))}
          {equidad !== null && (
            <div className="col-span-3 rounded-[10px] border border-borde bg-superficie p-3">
              <div className="text-[10px] font-bold tracking-[.08em] text-suave">
                ÍNDICE DE EQUIDAD DEL SIMULADOR
              </div>
              <div className="text-[22px] font-extrabold tracking-[-.02em] text-secundario-fuerte">
                {equidad}%
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-[9px] bg-[#F0EAE4]">
                <div className="h-full bg-secundario" style={{ width: `${equidad}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {ejes.length > 0 && (
        <div className="mb-[18px] grid gap-[18px] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section aria-labelledby="titulo-como" className="rounded-xl border border-borde bg-superficie p-[18px]">
            <h2 id="titulo-como" className="text-[10px] font-extrabold tracking-[.12em] text-tenue">
              CÓMO FUNCIONA TU VIAJE
            </h2>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-apagado">
              Cada eje es una estación y se recorre en orden. Abre un eje, entra a su primera sesión y, en cada una,
              sigue estos cuatro pasos:
            </p>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {PASOS.map(([titulo, detalle], i) => (
                <li key={titulo} className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primario-tinte text-[11.5px] font-extrabold text-primario-fuerte">
                    {i + 1}
                  </span>
                  <span className="text-[12.5px] leading-snug">
                    <strong>{titulo}</strong> <span className="text-apagado">{detalle}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="titulo-sigue" className="flex flex-col justify-between gap-3 rounded-xl border border-primario-borde bg-primario-tinte p-[18px]">
            <div>
              <h2 id="titulo-sigue" className="text-[10px] font-extrabold tracking-[.12em] text-primario-fuerte">
                {siguiente ? "CONTINÚA TU VIAJE" : "VAS AL DÍA"}
              </h2>
              {siguiente ? (
                <p className="mt-1.5 text-[15px] font-bold leading-snug">
                  <span className="text-primario-fuerte">{siguiente.codigo}</span> {siguiente.titulo}
                </p>
              ) : (
                <p className="mt-1.5 text-[13px] leading-[1.6] text-tinta-media">
                  Ya hiciste todas las sesiones que tu docente ha publicado. Cuando publique otra, aparecerá aquí.
                </p>
              )}
            </div>
            {siguiente && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/estudiante/sesion/${siguiente.id}`}
                  className="rounded-lg bg-primario-fuerte px-4 py-2.5 text-[12.5px] font-bold text-white no-underline hover:bg-primario-hover hover:no-underline"
                >
                  Abrir la sesión
                </Link>
                <button
                  type="button"
                  onClick={irASiguiente}
                  className="cursor-pointer rounded-lg border border-primario bg-superficie px-4 py-2.5 text-[12.5px] font-bold text-primario-fuerte hover:bg-primario-tinte"
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
            <span className="text-[10px] font-extrabold tracking-[.12em] text-tenue">CASOS DE ESTUDIO · COLOMBIA</span>
            {casosSinUbicar > 0 && (
              <span className="text-[11px] text-suave">
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
          <div className="text-[15px] font-bold">Tu ruta pedagógica todavía no está disponible</div>
          <p className="mx-auto mt-2 max-w-[460px] text-[13px] leading-[1.65] text-apagado">
            El administrador debe crear el módulo a partir de una guía del CNMH y el docente publicar
            sus sesiones. En cuanto lo haga, verás aquí los ejes del viaje por la memoria.
          </p>
        </div>
      )}

      {ejes.length > 0 && (
        <section aria-labelledby="titulo-competencias" className="mb-[18px] rounded-xl border border-borde bg-superficie p-[18px]">
          <h2 id="titulo-competencias" className="text-[10px] font-extrabold tracking-[.12em] text-tenue">
            TUS COMPETENCIAS CIUDADANAS
          </h2>
          <ul className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {competencias.map((c) => (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="font-bold text-tinta-media" title={c.descripcion}>
                    {c.nombre}
                  </span>
                  <span className="text-[11px] font-bold text-tenue">
                    {c.total ? `${c.hechas} de ${c.total} ${c.total === 1 ? "actividad" : "actividades"} · ${c.porcentaje}%` : "Sin actividades publicadas"}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-[7px] overflow-hidden rounded-[9px] bg-[#F0EAE4]"
                  role="progressbar"
                  aria-label={c.nombre}
                  aria-valuenow={c.porcentaje}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full" style={{ width: `${c.porcentaje}%`, background: COLOR_COMPETENCIA[c.id] }} />
                </div>
                <p className="mt-1 text-[11px] leading-snug text-suave">{c.descripcion}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ejes.length > 0 && (
        <section aria-labelledby="titulo-ruta">
          <h2 id="titulo-ruta" className="mb-3 text-[10px] font-extrabold tracking-[.12em] text-tenue">
            TU RUTA, EJE POR EJE
          </h2>
          <ol className="relative grid gap-3">
            {ejes.map((e) => {
              const estado = e.bloqueo ? "CERRADO" : e.progreso === 100 ? "COMPLETO" : e.progreso > 0 ? "EN CURSO" : "SIN INICIAR";
              const activo = abierto === e.id;
              const publicadas = e.sesiones.filter((s) => s.publicada).length;
              const panel = `sesiones-${e.id}`;
              return (
                <li
                  key={e.id}
                  ref={(el) => {
                    if (el) filas.current.set(e.id, el);
                    else filas.current.delete(e.id);
                  }}
                  className={`scroll-mt-24 rounded-[13px] border bg-superficie transition-shadow ${
                    activo ? "border-primario-borde shadow-[0_10px_26px_rgba(120,70,45,.12)]" : "border-borde shadow-[0_1px_2px_rgba(0,0,0,.03)]"
                  }`}
                >
                  <h3 className="m-0">
                    <button
                      type="button"
                      onClick={() => alternar(e.id)}
                      aria-expanded={activo}
                      aria-controls={panel}
                      className="flex w-full cursor-pointer items-start gap-3.5 rounded-[13px] p-[18px] text-left"
                    >
                      <span
                        className="flex h-[34px] min-w-[34px] flex-none items-center justify-center rounded-[9px] px-2 text-[14px] font-extrabold text-white"
                        style={{ background: fondoParaTextoBlanco(e.tono) }}
                      >
                        {e.esPreambulo ? "0" : e.numero}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={`text-[16.5px] font-bold tracking-[-.01em] ${e.bloqueo ? "text-tenue" : ""}`}>{e.nombre}</span>
                          <span
                            className="rounded-full px-[9px] py-1 text-[9.5px] font-extrabold tracking-[.08em]"
                            style={{
                              background: e.bloqueo ? "#FDF8EF" : e.progreso === 100 ? "#E5F1F0" : e.progreso > 0 ? "#FDF4F0" : "#F3F0EC",
                              color: e.bloqueo ? "#886216" : e.progreso === 100 ? "#177575" : e.progreso > 0 ? "#B24528" : "#6D6762",
                            }}
                          >
                            {estado}
                          </span>
                        </span>
                        {e.bloqueo && (
                          <span className="mt-1.5 flex items-start gap-1.5 text-[11.5px] font-semibold text-terciario-fuerte">
                            <svg className="mt-0.5 flex-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
                            </svg>
                            {e.bloqueo}
                          </span>
                        )}
                        <span className="mt-1 block text-[12.5px] leading-[1.6] text-apagado">{e.descripcion}</span>
                        <span className="mt-2.5 flex items-center gap-2.5">
                          <span className="h-1.5 max-w-[260px] flex-1 overflow-hidden rounded-[9px] bg-[#F0EAE4]">
                            <span className="block h-full" style={{ width: `${e.progreso}%`, background: e.tono }} />
                          </span>
                          <span className="text-[11px] font-bold text-tenue">
                            {e.completadas} de {publicadas} hechas · {e.progreso}%
                          </span>
                        </span>
                      </span>
                      <span className="mt-1 flex flex-none items-center gap-1 text-[12px] font-bold text-primario-fuerte">
                        {activo ? "Ocultar" : "Ver sesiones"}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className={`transition-transform ${activo ? "rotate-180" : ""}`}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </button>
                  </h3>

                  {activo && (
                    <div id={panel} className="animar-aparecer border-t border-dashed border-borde px-[18px] pb-[18px] pt-4">
                      {e.objetivoGeneral && (
                        <p className="max-w-[760px] text-[12.5px] leading-[1.65] text-apagado">
                          <span className="font-bold text-tenue">Objetivo general · </span>
                          {e.objetivoGeneral}
                        </p>
                      )}
                      {e.material > 0 && (
                        <p className="mt-2 text-[12px] font-semibold text-secundario-fuerte">
                          Este eje trae {recursos(e.material)} de tu docente: los encuentras dentro de cada sesión.
                        </p>
                      )}
                      <ol className="mt-3.5 grid gap-2.5">
                        {e.sesiones.map((s) => {
                          const esSiguiente = siguiente?.id === s.id;
                          return (
                            <li
                              key={s.codigo}
                              className={`flex items-start gap-3.5 rounded-[10px] border px-[15px] py-[13px] ${
                                esSiguiente ? "border-primario bg-primario-tinte" : "border-borde bg-superficie-suave"
                              }`}
                            >
                              <div className="w-[34px] flex-none pt-0.5 text-[12px] font-extrabold text-primario-fuerte">{s.codigo}</div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[13.5px] font-bold">{s.titulo}</span>
                                  {esSiguiente && (
                                    <span className="rounded-full bg-primario-fuerte px-2 py-0.5 text-[10px] font-bold text-white">Continúa aquí</span>
                                  )}
                                  {s.publicada && s.completada && (
                                    <span className="flex items-center gap-1 rounded-full bg-secundario-tinte px-2 py-0.5 text-[10px] font-bold text-secundario-fuerte">
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M20 6 9 17l-5-5" />
                                      </svg>
                                      Hecha
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] tracking-[.04em] text-suave">
                                  <span>Actividad: {s.tipo}</span>
                                  {s.material > 0 && <span className="font-semibold text-secundario-fuerte">Material: {recursos(s.material)}</span>}
                                </div>
                                {s.objetivo && <p className="mt-1.5 text-[11.5px] leading-[1.6] text-apagado">{s.objetivo}</p>}
                                {s.subsecciones.length > 0 && (
                                  <ul className="mt-2 grid gap-1 border-l-2 border-borde pl-3">
                                    {s.subsecciones.map((sub) => (
                                      <li key={sub.codigo} className="text-[11.5px] leading-[1.5] text-apagado">
                                        <span className="font-bold text-suave">{sub.codigo}</span> {sub.titulo}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              {s.publicada && e.bloqueo ? (
                                <span
                                  title={e.bloqueo}
                                  className="mt-0.5 flex-none rounded-lg border border-terciario-borde bg-terciario-tinte px-3.5 py-2 text-[12px] font-bold text-terciario-fuerte"
                                >
                                  Cerrada
                                </span>
                              ) : s.publicada ? (
                                <Link
                                  href={`/estudiante/sesion/${s.id}`}
                                  aria-label={`Abrir la sesión ${s.codigo}`}
                                  className={`mt-0.5 flex-none rounded-lg border px-3.5 py-2 text-[12px] font-bold no-underline hover:no-underline ${
                                    esSiguiente
                                      ? "border-primario-fuerte bg-primario-fuerte text-white hover:bg-primario-hover"
                                      : "border-primario text-primario-fuerte hover:bg-primario-tinte"
                                  }`}
                                >
                                  Abrir
                                </Link>
                              ) : (
                                <span
                                  title="El docente aún no ha publicado esta sesión"
                                  className="mt-0.5 flex-none rounded-lg border border-borde px-3.5 py-2 text-[12px] font-bold text-suave"
                                >
                                  No publicada
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
