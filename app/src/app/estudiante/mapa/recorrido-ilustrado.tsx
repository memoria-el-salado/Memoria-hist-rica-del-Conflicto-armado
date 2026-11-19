"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import Link from "next/link";
import { AvatarExplorador } from "@/components/explorador";
import { fondoParaTextoBlanco } from "@/lib/contraste";
import type { Explorador } from "@/lib/exploradores";
import {
  altoVertical,
  estacionDelExplorador,
  estacionVecina,
  estadoDeEstacion,
  LIENZO,
  nombreCorto,
  posicionesDeEstaciones,
  trazoEntre,
  type EstadoEstacion,
  type Orientacion,
  type Punto,
} from "@/lib/recorrido-ilustrado";

export type SesionDelMapa = {
  id: string;
  codigo: string;
  titulo: string;
  objetivo: string | null;
  tipo: string;
  /** Material propio del proyecto, no de la cartilla. */
  especial: boolean;
  publicada: boolean;
  completada: boolean;
  material: number;
  subsecciones: { codigo: string; titulo: string }[];
};

export type EjeDelMapa = {
  id: string;
  numero: number;
  nombre: string;
  descripcion: string;
  objetivoGeneral: string | null;
  esPreambulo: boolean;
  tono: string;
  progreso: number;
  completadas: number;
  bloqueo: string | null;
  material: number;
  sesiones: SesionDelMapa[];
};

type Props = {
  ejes: EjeDelMapa[];
  explorador: Explorador | null;
  siguiente: { ejeId: string; id: string } | null;
  seleccionado: string;
  onSeleccionar: (id: string) => void;
};

const PANEL = "panel-estacion";
const recursos = (n: number) => `${n} ${n === 1 ? "recurso" : "recursos"}`;
const numeroDe = (e: EjeDelMapa) => (e.esPreambulo ? "0" : String(e.numero));

/** Cómo se dice el estado en el panel (en la estación va en mayúsculas). */
const ESTADO_EN_PANEL: Record<EstadoEstacion, string> = {
  CERRADO: "Estación cerrada",
  COMPLETO: "Completa",
  "EN CURSO": "En curso",
  "SIN INICIAR": "Sin iniciar",
};

const ESTILO_ESTADO: Record<EstadoEstacion, { fondo: string; texto: string }> = {
  CERRADO: { fondo: "var(--color-terciario-tinte)", texto: "var(--color-terciario-texto)" },
  COMPLETO: { fondo: "var(--color-secundario-tinte)", texto: "var(--color-secundario-texto)" },
  "EN CURSO": { fondo: "var(--color-primario-tinte)", texto: "var(--color-primario-texto)" },
  "SIN INICIAR": { fondo: "var(--color-hundido)", texto: "var(--color-suave)" },
};

/** Mueve la vista hasta un elemento, sin animación si la persona la desactivó. */
function llevarA(el: HTMLElement | null) {
  if (!el) return;
  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "start" });
}

/**
 * El mapa ilustrado y, al lado (debajo en pantallas angostas), las sesiones de
 * la estación elegida. Las estaciones son pestañas: se tocan, o se recorren con
 * las flechas del teclado.
 */
export function RecorridoIlustrado({ ejes, explorador, siguiente, seleccionado, onSeleccionar }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const primeraVez = useRef(true);
  const actual = Math.max(0, ejes.findIndex((e) => e.id === seleccionado));
  const eje = ejes[actual];
  // En un curso que recorre el mapa en orden: qué hace falta para abrir la próxima estación.
  const proximaCerrada = ejes.find((e) => e.bloqueo) ?? null;

  // Por debajo de 1280 px el panel queda debajo del mapa: al elegir una
  // estación la vista baja hasta sus sesiones, para que se vea que algo pasó.
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (window.matchMedia("(max-width: 1279px)").matches) llevarA(panel.current);
  }, [seleccionado]);

  if (!eje) return null;

  return (
    <section aria-labelledby="titulo-ruta" className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-ruta" className="text-[0.625rem] font-extrabold tracking-[.12em] text-tenue">
          TU RUTA POR LOS MONTES DE MARÍA
        </h2>
        <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-tinta-media">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 11V5a2 2 0 0 1 4 0v6M13 10V8a2 2 0 0 1 4 0v5a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 3 13.5V12a2 2 0 0 1 4 0v1" />
          </svg>
          Toca una estación para ver sus sesiones
        </p>
      </div>

      {/* Lado a lado solo cuando hay ancho para los dos; si no, el panel va debajo del mapa. */}
      <div className="grid items-start gap-[18px] xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* El camino va de lado si el mapa tiene ancho para sus etiquetas, y baja en zigzag si no. */}
        <div className="@container overflow-hidden rounded-[14px] border border-borde bg-realce">
          <Escenario orientacion="horizontal" className="hidden @[580px]:block" {...{ ejes, explorador, siguiente, actual, onSeleccionar }} />
          <Escenario orientacion="vertical" className="mx-auto max-w-[420px] @[580px]:hidden" {...{ ejes, explorador, siguiente, actual, onSeleccionar }} />
          <p className="border-t border-borde bg-superficie px-4 py-2 text-[0.6875rem] text-apagado">
            El camino se llena hasta donde vas; tu explorador marca la estación por donde sigue tu viaje.
          </p>
          {proximaCerrada && (
            <p className="flex items-start gap-1.5 border-t border-terciario-borde bg-terciario-tinte px-4 py-2 text-[0.71875rem] font-semibold text-terciario-texto">
              <svg className="mt-0.5 flex-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <span>
                Estación {numeroDe(proximaCerrada)} con candado: {proximaCerrada.bloqueo}
              </span>
            </p>
          )}
        </div>

        <div ref={panel} className="scroll-mt-24 xl:sticky xl:top-24">
          <PanelEstacion
            eje={eje}
            indice={actual}
            total={ejes.length}
            siguienteId={siguiente?.id ?? null}
            anterior={actual > 0 ? ejes[actual - 1] : null}
            posterior={actual < ejes.length - 1 ? ejes[actual + 1] : null}
            onSeleccionar={onSeleccionar}
          />
        </div>
      </div>
    </section>
  );
}

/** El dibujo del camino con sus estaciones, en una orientación. */
function Escenario({
  orientacion,
  className,
  ejes,
  explorador,
  siguiente,
  actual,
  onSeleccionar,
}: {
  orientacion: Orientacion;
  className: string;
  ejes: EjeDelMapa[];
  explorador: Explorador | null;
  siguiente: { ejeId: string } | null;
  actual: number;
  onSeleccionar: (id: string) => void;
}) {
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const ancho = LIENZO[orientacion].ancho;
  const alto = orientacion === "horizontal" ? LIENZO.horizontal.alto : altoVertical(ejes.length);
  const puntos = posicionesDeEstaciones(ejes.length, orientacion);
  const dondeVa = estacionDelExplorador(ejes, siguiente?.ejeId ?? null);
  const recorrido = puntos.slice(0, dondeVa + 1);
  const pct = (p: Punto) => ({ left: `${(p.x / ancho) * 100}%`, top: `${(p.y / alto) * 100}%` });

  function teclear(evento: KeyboardEvent<HTMLButtonElement>, i: number) {
    const destino = estacionVecina(i, ejes.length, evento.key);
    if (destino === null) return;
    evento.preventDefault();
    onSeleccionar(ejes[destino].id);
    botones.current[destino]?.focus();
  }

  return (
    <div className={className}>
      <div className="relative w-full" style={{ aspectRatio: `${ancho} / ${alto}` }}>
        <Paisaje orientacion={orientacion} ancho={ancho} alto={alto} puntos={puntos} />

        {/* El camino: entero, en tierra; lo recorrido, en el color de la marca. */}
        <svg viewBox={`0 0 ${ancho} ${alto}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d={trazoEntre(puntos, orientacion)} fill="none" stroke="#E6D5BF" strokeWidth="20" strokeLinecap="round" />
          <path d={trazoEntre(puntos, orientacion)} fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="10 12" strokeLinecap="round" />
          {recorrido.length > 1 && (
            <path d={trazoEntre(recorrido, orientacion)} fill="none" stroke="#D95D39" strokeWidth="7" strokeLinecap="round" />
          )}
        </svg>

        <div role="tablist" aria-label="Estaciones del viaje" aria-orientation={orientacion} className="absolute inset-0">
          {ejes.map((e, i) => {
            const estado = estadoDeEstacion(e);
            const elegida = i === actual;
            const cerrada = estado === "CERRADO";
            const aqui = i === dondeVa;
            const publicadas = e.sesiones.filter((s) => s.publicada).length;
            const corto = nombreCorto(e.nombre, orientacion === "horizontal" ? 30 : 26);
            return (
              <button
                key={e.id}
                ref={(el) => {
                  botones.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`estacion-${orientacion}-${e.id}`}
                aria-selected={elegida}
                aria-controls={PANEL}
                tabIndex={elegida ? 0 : -1}
                aria-label={`Estación ${numeroDe(e)}: ${e.nombre}. ${ESTADO_EN_PANEL[estado]}, ${e.completadas} de ${publicadas} sesiones hechas${aqui ? ". Aquí sigue tu viaje" : ""}.${e.bloqueo ? ` ${e.bloqueo}` : ""}`}
                onClick={() => onSeleccionar(e.id)}
                onKeyDown={(ev) => teclear(ev, i)}
                className="group absolute flex w-[118px] -translate-x-1/2 -translate-y-[26px] cursor-pointer flex-col items-center gap-1.5 rounded-xl text-center focus-visible:outline-[3px] focus-visible:outline-offset-2 sm:w-[132px]"
                style={pct(puntos[i])}
              >
                <span
                  aria-hidden="true"
                  className={`relative flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px] border-white text-[1.125rem] font-extrabold text-white shadow-[0_6px_14px_rgba(80,50,30,.22)] transition-transform group-hover:scale-110 ${
                    elegida ? "scale-110 ring-4 ring-primario ring-offset-2 ring-offset-realce" : ""
                  }`}
                  style={{ background: cerrada ? "#6F6760" : fondoParaTextoBlanco(e.tono) }}
                >
                  {cerrada ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                  ) : (
                    numeroDe(e)
                  )}
                  {estado === "COMPLETO" && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-secundario-fuerte">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                  )}
                </span>
                <span aria-hidden="true" className="rounded-md bg-superficie/90 px-1.5 py-0.5 text-[0.6875rem] font-bold leading-tight text-tinta shadow-[0_1px_2px_rgba(0,0,0,.06)]">
                  {corto}
                </span>
                <span
                  aria-hidden="true"
                  className="rounded-full px-2 py-0.5 text-[0.59375rem] font-extrabold tracking-[.08em]"
                  style={{ background: ESTILO_ESTADO[estado].fondo, color: ESTILO_ESTADO[estado].texto }}
                >
                  {estado}
                </span>
              </button>
            );
          })}
        </div>

        {/* El explorador del estudiante, junto a la estación por donde sigue. A
            un costado y no encima: así no tapa el número ni el nombre de ninguna. */}
        {explorador && dondeVa >= 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute" style={{ ...pct(puntos[dondeVa]), transform: "translate(30px, -10px)" }}>
            {/* La animación va dentro: en el mismo elemento pisaría la posición. */}
            <span className="animar-mecer block overflow-hidden rounded-full border-[3px] border-primario bg-white shadow-[0_6px_14px_rgba(80,50,30,.25)]">
              <AvatarExplorador tipo={explorador} tamano={34} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * El paisaje de fondo: colinas de los Montes de María, el río que atraviesa la
 * tierra, parcelas y casas campesinas. Es decorativo.
 */
function Paisaje({ orientacion, ancho, alto, puntos }: { orientacion: Orientacion; ancho: number; alto: number; puntos: Punto[] }) {
  // Posiciones fijas (no aleatorias) para que el dibujo sea igual en el servidor y en el navegador.
  const arboles =
    orientacion === "horizontal"
      ? [[60, 300], [180, 250], [300, 330], [430, 225], [560, 345], [700, 250], [820, 330], [940, 250], [250, 160], [640, 150]]
      : Array.from({ length: Math.max(2, puntos.length) * 2 }, (_, i) => [i % 2 ? ancho - 34 : 34, 70 + i * (alto / (puntos.length * 2 + 1))]);
  const casas = orientacion === "horizontal" ? [[140, 205], [520, 190], [880, 205]] : [[ancho - 60, alto * 0.25], [60, alto * 0.6]];

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`cielo-${orientacion}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FCEBDD" />
          <stop offset="0.45" stopColor="#FBF6EF" />
          <stop offset="1" stopColor="#F3ECDD" />
        </linearGradient>
      </defs>
      <rect width={ancho} height={alto} fill={`url(#cielo-${orientacion})`} />

      {orientacion === "horizontal" ? (
        <>
          <circle cx="890" cy="78" r="40" fill="#F6C76B" opacity=".55" />
          <path d="M0 190 Q120 110 240 165 T480 150 T720 140 T1000 160 V440 H0Z" fill="#E6D8C1" />
          <path d="M0 230 Q160 170 330 215 T640 205 T1000 215 V440 H0Z" fill="#CFD3B6" />
          <path d="M0 290 Q200 250 420 285 T820 275 T1000 290 V440 H0Z" fill="#E9E0CC" />
          {/* El río que hace más fértiles las tierras de su orilla. */}
          <path d="M0 410 Q180 370 360 400 T720 395 T1000 380" fill="none" stroke="#9ED6D2" strokeWidth="16" opacity=".75" />
          {/* Parcelas sembradas. */}
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M${600 + i * 14} 372 l40 -22`} stroke="#AEB894" strokeWidth="4" strokeLinecap="round" />
          ))}
        </>
      ) : (
        <>
          <circle cx={ancho - 60} cy="46" r="26" fill="#F6C76B" opacity=".55" />
          <path d={`M0 0 Q70 ${alto * 0.25} 30 ${alto * 0.5} T50 ${alto} H0Z`} fill="#CFD3B6" opacity=".8" />
          <path d={`M${ancho} 0 Q${ancho - 70} ${alto * 0.3} ${ancho - 25} ${alto * 0.55} T${ancho - 40} ${alto} H${ancho}Z`} fill="#E6D8C1" />
          <path
            d={`M${ancho * 0.5} 0 Q${ancho * 0.15} ${alto * 0.2} ${ancho * 0.5} ${alto * 0.4} T${ancho * 0.5} ${alto * 0.8} T${ancho * 0.45} ${alto}`}
            fill="none"
            stroke="#9ED6D2"
            strokeWidth="12"
            opacity=".5"
          />
        </>
      )}

      {arboles.map(([x, y], i) => (
        <g key={`a${i}`}>
          <rect x={x - 2} y={y} width="4" height="12" fill="#8C6B4F" />
          <circle cx={x} cy={y - 4} r="11" fill={i % 3 === 0 ? "#8FA27A" : "#A3B38C"} />
        </g>
      ))}
      {casas.map(([x, y], i) => (
        <g key={`c${i}`}>
          <rect x={x - 13} y={y - 10} width="26" height="18" fill="#F7EFE3" stroke="#D9C7A7" />
          <path d={`M${x - 17} ${y - 10} L${x} ${y - 24} L${x + 17} ${y - 10}Z`} fill="#D95D39" />
          <rect x={x - 3} y={y - 1} width="6" height="9" fill="#8C6B4F" />
        </g>
      ))}
    </svg>
  );
}

/** Las sesiones de la estación elegida, con lo que el estudiante necesita para seguir. */
function PanelEstacion({
  eje,
  indice,
  total,
  siguienteId,
  anterior,
  posterior,
  onSeleccionar,
}: {
  eje: EjeDelMapa;
  indice: number;
  total: number;
  siguienteId: string | null;
  anterior: EjeDelMapa | null;
  posterior: EjeDelMapa | null;
  onSeleccionar: (id: string) => void;
}) {
  const estado = estadoDeEstacion(eje);
  const publicadas = eje.sesiones.filter((s) => s.publicada).length;

  return (
    <div
      id={PANEL}
      role="tabpanel"
      tabIndex={0}
      aria-label={`Estación ${numeroDe(eje)}: ${eje.nombre}`}
      className="animar-aparecer rounded-[14px] border border-primario-borde bg-superficie p-[18px] shadow-[0_10px_26px_rgba(120,70,45,.10)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="flex h-[30px] min-w-[30px] items-center justify-center rounded-[8px] px-2 text-[0.8125rem] font-extrabold text-white"
          style={{ background: estado === "CERRADO" ? "#6F6760" : fondoParaTextoBlanco(eje.tono) }}
        >
          {numeroDe(eje)}
        </span>
        <span className="text-[0.65625rem] font-bold tracking-[.1em] text-tenue">
          ESTACIÓN {indice + 1} DE {total}
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[0.65625rem] font-bold"
          style={{ background: ESTILO_ESTADO[estado].fondo, color: ESTILO_ESTADO[estado].texto }}
        >
          {ESTADO_EN_PANEL[estado]}
        </span>
      </div>
      <h3 className="mt-2 text-[1.0625rem] font-extrabold leading-snug tracking-[-.01em]">{eje.nombre}</h3>
      {eje.descripcion && eje.descripcion !== eje.nombre && (
        <p className="mt-1 text-[0.78125rem] leading-[1.6] text-apagado">{eje.descripcion}</p>
      )}

      <div className="mt-2.5 flex items-center gap-2.5">
        <span
          role="progressbar"
          aria-label={`Avance en la estación ${numeroDe(eje)}`}
          aria-valuenow={eje.progreso}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 max-w-[220px] flex-1 overflow-hidden rounded-[9px] bg-hundido"
        >
          <span className="block h-full" style={{ width: `${eje.progreso}%`, background: eje.tono }} />
        </span>
        <span className="text-[0.6875rem] font-bold text-tenue">
          {eje.completadas} de {publicadas} hechas · {eje.progreso}%
        </span>
      </div>

      {eje.bloqueo && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-terciario-tinte px-3 py-2 text-[0.75rem] font-semibold text-terciario-texto">
          <svg className="mt-0.5 flex-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {eje.bloqueo}
        </p>
      )}
      {eje.objetivoGeneral && (
        <p className="mt-3 text-[0.78125rem] leading-[1.65] text-apagado">
          <span className="font-bold text-tenue">Objetivo general · </span>
          {eje.objetivoGeneral}
        </p>
      )}
      {eje.material > 0 && (
        <p className="mt-2 text-[0.75rem] font-semibold text-secundario-texto">
          Este eje trae {recursos(eje.material)} de tu docente: los encuentras dentro de cada sesión.
        </p>
      )}

      <ol className="mt-3.5 grid gap-2.5">
        {eje.sesiones.map((s) => {
          const esSiguiente = siguienteId === s.id;
          return (
            <li
              key={s.codigo}
              className={`flex flex-wrap items-start gap-x-3.5 gap-y-2 rounded-[10px] border px-[14px] py-[12px] ${
                esSiguiente ? "border-primario bg-primario-tinte" : "border-borde bg-superficie-suave"
              }`}
            >
              <div className="w-[34px] flex-none pt-0.5 text-[0.75rem] font-extrabold text-primario-texto">{s.codigo}</div>
              <div className="min-w-0 flex-1 basis-[180px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.84375rem] font-bold">{s.titulo}</span>
                  {esSiguiente && <span className="rounded-full bg-primario-fuerte px-2 py-0.5 text-[0.625rem] font-bold text-white">Continúa aquí</span>}
                  {s.publicada && s.completada && (
                    <span className="flex items-center gap-1 rounded-full bg-secundario-tinte px-2 py-0.5 text-[0.625rem] font-bold text-secundario-texto">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Hecha
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-[0.6875rem] tracking-[.04em] text-suave">
                  {s.especial ? (
                    <span className="font-bold text-terciario-texto">Actividad especial: {s.tipo}</span>
                  ) : (
                    <span>Actividad: {s.tipo}</span>
                  )}
                  {s.material > 0 && <span className="font-semibold text-secundario-texto">Material: {recursos(s.material)}</span>}
                </div>
                {s.objetivo && <p className="mt-1.5 text-[0.71875rem] leading-[1.6] text-apagado">{s.objetivo}</p>}
                {s.subsecciones.length > 0 && (
                  <ul className="mt-2 grid gap-1 border-l-2 border-borde pl-3">
                    {s.subsecciones.map((sub) => (
                      <li key={sub.codigo} className="text-[0.71875rem] leading-[1.5] text-apagado">
                        <span className="font-bold text-suave">{sub.codigo}</span> {sub.titulo}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {s.publicada && eje.bloqueo ? (
                <span title={eje.bloqueo} className="flex-none rounded-lg border border-terciario-borde bg-terciario-tinte px-3.5 py-2 text-[0.75rem] font-bold text-terciario-texto">
                  Cerrada
                </span>
              ) : s.publicada ? (
                <Link
                  href={`/estudiante/sesion/${s.id}`}
                  aria-label={`Abrir la sesión ${s.codigo}`}
                  className={`flex min-h-10 flex-none items-center rounded-lg border px-3.5 text-[0.75rem] font-bold no-underline hover:no-underline ${
                    esSiguiente
                      ? "border-primario-fuerte bg-primario-fuerte text-white hover:bg-primario-hover"
                      : "border-primario text-primario-texto hover:bg-primario-tinte"
                  }`}
                >
                  Abrir
                </Link>
              ) : (
                <span title="El docente aún no ha publicado esta sesión" className="flex-none rounded-lg border border-borde px-3.5 py-2 text-[0.75rem] font-bold text-suave">
                  No publicada
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <nav aria-label="Otras estaciones" className="mt-4 flex flex-wrap justify-between gap-2 border-t border-borde pt-3">
        {anterior ? (
          <button type="button" onClick={() => onSeleccionar(anterior.id)} className="min-h-10 cursor-pointer rounded-lg px-2 text-[0.75rem] font-bold text-apagado hover:text-primario-texto">
            ← Estación {numeroDe(anterior)}
          </button>
        ) : (
          <span />
        )}
        {posterior && (
          <button type="button" onClick={() => onSeleccionar(posterior.id)} className="min-h-10 cursor-pointer rounded-lg px-2 text-[0.75rem] font-bold text-primario-texto hover:text-primario-hover">
            Estación {numeroDe(posterior)} →
          </button>
        )}
      </nav>
    </div>
  );
}
